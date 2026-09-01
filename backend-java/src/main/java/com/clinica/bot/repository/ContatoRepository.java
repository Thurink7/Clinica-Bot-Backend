package com.clinica.bot.repository;

import com.clinica.bot.config.DatabaseMode;
import com.clinica.bot.domain.Contato;
import com.clinica.bot.repository.firestore.ContatoFirestoreRepository;
import com.clinica.bot.repository.mongo.ContatoMongoRepository;
import com.clinica.bot.util.CpfUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.Map;

@Slf4j
@Repository
@RequiredArgsConstructor
public class ContatoRepository {

    private final DatabaseMode databaseMode;
    private final ObjectProvider<ContatoMongoRepository> mongoRepoProvider;
    private final ContatoFirestoreRepository firestoreRepo;

    private ContatoMongoRepository mongo() {
        return mongoRepoProvider.getObject();
    }

    public Contato create(Map<String, Object> data) {
        Contato created = primary().create(data);
        mirrorWrite(() -> secondary().createWithId(created.getId(), data));
        return created;
    }

    private ContatoBackend primary() {
        return "mongo".equals(databaseMode.getRead()) ? mongoBackend() : firestoreBackend();
    }

    private ContatoBackend secondary() {
        return "dual".equals(databaseMode.getWrite())
                ? ("mongo".equals(databaseMode.getRead()) ? firestoreBackend() : mongoBackend())
                : noop();
    }

    private void mirrorWrite(Runnable action) {
        if (!"dual".equals(databaseMode.getWrite())) return;
        try { action.run(); } catch (Exception e) { log.warn("dual_write_secondary_failed: {}", e.getMessage()); }
    }

    private ContatoBackend mongoBackend() { return new MongoBackend(); }
    private ContatoBackend firestoreBackend() { return new FirestoreBackend(); }
    private ContatoBackend noop() { return new ContatoBackend() {}; }

    private interface ContatoBackend {
        default Contato create(Map<String, Object> data) { throw new UnsupportedOperationException(); }
        default Contato createWithId(String id, Map<String, Object> data) { throw new UnsupportedOperationException(); }
    }

    private class MongoBackend implements ContatoBackend {
        @Override
        public Contato create(Map<String, Object> data) {
            String id = CpfUtils.generateLegacyId();
            return createWithId(id, data);
        }

        @Override
        public Contato createWithId(String id, Map<String, Object> data) {
            Contato c = new Contato();
            c.setId(id);
            c.setLegacyId(id);
            c.setNomeClinica(String.valueOf(data.get("nomeClinica")));
            c.setNomeContato(String.valueOf(data.get("nomeContato")));
            c.setEmail(String.valueOf(data.get("email")));
            c.setTelefone(CpfUtils.digitsOnly(String.valueOf(data.get("telefone"))));
            c.setCidade(data.get("cidade") != null ? String.valueOf(data.get("cidade")) : null);
            c.setMensagem(data.get("mensagem") != null ? String.valueOf(data.get("mensagem")) : null);
            c.setStatus("novo");
            c.setCreatedAt(Instant.now());
            return mongo().save(c);
        }
    }

    private class FirestoreBackend implements ContatoBackend {
        @Override public Contato create(Map<String, Object> data) { return firestoreRepo.create(data); }
        @Override public Contato createWithId(String id, Map<String, Object> data) { return firestoreRepo.createWithId(id, data); }
    }
}
