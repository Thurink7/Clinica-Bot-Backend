package com.clinica.bot.repository.firestore;

import com.clinica.bot.domain.Profissional;
import com.clinica.bot.util.CpfUtils;
import com.google.cloud.firestore.DocumentReference;
import com.google.cloud.firestore.Firestore;
import com.google.cloud.firestore.QueryDocumentSnapshot;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.*;
import java.util.concurrent.ExecutionException;
import java.util.stream.Collectors;

@Repository
@RequiredArgsConstructor
public class ProfissionalFirestoreRepository {

    private final Optional<Firestore> firestore;

    private Firestore db() {
        return firestore.orElseThrow(() -> new IllegalStateException("Firestore não inicializado"));
    }

    public Profissional create(Map<String, Object> data) {
        try {
            DocumentReference ref = db().collection("profissionais").document();
            return createWithId(ref.getId(), data);
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }

    public Profissional createWithId(String id, Map<String, Object> data) {
        Map<String, Object> payload = new HashMap<>(data);
        payload.put("legacyId", id);
        payload.put("createdAt", Instant.now().toString());
        try {
            db().collection("profissionais").document(id).set(payload).get();
            return getById(id).orElseThrow();
        } catch (InterruptedException | ExecutionException e) {
            Thread.currentThread().interrupt();
            throw new RuntimeException(e);
        }
    }

    public Optional<Profissional> getById(String id) {
        try {
            var doc = db().collection("profissionais").document(id).get().get();
            if (!doc.exists()) return Optional.empty();
            return Optional.of(toProf(id, doc.getData()));
        } catch (InterruptedException | ExecutionException e) {
            Thread.currentThread().interrupt();
            throw new RuntimeException(e);
        }
    }

    public List<Profissional> listAll() {
        try {
            return db().collection("profissionais").get().get().getDocuments().stream()
                    .map(d -> toProf(d.getId(), d.getData()))
                    .collect(Collectors.toList());
        } catch (InterruptedException | ExecutionException e) {
            Thread.currentThread().interrupt();
            throw new RuntimeException(e);
        }
    }

    public List<Profissional> listActive() {
        return listAll().stream().filter(p -> p.getAtivo() == null || Boolean.TRUE.equals(p.getAtivo())).collect(Collectors.toList());
    }

    public Profissional update(String id, Map<String, Object> partial) {
        try {
            db().collection("profissionais").document(id).update(partial).get();
            return getById(id).orElseThrow();
        } catch (InterruptedException | ExecutionException e) {
            Thread.currentThread().interrupt();
            throw new RuntimeException(e);
        }
    }

    public Map<String, Object> delete(String id) {
        try {
            db().collection("profissionais").document(id).delete().get();
            return Map.of("id", id, "deleted", true);
        } catch (InterruptedException | ExecutionException e) {
            Thread.currentThread().interrupt();
            throw new RuntimeException(e);
        }
    }

    @SuppressWarnings("unchecked")
    private Profissional toProf(String id, Map<String, Object> data) {
        Profissional p = new Profissional();
        p.setId(id);
        if (data == null) return p;
        p.setLegacyId(str(data.get("legacyId")));
        p.setNome(str(data.get("nome")));
        p.setEspecialidade(str(data.get("especialidade")));
        p.setTelefone(str(data.get("telefone")));
        p.setEmail(str(data.get("email")));
        p.setServicos((List<String>) data.get("servicos"));
        p.setAtivo(data.get("ativo") instanceof Boolean b ? b : true);
        p.setDiasTrabalho((List<Integer>) data.get("diasTrabalho"));
        return p;
    }

    private static String str(Object o) { return o == null ? null : String.valueOf(o); }
}
