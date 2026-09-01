package com.clinica.bot.repository;

import com.clinica.bot.config.DatabaseMode;
import com.clinica.bot.domain.Paciente;
import com.clinica.bot.exception.ApiException;
import com.clinica.bot.repository.firestore.PacienteFirestoreRepository;
import com.clinica.bot.repository.mongo.PacienteMongoRepository;
import com.clinica.bot.util.CpfUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Slf4j
@Repository
@RequiredArgsConstructor
public class PacienteRepository {

    private final DatabaseMode databaseMode;
    private final ObjectProvider<PacienteMongoRepository> mongoRepoProvider;
    private final PacienteFirestoreRepository firestoreRepo;

    private PacienteMongoRepository mongo() {
        return mongoRepoProvider.getObject();
    }

    public Paciente upsert(Map<String, Object> data) {
        Paciente result = primary().upsert(data);
        mirrorWrite(() -> secondary().upsert(data));
        return result;
    }

    public Optional<Paciente> getByCpf(String cpf) {
        return primary().getByCpf(cpf);
    }

    public Optional<Paciente> getByTelefone(String telefone) {
        return primary().getByTelefone(telefone);
    }

    public List<Paciente> listAll() {
        return primary().listAll();
    }

    public Paciente updateObservacoes(String pacienteId, String observacoes) {
        Paciente result = primary().updateObservacoes(pacienteId, observacoes);
        mirrorWrite(() -> secondary().updateObservacoes(pacienteId, observacoes));
        return result;
    }

    public Map<String, Object> delete(String id) {
        Map<String, Object> result = primary().delete(id);
        mirrorWrite(() -> secondary().delete(id));
        return result;
    }

    private PacienteBackend primary() {
        return "mongo".equals(databaseMode.getRead()) ? mongoBackend() : firestoreBackend();
    }

    private PacienteBackend secondary() {
        return "dual".equals(databaseMode.getWrite())
                ? ("mongo".equals(databaseMode.getRead()) ? firestoreBackend() : mongoBackend())
                : noop();
    }

    private void mirrorWrite(Runnable action) {
        if (!"dual".equals(databaseMode.getWrite())) return;
        try { action.run(); } catch (Exception e) { log.warn("dual_write_secondary_failed: {}", e.getMessage()); }
    }

    private PacienteBackend mongoBackend() { return new MongoBackend(); }
    private PacienteBackend firestoreBackend() { return new FirestoreBackend(); }
    private PacienteBackend noop() { return new PacienteBackend() {}; }

    private interface PacienteBackend {
        default Paciente upsert(Map<String, Object> data) { throw new UnsupportedOperationException(); }
        default Optional<Paciente> getByCpf(String cpf) { throw new UnsupportedOperationException(); }
        default Optional<Paciente> getByTelefone(String telefone) { throw new UnsupportedOperationException(); }
        default List<Paciente> listAll() { throw new UnsupportedOperationException(); }
        default Paciente updateObservacoes(String id, String obs) { throw new UnsupportedOperationException(); }
        default Map<String, Object> delete(String id) { throw new UnsupportedOperationException(); }
    }

    private class MongoBackend implements PacienteBackend {
        @Override
        public Paciente upsert(Map<String, Object> data) {
            var v = CpfUtils.validateCpf(String.valueOf(data.get("cpf")));
            if (!v.ok()) throw new ApiException(v.message(), 400);
            String tel = CpfUtils.digitsOnly(String.valueOf(data.get("telefone")));
            String nome = String.valueOf(data.get("nome")).trim();
            if (tel.isBlank() || nome.isBlank()) throw new ApiException("Nome e telefone são obrigatórios", 400);
            Paciente p = mongo().findById(v.digits()).orElse(new Paciente());
            p.setId(v.digits());
            p.setLegacyId(v.digits());
            p.setCpf(v.digits());
            p.setTelefone(tel);
            p.setNome(nome);
            p.setDataNascimento(data.get("dataNascimento") != null ? String.valueOf(data.get("dataNascimento")) : null);
            p.setUpdatedAt(Instant.now());
            return mongo().save(p);
        }

        @Override
        public Optional<Paciente> getByCpf(String cpf) {
            var v = CpfUtils.validateCpf(cpf);
            if (!v.ok()) return Optional.empty();
            return mongo().findById(v.digits());
        }

        @Override
        public Optional<Paciente> getByTelefone(String telefone) {
            return mongo().findByTelefone(CpfUtils.digitsOnly(telefone));
        }

        @Override
        public List<Paciente> listAll() { return mongo().findAll(); }

        @Override
        public Paciente updateObservacoes(String pacienteId, String observacoes) {
            var v = CpfUtils.validateCpf(pacienteId);
            String id = v.ok() ? v.digits() : CpfUtils.digitsOnly(pacienteId);
            if (id.length() != 11) throw new ApiException("CPF do paciente inválido", 400);
            Paciente p = mongo().findById(id).orElse(new Paciente());
            p.setId(id);
            p.setCpf(id);
            p.setLegacyId(id);
            p.setObservacoes(String.valueOf(observacoes));
            p.setUpdatedAt(Instant.now());
            return mongo().save(p);
        }

        @Override
        public Map<String, Object> delete(String id) {
            mongo().deleteById(id);
            return Map.of("id", id, "deleted", true);
        }
    }

    private class FirestoreBackend implements PacienteBackend {
        @Override public Paciente upsert(Map<String, Object> data) { return firestoreRepo.upsert(data); }
        @Override public Optional<Paciente> getByCpf(String cpf) { return firestoreRepo.getByCpf(cpf); }
        @Override public Optional<Paciente> getByTelefone(String telefone) { return firestoreRepo.getByTelefone(telefone); }
        @Override public List<Paciente> listAll() { return firestoreRepo.listAll(); }
        @Override public Paciente updateObservacoes(String id, String obs) { return firestoreRepo.updateObservacoes(id, obs); }
        @Override public Map<String, Object> delete(String id) { return firestoreRepo.delete(id); }
    }
}
