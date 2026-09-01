package com.clinica.bot.repository.firestore;

import com.clinica.bot.domain.ClinicConfig;
import com.clinica.bot.util.SlotsUtils;
import com.google.cloud.firestore.Firestore;
import com.google.cloud.firestore.SetOptions;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;

import java.util.*;
import java.util.concurrent.ExecutionException;

@Repository
@RequiredArgsConstructor
public class ClinicConfigFirestoreRepository {

    private final Optional<Firestore> firestore;

    private Firestore db() {
        return firestore.orElseThrow(() -> new IllegalStateException("Firestore não inicializado"));
    }

    public Optional<ClinicConfig> get(String id) {
        try {
            var doc = db().collection("configuracoes").document(id).get().get();
            if (!doc.exists()) return Optional.empty();
            return Optional.of(toConfig(id, doc.getData()));
        } catch (InterruptedException | ExecutionException e) {
            Thread.currentThread().interrupt();
            throw new RuntimeException(e);
        }
    }

    public ClinicConfig update(String id, Map<String, Object> partial) {
        try {
            db().collection("configuracoes").document(id).set(partial, SetOptions.merge()).get();
            return get(id).orElseGet(() -> {
                ClinicConfig def = SlotsUtils.defaultClinicConfig();
                def.setId(id);
                return def;
            });
        } catch (InterruptedException | ExecutionException e) {
            Thread.currentThread().interrupt();
            throw new RuntimeException(e);
        }
    }

    @SuppressWarnings("unchecked")
    private ClinicConfig toConfig(String id, Map<String, Object> data) {
        ClinicConfig cfg = new ClinicConfig();
        cfg.setId(id);
        if (data == null) return cfg;
        cfg.setOpen(str(data.get("open")));
        cfg.setClose(str(data.get("close")));
        if (data.get("duracaoMinutos") instanceof Number n) cfg.setDuracaoMinutos(n.intValue());
        cfg.setDiasUteis((List<Integer>) data.get("diasUteis"));
        return cfg;
    }

    private static String str(Object o) { return o == null ? null : String.valueOf(o); }
}
