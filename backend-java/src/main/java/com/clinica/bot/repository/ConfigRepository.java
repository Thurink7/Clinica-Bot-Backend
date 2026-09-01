package com.clinica.bot.repository;

import com.clinica.bot.config.DatabaseMode;
import com.clinica.bot.domain.ClinicConfig;
import com.clinica.bot.repository.firestore.ClinicConfigFirestoreRepository;
import com.clinica.bot.repository.mongo.ClinicConfigMongoRepository;
import com.clinica.bot.util.SlotsUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.stereotype.Repository;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Slf4j
@Repository
@RequiredArgsConstructor
public class ConfigRepository {

    private final DatabaseMode databaseMode;
    private final ObjectProvider<ClinicConfigMongoRepository> mongoRepoProvider;
    private final ClinicConfigFirestoreRepository firestoreRepo;

    private ClinicConfigMongoRepository mongo() {
        return mongoRepoProvider.getObject();
    }

    public ClinicConfig get(String parceiroId) {
        String id = parceiroId != null ? parceiroId : "default";
        return primary().get(id).orElseGet(() -> {
            ClinicConfig def = SlotsUtils.defaultClinicConfig();
            def.setId(id);
            return def;
        });
    }

    public ClinicConfig update(Map<String, Object> partial, String parceiroId) {
        String id = parceiroId != null ? parceiroId : "default";
        ClinicConfig updated = primary().update(id, partial);
        mirrorWrite(() -> secondary().update(id, partial));
        return updated;
    }

    private ConfigBackend primary() {
        return "mongo".equals(databaseMode.getRead()) ? mongoBackend() : firestoreBackend();
    }

    private ConfigBackend secondary() {
        return "dual".equals(databaseMode.getWrite())
                ? ("mongo".equals(databaseMode.getRead()) ? firestoreBackend() : mongoBackend())
                : noop();
    }

    private void mirrorWrite(Runnable action) {
        if (!"dual".equals(databaseMode.getWrite())) return;
        try { action.run(); } catch (Exception e) { log.warn("dual_write_secondary_failed: {}", e.getMessage()); }
    }

    private ConfigBackend mongoBackend() { return new MongoBackend(); }
    private ConfigBackend firestoreBackend() { return new FirestoreBackend(); }
    private ConfigBackend noop() { return new ConfigBackend() {}; }

    private interface ConfigBackend {
        default Optional<ClinicConfig> get(String id) { throw new UnsupportedOperationException(); }
        default ClinicConfig update(String id, Map<String, Object> partial) { throw new UnsupportedOperationException(); }
    }

    private class MongoBackend implements ConfigBackend {
        @Override
        public Optional<ClinicConfig> get(String id) {
            return mongo().findById(id);
        }

        @Override
        @SuppressWarnings("unchecked")
        public ClinicConfig update(String id, Map<String, Object> partial) {
            ClinicConfig cfg = mongo().findById(id).orElse(SlotsUtils.defaultClinicConfig());
            cfg.setId(id);
            if (partial.containsKey("open")) cfg.setOpen(String.valueOf(partial.get("open")));
            if (partial.containsKey("close")) cfg.setClose(String.valueOf(partial.get("close")));
            if (partial.containsKey("duracaoMinutos")) cfg.setDuracaoMinutos(((Number) partial.get("duracaoMinutos")).intValue());
            if (partial.containsKey("diasUteis")) cfg.setDiasUteis((List<Integer>) partial.get("diasUteis"));
            return mongo().save(cfg);
        }
    }

    private class FirestoreBackend implements ConfigBackend {
        @Override public Optional<ClinicConfig> get(String id) { return firestoreRepo.get(id); }
        @Override public ClinicConfig update(String id, Map<String, Object> partial) { return firestoreRepo.update(id, partial); }
    }
}
