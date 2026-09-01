package com.clinica.bot.repository.firestore;

import com.clinica.bot.domain.Parceiro;
import com.google.cloud.firestore.DocumentReference;
import com.google.cloud.firestore.Firestore;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.*;
import java.util.concurrent.ExecutionException;
import java.util.stream.Collectors;

@Repository
@RequiredArgsConstructor
public class ParceiroFirestoreRepository {

    private final Optional<Firestore> firestore;

    private Firestore db() {
        return firestore.orElseThrow(() -> new IllegalStateException("Firestore não inicializado"));
    }

    public Parceiro create(Map<String, Object> data) {
        try {
            Map<String, Object> payload = new HashMap<>(data);
            payload.put("lat", toDouble(data.get("lat")));
            payload.put("lng", toDouble(data.get("lng")));
            payload.put("createdAt", Instant.now().toString());
            DocumentReference ref = db().collection("parceiros").document();
            ref.set(payload).get();
            return toParceiro(ref.getId(), payload);
        } catch (InterruptedException | ExecutionException e) {
            Thread.currentThread().interrupt();
            throw new RuntimeException(e);
        }
    }

    public List<Parceiro> listAll() {
        try {
            return db().collection("parceiros").get().get().getDocuments().stream()
                    .map(d -> toParceiro(d.getId(), d.getData()))
                    .collect(Collectors.toList());
        } catch (InterruptedException | ExecutionException e) {
            Thread.currentThread().interrupt();
            throw new RuntimeException(e);
        }
    }

    public Optional<Parceiro> getById(String id) {
        try {
            var doc = db().collection("parceiros").document(id).get().get();
            if (!doc.exists()) return Optional.empty();
            return Optional.of(toParceiro(doc.getId(), doc.getData()));
        } catch (InterruptedException | ExecutionException e) {
            Thread.currentThread().interrupt();
            throw new RuntimeException(e);
        }
    }

    public List<Map<String, Object>> listNear(double lat, double lng, double maxDistanceKm) {
        return listAll().stream()
                .map(p -> {
                    double dist = haversine(lat, lng, p.getLat() != null ? p.getLat() : 0, p.getLng() != null ? p.getLng() : 0);
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("id", p.getId());
                    m.put("lat", p.getLat());
                    m.put("lng", p.getLng());
                    m.put("createdAt", p.getCreatedAt());
                    if (p.getExtra() != null) m.putAll(p.getExtra());
                    m.put("distanceKm", dist);
                    return m;
                })
                .filter(m -> ((Number) m.get("distanceKm")).doubleValue() <= maxDistanceKm)
                .sorted(Comparator.comparingDouble(m -> ((Number) m.get("distanceKm")).doubleValue()))
                .collect(Collectors.toList());
    }

    private Parceiro toParceiro(String id, Map<String, Object> data) {
        Map<String, Object> extra = new HashMap<>(data != null ? data : Map.of());
        extra.remove("lat");
        extra.remove("lng");
        extra.remove("createdAt");
        return Parceiro.builder()
                .id(id)
                .lat(toDouble(data != null ? data.get("lat") : 0))
                .lng(toDouble(data != null ? data.get("lng") : 0))
                .createdAt(Instant.now())
                .extra(extra)
                .build();
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
