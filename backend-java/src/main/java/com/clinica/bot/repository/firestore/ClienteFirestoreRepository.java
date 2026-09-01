package com.clinica.bot.repository.firestore;

import com.clinica.bot.domain.Cliente;
import com.clinica.bot.util.CpfUtils;
import com.google.cloud.firestore.Firestore;
import com.google.cloud.firestore.SetOptions;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ExecutionException;

@Repository
@RequiredArgsConstructor
public class ClienteFirestoreRepository {

    private final Optional<Firestore> firestore;

    private Firestore db() {
        return firestore.orElseThrow(() -> new IllegalStateException("Firestore não inicializado"));
    }

    public Cliente getOrCreate(String cpfRaw, Map<String, Object> data) {
        String cpf = CpfUtils.digitsOnly(cpfRaw);
        try {
            var doc = db().collection("clientes").document(cpf).get().get();
            if (doc.exists()) {
                return Cliente.builder()
                        .cpf(cpf)
                        .nome(str(doc.get("nome")))
                        .telefone(str(doc.get("telefone")))
                        .email(str(doc.get("email")))
                        .build();
            }
            Map<String, Object> payload = Map.of(
                    "cpf", cpf,
                    "nome", String.valueOf(data.getOrDefault("nome", "Paciente")),
                    "telefone", CpfUtils.digitsOnly(String.valueOf(data.getOrDefault("telefone", ""))),
                    "email", String.valueOf(data.getOrDefault("email", "")),
                    "createdAt", Instant.now().toString()
            );
            db().collection("clientes").document(cpf).set(payload).get();
            return Cliente.builder()
                    .cpf(cpf)
                    .nome(String.valueOf(payload.get("nome")))
                    .telefone(String.valueOf(payload.get("telefone")))
                    .email(String.valueOf(payload.get("email")))
                    .createdAt(Instant.now())
                    .build();
        } catch (InterruptedException | ExecutionException e) {
            Thread.currentThread().interrupt();
            throw new RuntimeException(e);
        }
    }

    private static String str(Object o) { return o == null ? null : String.valueOf(o); }
}
