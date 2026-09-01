package com.clinica.bot.repository;

import com.clinica.bot.config.DatabaseMode;
import com.clinica.bot.domain.WhatsappSession;
import com.clinica.bot.repository.firestore.WhatsappSessionFirestoreRepository;
import com.clinica.bot.repository.mongo.WhatsappSessionMongoRepository;
import com.clinica.bot.util.CpfUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

@Slf4j
@Repository
@RequiredArgsConstructor
public class SessionRepository {

    private final DatabaseMode databaseMode;
    private final ObjectProvider<WhatsappSessionMongoRepository> mongoRepoProvider;
    private final WhatsappSessionFirestoreRepository firestoreRepo;

    private WhatsappSessionMongoRepository mongo() {
        return mongoRepoProvider.getObject();
    }

    public Optional<Map<String, Object>> get(String telefone) {
        return primary().get(CpfUtils.normalizePhone(telefone));
    }

    public void set(String telefone, Map<String, Object> data) {
        String tel = CpfUtils.normalizePhone(telefone);
        primary().set(tel, data);
        mirrorWrite(() -> secondary().set(tel, data));
    }

    public void clear(String telefone) {
        String tel = CpfUtils.normalizePhone(telefone);
        primary().clear(tel);
        mirrorWrite(() -> secondary().clear(tel));
    }

    private SessionBackend primary() {
        return "mongo".equals(databaseMode.getRead()) ? mongoBackend() : firestoreBackend();
    }

    private SessionBackend secondary() {
        return "dual".equals(databaseMode.getWrite())
                ? ("mongo".equals(databaseMode.getRead()) ? firestoreBackend() : mongoBackend())
                : noop();
    }

    private void mirrorWrite(Runnable action) {
        if (!"dual".equals(databaseMode.getWrite())) return;
        try { action.run(); } catch (Exception e) { log.warn("dual_write_secondary_failed: {}", e.getMessage()); }
    }

    private SessionBackend mongoBackend() { return new MongoBackend(); }
    private SessionBackend firestoreBackend() { return new FirestoreBackend(); }
    private SessionBackend noop() { return new SessionBackend() {}; }

    private interface SessionBackend {
        default Optional<Map<String, Object>> get(String telefone) { throw new UnsupportedOperationException(); }
        default void set(String telefone, Map<String, Object> data) { throw new UnsupportedOperationException(); }
        default void clear(String telefone) { throw new UnsupportedOperationException(); }
    }

    private class MongoBackend implements SessionBackend {
        @Override
        public Optional<Map<String, Object>> get(String telefone) {
            return mongo().findById(telefone).map(this::toMap);
        }

        @Override
        public void set(String telefone, Map<String, Object> data) {
            WhatsappSession s = mongo().findById(telefone).orElse(new WhatsappSession());
            s.setId(telefone);
            s.setTelefone(telefone);
            s.setStep(str(data.get("step")));
            s.setNomePaciente(str(data.get("nomePaciente")));
            s.setServicoEscolhido(str(data.get("servicoEscolhido")));
            s.setDataEscolhida(str(data.get("dataEscolhida")));
            s.setCpfVerificacao(str(data.get("cpfVerificacao")));
            s.setNascimentoVerificacao(str(data.get("nascimentoVerificacao")));
            s.setServicosOfertados(data.get("servicosOfertados"));
            s.setDiasOfertados(data.get("diasOfertados"));
            s.setProfissionaisOfertados(data.get("profissionaisOfertados"));
            s.setSlotsOfertados(data.get("slotsOfertados"));
            s.setProfissionalEscolhido(data.get("profissionalEscolhido"));
            s.setConsultasReagendar(data.get("consultasReagendar"));
            s.setUpdatedAt(Instant.now());
            mongo().save(s);
        }

        @Override
        public void clear(String telefone) {
            mongo().deleteById(telefone);
        }

        private Map<String, Object> toMap(WhatsappSession s) {
            Map<String, Object> m = new HashMap<>();
            m.put("step", s.getStep());
            m.put("nomePaciente", s.getNomePaciente());
            m.put("servicosOfertados", s.getServicosOfertados());
            m.put("servicoEscolhido", s.getServicoEscolhido());
            m.put("diasOfertados", s.getDiasOfertados());
            m.put("dataEscolhida", s.getDataEscolhida());
            m.put("profissionaisOfertados", s.getProfissionaisOfertados());
            m.put("slotsOfertados", s.getSlotsOfertados());
            m.put("profissionalEscolhido", s.getProfissionalEscolhido());
            m.put("cpfVerificacao", s.getCpfVerificacao());
            m.put("nascimentoVerificacao", s.getNascimentoVerificacao());
            m.put("consultasReagendar", s.getConsultasReagendar());
            return m;
        }

        private static String str(Object o) { return o == null ? null : String.valueOf(o); }
    }

    private class FirestoreBackend implements SessionBackend {
        @Override public Optional<Map<String, Object>> get(String telefone) { return firestoreRepo.get(telefone); }
        @Override public void set(String telefone, Map<String, Object> data) { firestoreRepo.set(telefone, data); }
        @Override public void clear(String telefone) { firestoreRepo.clear(telefone); }
    }
}
