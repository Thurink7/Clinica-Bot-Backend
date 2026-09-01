package com.clinica.bot.repository.firestore;

import com.clinica.bot.domain.Contato;
import com.clinica.bot.util.CpfUtils;
import com.google.cloud.firestore.DocumentReference;
import com.google.cloud.firestore.Firestore;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ExecutionException;

@Repository
@RequiredArgsConstructor
public class ContatoFirestoreRepository {

    private final Optional<Firestore> firestore;

    private Firestore db() {
        return firestore.orElseThrow(() -> new IllegalStateException("Firestore não inicializado"));
    }

    public Contato create(Map<String, Object> data) {
        try {
            DocumentReference ref = db().collection("contatos").document();
            return createWithId(ref.getId(), data);
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }

    public Contato createWithId(String id, Map<String, Object> data) {
        Map<String, Object> payload = new HashMap<>(data);
        payload.put("legacyId", id);
        payload.put("status", "novo");
        payload.put("createdAt", Instant.now().toString());
        try {
            db().collection("contatos").document(id).set(payload).get();
            Contato c = new Contato();
            c.setId(id);
            c.setLegacyId(id);
            c.setNomeClinica(String.valueOf(data.get("nomeClinica")));
            c.setNomeContato(String.valueOf(data.get("nomeContato")));
            c.setEmail(String.valueOf(data.get("email")));
            c.setTelefone(CpfUtils.digitsOnly(String.valueOf(data.get("telefone"))));
            c.setStatus("novo");
            c.setCreatedAt(Instant.now());
            return c;
        } catch (InterruptedException | ExecutionException e) {
            Thread.currentThread().interrupt();
            throw new RuntimeException(e);
        }
    }
}
