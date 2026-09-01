package com.clinica.bot.repository.firestore;

import com.clinica.bot.domain.AdminUser;
import com.google.cloud.firestore.DocumentReference;
import com.google.cloud.firestore.Firestore;
import com.google.cloud.firestore.QueryDocumentSnapshot;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ExecutionException;

@Repository
@RequiredArgsConstructor
public class AdminUserFirestoreRepository {

    private final Optional<Firestore> firestore;

    private Firestore db() {
        return firestore.orElseThrow(() -> new IllegalStateException("Firestore não inicializado"));
    }

    public Optional<AdminUser> findByEmail(String email) {
        try {
            var snap = db().collection("admin_users")
                    .whereEqualTo("email", email.toLowerCase().trim())
                    .limit(1).get().get();
            if (snap.isEmpty()) return Optional.empty();
            QueryDocumentSnapshot doc = snap.getDocuments().get(0);
            return Optional.of(toUser(doc.getId(), doc.getData()));
        } catch (InterruptedException | ExecutionException e) {
            Thread.currentThread().interrupt();
            throw new RuntimeException(e);
        }
    }

    public Optional<AdminUser> getById(String id) {
        try {
            var doc = db().collection("admin_users").document(id).get().get();
            if (!doc.exists()) return Optional.empty();
            return Optional.of(toUser(doc.getId(), doc.getData()));
        } catch (InterruptedException | ExecutionException e) {
            Thread.currentThread().interrupt();
            throw new RuntimeException(e);
        }
    }

    public AdminUser create(String email, String passwordHash, String nome, String parceiroId) {
        try {
            DocumentReference ref = db().collection("admin_users").document();
            Map<String, Object> payload = Map.of(
                    "email", email.toLowerCase().trim(),
                    "passwordHash", passwordHash,
                    "nome", nome,
                    "parceiroId", parceiroId != null ? parceiroId : "",
                    "createdAt", Instant.now().toString()
            );
            ref.set(payload).get();
            return toUser(ref.getId(), payload);
        } catch (InterruptedException | ExecutionException e) {
            Thread.currentThread().interrupt();
            throw new RuntimeException(e);
        }
    }

    private AdminUser toUser(String id, Map<String, Object> data) {
        return AdminUser.builder()
                .id(id)
                .email(str(data.get("email")))
                .passwordHash(str(data.get("passwordHash")))
                .nome(str(data.get("nome")))
                .parceiroId(emptyToNull(str(data.get("parceiroId"))))
                .createdAt(Instant.now())
                .build();
    }

    private static String str(Object o) { return o == null ? null : String.valueOf(o); }
    private static String emptyToNull(String s) { return s == null || s.isBlank() ? null : s; }
}
