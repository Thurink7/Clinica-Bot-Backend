package com.clinica.bot.repository;

import com.clinica.bot.config.DatabaseMode;
import com.clinica.bot.domain.Profissional;
import com.clinica.bot.repository.firestore.ProfissionalFirestoreRepository;
import com.clinica.bot.repository.mongo.ProfissionalMongoRepository;
import com.clinica.bot.util.CpfUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.*;

@Slf4j
@Repository
@RequiredArgsConstructor
public class ProfessionalRepository {

    private final DatabaseMode databaseMode;
    private final ObjectProvider<ProfissionalMongoRepository> mongoRepoProvider;
    private final ProfissionalFirestoreRepository firestoreRepo;

    private ProfissionalMongoRepository mongo() {
        return mongoRepoProvider.getObject();
    }

    public Profissional create(Map<String, Object> data) {
        Profissional created = primary().create(data);
        mirrorWrite(() -> secondary().createWithId(created.getId(), data));
        return created;
    }

    public Optional<Profissional> getById(String id) { return primary().getById(id); }
    public List<Profissional> listAll() { return primary().listAll(); }
    public List<Profissional> listActive() { return primary().listActive(); }

    public Profissional update(String id, Map<String, Object> partial) {
        Profissional updated = primary().update(id, partial);
        mirrorWrite(() -> secondary().update(id, partial));
        return updated;
    }

    public Map<String, Object> delete(String id) {
        Map<String, Object> result = primary().delete(id);
        mirrorWrite(() -> secondary().delete(id));
        return result;
    }

    private ProfBackend primary() {
        return "mongo".equals(databaseMode.getRead()) ? mongoBackend() : firestoreBackend();
    }

    private ProfBackend secondary() {
        return "dual".equals(databaseMode.getWrite())
                ? ("mongo".equals(databaseMode.getRead()) ? firestoreBackend() : mongoBackend())
                : noop();
    }

    private void mirrorWrite(Runnable action) {
        if (!"dual".equals(databaseMode.getWrite())) return;
        try { action.run(); } catch (Exception e) { log.warn("dual_write_secondary_failed: {}", e.getMessage()); }
    }

    private ProfBackend mongoBackend() { return new MongoBackend(); }
    private ProfBackend firestoreBackend() { return new FirestoreBackend(); }
    private ProfBackend noop() { return new ProfBackend() {}; }

    private interface ProfBackend {
        default Profissional create(Map<String, Object> data) { throw new UnsupportedOperationException(); }
        default Profissional createWithId(String id, Map<String, Object> data) { throw new UnsupportedOperationException(); }
        default Optional<Profissional> getById(String id) { throw new UnsupportedOperationException(); }
        default List<Profissional> listAll() { throw new UnsupportedOperationException(); }
        default List<Profissional> listActive() { throw new UnsupportedOperationException(); }
        default Profissional update(String id, Map<String, Object> partial) { throw new UnsupportedOperationException(); }
        default Map<String, Object> delete(String id) { throw new UnsupportedOperationException(); }
    }

    private class MongoBackend implements ProfBackend {
        @Override
        public Profissional create(Map<String, Object> data) {
            String id = CpfUtils.generateLegacyId();
            return createWithId(id, data);
        }

        @Override
        public Profissional createWithId(String id, Map<String, Object> data) {
            Profissional p = map(data);
            p.setId(id);
            p.setLegacyId(id);
            p.setCreatedAt(Instant.now());
            return mongo().save(p);
        }

        @Override
        public Optional<Profissional> getById(String id) {
            return mongo().findById(id);
        }

        @Override
        public List<Profissional> listAll() { return mongo().findAll(); }

        @Override
        public List<Profissional> listActive() { return mongo().findByAtivoTrue(); }

        @Override
        public Profissional update(String id, Map<String, Object> partial) {
            Profissional p = getById(id).orElseThrow();
            if (partial.containsKey("ativo")) p.setAtivo((Boolean) partial.get("ativo"));
            return mongo().save(p);
        }

        @Override
        public Map<String, Object> delete(String id) {
            mongo().deleteById(id);
            return Map.of("id", id, "deleted", true);
        }

        @SuppressWarnings("unchecked")
        private Profissional map(Map<String, Object> data) {
            Profissional p = new Profissional();
            p.setNome(String.valueOf(data.get("nome")));
            p.setEspecialidade(String.valueOf(data.get("especialidade")));
            p.setTelefone(CpfUtils.digitsOnly(String.valueOf(data.get("telefone"))));
            p.setEmail(String.valueOf(data.get("email")).toLowerCase());
            p.setServicos((List<String>) data.get("servicos"));
            p.setAtivo(data.get("ativo") instanceof Boolean b ? b : true);
            p.setDiasTrabalho((List<Integer>) data.get("diasTrabalho"));
            return p;
        }
    }

    private class FirestoreBackend implements ProfBackend {
        @Override public Profissional create(Map<String, Object> data) { return firestoreRepo.create(data); }
        @Override public Profissional createWithId(String id, Map<String, Object> data) { return firestoreRepo.createWithId(id, data); }
        @Override public Optional<Profissional> getById(String id) { return firestoreRepo.getById(id); }
        @Override public List<Profissional> listAll() { return firestoreRepo.listAll(); }
        @Override public List<Profissional> listActive() { return firestoreRepo.listActive(); }
        @Override public Profissional update(String id, Map<String, Object> partial) { return firestoreRepo.update(id, partial); }
        @Override public Map<String, Object> delete(String id) { return firestoreRepo.delete(id); }
    }
}
