package com.clinica.bot.repository.firestore;

import com.google.cloud.firestore.Firestore;
import com.google.cloud.firestore.SetOptions;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ExecutionException;

@Repository
@RequiredArgsConstructor
public class WhatsappSessionFirestoreRepository {

    private final Optional<Firestore> firestore;

    private Firestore db() {
        return firestore.orElseThrow(() -> new IllegalStateException("Firestore não inicializado"));
    }

    public Optional<Map<String, Object>> get(String telefone) {
        try {
            var doc = db().collection("whatsapp_sessoes").document(telefone).get().get();
            if (!doc.exists()) return Optional.empty();
            Map<String, Object> data = doc.getData();
            return Optional.of(data != null ? data : Map.of());
        } catch (InterruptedException | ExecutionException e) {
            Thread.currentThread().interrupt();
            throw new RuntimeException(e);
        }
    }

    public void set(String telefone, Map<String, Object> data) {
        try {
            Map<String, Object> payload = new HashMap<>(data);
            payload.put("updatedAt", Instant.now().toString());
            db().collection("whatsapp_sessoes").document(telefone).set(payload, SetOptions.merge()).get();
        } catch (InterruptedException | ExecutionException e) {
            Thread.currentThread().interrupt();
            throw new RuntimeException(e);
        }
    }

    public void clear(String telefone) {
        try {
            db().collection("whatsapp_sessoes").document(telefone).delete().get();
        } catch (InterruptedException | ExecutionException e) {
            Thread.currentThread().interrupt();
            throw new RuntimeException(e);
        }
    }
}
