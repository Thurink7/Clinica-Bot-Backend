package com.clinica.bot.repository.firestore;

import com.clinica.bot.domain.Paciente;
import com.clinica.bot.exception.ApiException;
import com.clinica.bot.util.CpfUtils;
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
public class PacienteFirestoreRepository {

    private final Optional<Firestore> firestore;

    private Firestore db() {
        return firestore.orElseThrow(() -> new IllegalStateException("Firestore não inicializado"));
    }

    public Paciente upsert(Map<String, Object> data) {
        var v = CpfUtils.validateCpf(String.valueOf(data.get("cpf")));
        if (!v.ok()) throw new ApiException(v.message(), 400);
        Map<String, Object> payload = new HashMap<>();
        payload.put("telefone", CpfUtils.digitsOnly(String.valueOf(data.get("telefone"))));
        payload.put("nome", String.valueOf(data.get("nome")).trim());
        payload.put("cpf", v.digits());
        payload.put("legacyId", v.digits());
        payload.put("dataNascimento", data.get("dataNascimento"));
        payload.put("updatedAt", Instant.now().toString());
        try {
            db().collection("pacientes").document(v.digits()).set(payload).get();
            return getByCpf(v.digits()).orElseThrow();
        } catch (InterruptedException | ExecutionException e) {
            Thread.currentThread().interrupt();
            throw new RuntimeException(e);
        }
    }

    public Optional<Paciente> getByCpf(String cpf) {
        var v = CpfUtils.validateCpf(cpf);
        if (!v.ok()) return Optional.empty();
        try {
            var doc = db().collection("pacientes").document(v.digits()).get().get();
            if (!doc.exists()) return Optional.empty();
            return Optional.of(toPaciente(v.digits(), doc.getData()));
        } catch (InterruptedException | ExecutionException e) {
            Thread.currentThread().interrupt();
            throw new RuntimeException(e);
        }
    }

    public Optional<Paciente> getByTelefone(String telefone) {
        try {
            var snap = db().collection("pacientes")
                    .whereEqualTo("telefone", CpfUtils.digitsOnly(telefone))
                    .limit(1).get().get();
            if (snap.isEmpty()) return Optional.empty();
            QueryDocumentSnapshot doc = snap.getDocuments().get(0);
            return Optional.of(toPaciente(doc.getId(), doc.getData()));
        } catch (InterruptedException | ExecutionException e) {
            Thread.currentThread().interrupt();
            throw new RuntimeException(e);
        }
    }

    public List<Paciente> listAll() {
        try {
            return db().collection("pacientes").get().get().getDocuments().stream()
                    .map(d -> toPaciente(d.getId(), d.getData()))
                    .collect(Collectors.toList());
        } catch (InterruptedException | ExecutionException e) {
            Thread.currentThread().interrupt();
            throw new RuntimeException(e);
        }
    }

    public Paciente updateObservacoes(String pacienteId, String observacoes) {
        var v = CpfUtils.validateCpf(pacienteId);
        String id = v.ok() ? v.digits() : CpfUtils.digitsOnly(pacienteId);
        if (id.length() != 11) throw new ApiException("CPF do paciente inválido", 400);
        try {
            Map<String, Object> patch = new HashMap<>();
            patch.put("observacoes", String.valueOf(observacoes));
            patch.put("updatedAt", Instant.now().toString());
            patch.put("cpf", id);
            patch.put("legacyId", id);
            db().collection("pacientes").document(id).set(patch, com.google.cloud.firestore.SetOptions.merge()).get();
            return getByCpf(id).orElseThrow();
        } catch (InterruptedException | ExecutionException e) {
            Thread.currentThread().interrupt();
            throw new RuntimeException(e);
        }
    }

    public Map<String, Object> delete(String id) {
        try {
            db().collection("pacientes").document(id).delete().get();
            return Map.of("id", id, "deleted", true);
        } catch (InterruptedException | ExecutionException e) {
            Thread.currentThread().interrupt();
            throw new RuntimeException(e);
        }
    }

    private Paciente toPaciente(String id, Map<String, Object> data) {
        Paciente p = new Paciente();
        p.setId(id);
        if (data == null) return p;
        p.setLegacyId(str(data.get("legacyId")));
        p.setCpf(str(data.get("cpf")));
        p.setNome(str(data.get("nome")));
        p.setTelefone(str(data.get("telefone")));
        p.setDataNascimento(str(data.get("dataNascimento")));
        p.setObservacoes(str(data.get("observacoes")));
        return p;
    }

    private static String str(Object o) { return o == null ? null : String.valueOf(o); }
}
