package com.clinica.bot.repository;

import com.clinica.bot.config.DatabaseMode;
import com.clinica.bot.domain.Parceiro;
import com.clinica.bot.repository.firestore.ParceiroFirestoreRepository;
import com.clinica.bot.repository.mongo.ParceiroMongoRepository;
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
public class ParceiroRepository {

    private final DatabaseMode databaseMode;
    private final ObjectProvider<ParceiroMongoRepository> mongoRepoProvider;
    private final ParceiroFirestoreRepository firestoreRepo;

    private ParceiroMongoRepository mongo() {
        return mongoRepoProvider.getObject();
    }

    public Parceiro create(Map<String, Object> data) {
        Parceiro created = primary().create(data);
        mirrorWrite(() -> secondary().createWithId(created.getId(), data));
        return created;
    }

    public List<Parceiro> listAll() {
        return primary().listAll();
    }

    public Optional<Parceiro> getById(String id) {
        return primary().getById(id);
    }

    public List<Map<String, Object>> listNear(double lat, double lng, double maxDistanceKm) {
        return primary().listNear(lat, lng, maxDistanceKm);
    }

    public Map<String, Object> toApi(Parceiro p) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", p.getId());
        m.put("lat", p.getLat());
        m.put("lng", p.getLng());
        m.put("createdAt", p.getCreatedAt());
        if (p.getExtra() != null) {
            m.putAll(p.getExtra());
        }
        return m;
    }

    private ParceiroBackend primary() {
        return "mongo".equals(databaseMode.getRead()) ? mongoBackend() : firestoreBackend();
    }

    private ParceiroBackend secondary() {
        return "dual".equals(databaseMode.getWrite())
                ? ("mongo".equals(databaseMode.getRead()) ? firestoreBackend() : mongoBackend())
                : noop();
    }

    private void mirrorWrite(Runnable action) {
        if (!"dual".equals(databaseMode.getWrite())) return;
        try { action.run(); } catch (Exception e) { log.warn("dual_write_secondary_failed: {}", e.getMessage()); }
    }

    private ParceiroBackend mongoBackend() { return new MongoBackend(); }
    private ParceiroBackend firestoreBackend() { return new FirestoreBackend(); }
    private ParceiroBackend noop() { return new ParceiroBackend() {}; }

    private interface ParceiroBackend {
        default Parceiro create(Map<String, Object> data) { throw new UnsupportedOperationException(); }
        default Parceiro createWithId(String id, Map<String, Object> data) { throw new UnsupportedOperationException(); }
        default List<Parceiro> listAll() { throw new UnsupportedOperationException(); }
        default Optional<Parceiro> getById(String id) { throw new UnsupportedOperationException(); }
        default List<Map<String, Object>> listNear(double lat, double lng, double maxKm) { throw new UnsupportedOperationException(); }
    }

    private class MongoBackend implements ParceiroBackend {
        @Override
        public Parceiro create(Map<String, Object> data) {
            return createWithId(CpfUtils.generateLegacyId(), data);
        }

        @Override
        public Parceiro createWithId(String id, Map<String, Object> data) {
            Map<String, Object> extra = new HashMap<>(data);
            extra.remove("lat");
            extra.remove("lng");
            extra.remove("id");
            extra.remove("createdAt");
            extra.remove("extra");
            Parceiro p = Parceiro.builder()
                    .id(id)
                    .lat(toDouble(data.get("lat")))
                    .lng(toDouble(data.get("lng")))
                    .createdAt(Instant.now())
                    .extra(extra)
                    .build();
            return mongo().save(p);
        }

        @Override
        public List<Parceiro> listAll() {
            return mongo().findAll();
        }

        @Override
        public Optional<Parceiro> getById(String id) {
            return mongo().findById(id);
        }

        @Override
        public List<Map<String, Object>> listNear(double lat, double lng, double maxKm) {
            return listAll().stream()
                    .map(p -> {
                        Map<String, Object> m = toApi(p);
                        m.put("distanceKm", haversine(lat, lng,
                                p.getLat() != null ? p.getLat() : 0,
                                p.getLng() != null ? p.getLng() : 0));
                        return m;
                    })
                    .filter(m -> ((Number) m.get("distanceKm")).doubleValue() <= maxKm)
                    .sorted(Comparator.comparingDouble(m -> ((Number) m.get("distanceKm")).doubleValue()))
                    .toList();
        }
    }

    private class FirestoreBackend implements ParceiroBackend {
        @Override public Parceiro create(Map<String, Object> data) { return firestoreRepo.create(data); }
        @Override public Parceiro createWithId(String id, Map<String, Object> data) { return firestoreRepo.create(data); }
        @Override public List<Parceiro> listAll() { return firestoreRepo.listAll(); }
        @Override public Optional<Parceiro> getById(String id) { return firestoreRepo.getById(id); }
        @Override public List<Map<String, Object>> listNear(double lat, double lng, double maxKm) {
            return firestoreRepo.listNear(lat, lng, maxKm);
        }
    }

    private static double toDouble(Object o) {
        if (o instanceof Number n) return n.doubleValue();
        try { return Double.parseDouble(String.valueOf(o)); } catch (Exception e) { return 0; }
    }

    private static double haversine(double lat1, double lon1, double lat2, double lon2) {
        double R = 6371;
        double dLat = Math.toRadians(lat2 - lat1);
        double dLon = Math.toRadians(lon2 - lon1);
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
                + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
                * Math.sin(dLon / 2) * Math.sin(dLon / 2);
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }
}
