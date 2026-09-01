package com.clinica.bot.repository;

import com.clinica.bot.config.DatabaseMode;
import com.clinica.bot.domain.Prontuario;
import com.clinica.bot.repository.firestore.ProntuarioFirestoreRepository;
import com.clinica.bot.repository.mongo.ProntuarioMongoRepository;
import com.clinica.bot.util.CpfUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@Slf4j
@Repository
@RequiredArgsConstructor
public class ProntuarioRepository {

    private final DatabaseMode databaseMode;
    private final ObjectProvider<ProntuarioMongoRepository> mongoRepoProvider;
    private final ProntuarioFirestoreRepository firestoreRepo;

    private ProntuarioMongoRepository mongo() {
        return mongoRepoProvider.getObject();
    }

    public Prontuario create(Map<String, Object> data) {
        Prontuario created = primary().create(data);
        mirrorWrite(() -> secondary().create(data));
        return created;
    }

    public List<Prontuario> listByClienteCpf(String cpf) {
        return primary().listByClienteCpf(cpf);
    }

    private ProntuarioBackend primary() {
        return "mongo".equals(databaseMode.getRead()) ? mongoBackend() : firestoreBackend();
    }

    private ProntuarioBackend secondary() {
        return "dual".equals(databaseMode.getWrite())
                ? ("mongo".equals(databaseMode.getRead()) ? firestoreBackend() : mongoBackend())
                : noop();
    }

    private void mirrorWrite(Runnable action) {
        if (!"dual".equals(databaseMode.getWrite())) return;
        try { action.run(); } catch (Exception e) { log.warn("dual_write_secondary_failed: {}", e.getMessage()); }
    }

    private ProntuarioBackend mongoBackend() { return new MongoBackend(); }
    private ProntuarioBackend firestoreBackend() { return new FirestoreBackend(); }
    private ProntuarioBackend noop() { return new ProntuarioBackend() {}; }

    private interface ProntuarioBackend {
        default Prontuario create(Map<String, Object> data) { throw new UnsupportedOperationException(); }
        default List<Prontuario> listByClienteCpf(String cpf) { throw new UnsupportedOperationException(); }
    }

    @SuppressWarnings("unchecked")
    private class MongoBackend implements ProntuarioBackend {
        @Override
        public Prontuario create(Map<String, Object> data) {
            String id = CpfUtils.generateLegacyId();
            Prontuario p = Prontuario.builder()
                    .id(id)
                    .clienteCpf(CpfUtils.digitsOnly(String.valueOf(data.get("clienteCpf"))))
                    .parceiroId(String.valueOf(data.getOrDefault("parceiroId", "default")))
                    .profissionalId(data.get("profissionalId") != null ? String.valueOf(data.get("profissionalId")) : null)
                    .diagnostico(String.valueOf(data.getOrDefault("diagnostico", "")))
                    .prescricao(String.valueOf(data.getOrDefault("prescricao", "")))
                    .resultados(data.get("resultados") instanceof List<?> l ? (List<Object>) l : List.of())
                    .dataProntuario(LocalDate.now().toString())
                    .createdAt(Instant.now())
                    .build();
            return mongo().save(p);
        }

        @Override
        public List<Prontuario> listByClienteCpf(String cpf) {
            return mongo().findByClienteCpf(CpfUtils.digitsOnly(cpf));
        }
    }

    private class FirestoreBackend implements ProntuarioBackend {
        @Override public Prontuario create(Map<String, Object> data) { return firestoreRepo.create(data); }
        @Override public List<Prontuario> listByClienteCpf(String cpf) { return firestoreRepo.listByClienteCpf(cpf); }
    }
}
