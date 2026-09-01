package com.clinica.bot.repository.firestore;

import com.clinica.bot.domain.Consulta;
import com.clinica.bot.util.CpfUtils;
import com.google.cloud.firestore.DocumentSnapshot;
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
public class ConsultaFirestoreRepository {

    private final Optional<Firestore> firestore;

    private Firestore db() {
        return firestore.orElseThrow(() -> new IllegalStateException("Firestore não inicializado"));
    }

    public Consulta createWithId(String id, Map<String, Object> data) {
        Map<String, Object> payload = new HashMap<>(data);
        payload.put("legacyId", id);
        payload.put("createdAt", Instant.now().toString());
        if (!payload.containsKey("parceiroId")) payload.put("parceiroId", "default");
        if (!payload.containsKey("status")) payload.put("status", "agendado");
        payload.put("reminder24hSent", false);
        payload.put("reminder3hSent", false);
        try {
            db().collection("consultas").document(id).set(payload).get();
            Consulta c = toConsulta(id, payload);
            c.setId(id);
            return c;
        } catch (InterruptedException | ExecutionException e) {
            Thread.currentThread().interrupt();
            throw new RuntimeException(e);
        }
    }

    public Optional<Consulta> getById(String id) {
        try {
            DocumentSnapshot doc = db().collection("consultas").document(id).get().get();
            if (!doc.exists()) return Optional.empty();
            return Optional.of(toConsulta(doc.getId(), doc.getData()));
        } catch (InterruptedException | ExecutionException e) {
            Thread.currentThread().interrupt();
            throw new RuntimeException(e);
        }
    }

    public Consulta update(String id, Map<String, Object> partial) {
        try {
            db().collection("consultas").document(id).update(partial).get();
            return getById(id).orElseThrow();
        } catch (InterruptedException | ExecutionException e) {
            Thread.currentThread().interrupt();
            throw new RuntimeException(e);
        }
    }

    public Map<String, Object> delete(String id) {
        try {
            db().collection("consultas").document(id).delete().get();
            return Map.of("id", id, "deleted", true);
        } catch (InterruptedException | ExecutionException e) {
            Thread.currentThread().interrupt();
            throw new RuntimeException(e);
        }
    }

    public void deleteByPatient(String cpf, String telefone) {
        try {
            if (cpf != null && !cpf.isBlank()) {
                var snap = db().collection("consultas").whereEqualTo("cpf", CpfUtils.digitsOnly(cpf)).get().get();
                for (QueryDocumentSnapshot doc : snap.getDocuments()) doc.getReference().delete().get();
            }
            if (telefone != null && !telefone.isBlank()) {
                var snap = db().collection("consultas").whereEqualTo("telefone", CpfUtils.digitsOnly(telefone)).get().get();
                for (QueryDocumentSnapshot doc : snap.getDocuments()) doc.getReference().delete().get();
            }
        } catch (InterruptedException | ExecutionException e) {
            Thread.currentThread().interrupt();
            throw new RuntimeException(e);
        }
    }

    public List<Consulta> listByDate(String dateStr, String parceiroId) {
        try {
            var query = db().collection("consultas").whereEqualTo("data", dateStr);
            if (parceiroId != null) query = query.whereEqualTo("parceiroId", parceiroId);
            return query.get().get().getDocuments().stream()
                    .map(d -> toConsulta(d.getId(), d.getData()))
                    .collect(Collectors.toList());
        } catch (InterruptedException | ExecutionException e) {
            Thread.currentThread().interrupt();
            throw new RuntimeException(e);
        }
    }

    public List<Consulta> listByDateAndProfessional(String dateStr, String profId, String parceiroId) {
        try {
            var query = db().collection("consultas")
                    .whereEqualTo("data", dateStr)
                    .whereEqualTo("profissionalId", profId);
            if (parceiroId != null) query = query.whereEqualTo("parceiroId", parceiroId);
            return query.get().get().getDocuments().stream()
                    .map(d -> toConsulta(d.getId(), d.getData()))
                    .collect(Collectors.toList());
        } catch (InterruptedException | ExecutionException e) {
            Thread.currentThread().interrupt();
            throw new RuntimeException(e);
        }
    }

    public List<Consulta> listByDateRange(String start, String end, String parceiroId) {
        try {
            var query = db().collection("consultas")
                    .whereGreaterThanOrEqualTo("data", start)
                    .whereLessThanOrEqualTo("data", end);
            return query.get().get().getDocuments().stream()
                    .map(d -> toConsulta(d.getId(), d.getData()))
                    .filter(c -> parceiroId == null || parceiroId.equals(c.getParceiroId()))
                    .collect(Collectors.toList());
        } catch (InterruptedException | ExecutionException e) {
            Thread.currentThread().interrupt();
            throw new RuntimeException(e);
        }
    }

    public List<Consulta> listFromDateByTelefone(String dateMin, String telefone) {
        String tel = CpfUtils.digitsOnly(telefone);
        try {
            return db().collection("consultas").whereEqualTo("telefone", tel).get().get().getDocuments().stream()
                    .map(d -> toConsulta(d.getId(), d.getData()))
                    .filter(c -> !"cancelado".equals(c.getStatus()))
                    .filter(c -> c.getData().compareTo(dateMin) >= 0)
                    .sorted(Comparator.comparing(c -> c.getData() + c.getHora()))
                    .collect(Collectors.toList());
        } catch (InterruptedException | ExecutionException e) {
            Thread.currentThread().interrupt();
            throw new RuntimeException(e);
        }
    }

    public List<Consulta> listByCpf(String cpf) {
        try {
            return db().collection("consultas").whereEqualTo("cpf", CpfUtils.digitsOnly(cpf)).get().get().getDocuments().stream()
                    .map(d -> toConsulta(d.getId(), d.getData()))
                    .collect(Collectors.toList());
        } catch (InterruptedException | ExecutionException e) {
            Thread.currentThread().interrupt();
            throw new RuntimeException(e);
        }
    }

    public boolean hasConflict(String dateStr, String hora, String excludeId, String profId, String parceiroId) {
        try {
            var query = db().collection("consultas")
                    .whereEqualTo("data", dateStr)
                    .whereEqualTo("hora", hora);
            if (profId != null) query = query.whereEqualTo("profissionalId", profId);
            if (parceiroId != null) query = query.whereEqualTo("parceiroId", parceiroId);
            for (QueryDocumentSnapshot doc : query.get().get().getDocuments()) {
                Consulta c = toConsulta(doc.getId(), doc.getData());
                if ("cancelado".equals(c.getStatus())) continue;
                if (excludeId == null || !excludeId.equals(c.getId())) return true;
            }
            return false;
        } catch (InterruptedException | ExecutionException e) {
            Thread.currentThread().interrupt();
            throw new RuntimeException(e);
        }
    }

    public List<Consulta> listAllForReminders() {
        try {
            List<Consulta> out = new ArrayList<>();
            out.addAll(db().collection("consultas").whereEqualTo("status", "agendado").get().get().getDocuments().stream()
                    .map(d -> toConsulta(d.getId(), d.getData())).toList());
            out.addAll(db().collection("consultas").whereEqualTo("status", "confirmado").get().get().getDocuments().stream()
                    .map(d -> toConsulta(d.getId(), d.getData())).toList());
            return out;
        } catch (InterruptedException | ExecutionException e) {
            Thread.currentThread().interrupt();
            throw new RuntimeException(e);
        }
    }

    public List<Map<String, Object>> listPacientesAggregated(String parceiroId) {
        return aggregate(listByDateRange("1900-01-01", "9999-12-31", parceiroId));
    }

    public List<Map<String, Object>> listPacientesAggregatedByProfessional(String profId, String parceiroId) {
        try {
            var query = db().collection("consultas").whereEqualTo("profissionalId", profId);
            List<Consulta> rows = query.get().get().getDocuments().stream()
                    .map(d -> toConsulta(d.getId(), d.getData()))
                    .filter(c -> parceiroId == null || parceiroId.equals(c.getParceiroId()))
                    .collect(Collectors.toList());
            return aggregate(rows);
        } catch (InterruptedException | ExecutionException e) {
            Thread.currentThread().interrupt();
            throw new RuntimeException(e);
        }
    }

    private List<Map<String, Object>> aggregate(List<Consulta> rows) {
        Map<String, Map<String, Object>> byPhone = new LinkedHashMap<>();
        for (Consulta row : rows) {
            String phone = row.getTelefone();
            if (phone == null) continue;
            byPhone.computeIfAbsent(phone, p -> {
                Map<String, Object> m = new LinkedHashMap<>();
                m.put("telefone", phone);
                m.put("nome", row.getNomePaciente());
                m.put("cpf", row.getCpf() != null ? row.getCpf() : "");
                m.put("consultas", new ArrayList<Map<String, Object>>());
                return m;
            });
            if (row.getCpf() != null) byPhone.get(phone).put("cpf", row.getCpf());
            @SuppressWarnings("unchecked")
            List<Map<String, Object>> consultas = (List<Map<String, Object>>) byPhone.get(phone).get("consultas");
            Map<String, Object> c = new LinkedHashMap<>();
            c.put("id", row.getId());
            c.put("data", row.getData());
            c.put("hora", row.getHora());
            c.put("status", row.getStatus());
            c.put("profissionalId", row.getProfissionalId());
            c.put("servico", row.getServico());
            consultas.add(c);
        }
        return byPhone.values().stream()
                .sorted(Comparator.comparing(m -> String.valueOf(m.get("nome"))))
                .collect(Collectors.toList());
    }

    @SuppressWarnings("unchecked")
    private Consulta toConsulta(String id, Map<String, Object> data) {
        if (data == null) data = Map.of();
        Consulta c = new Consulta();
        c.setId(id);
        c.setLegacyId(str(data.get("legacyId")));
        c.setNomePaciente(str(data.get("nomePaciente")));
        c.setTelefone(str(data.get("telefone")));
        c.setCpf(str(data.get("cpf")));
        c.setDataNascimento(str(data.get("dataNascimento")));
        c.setParceiroId(str(data.get("parceiroId")));
        c.setData(str(data.get("data")));
        c.setHora(str(data.get("hora")));
        c.setProfissionalId(str(data.get("profissionalId")));
        c.setServico(str(data.get("servico")));
        c.setStatus(str(data.get("status")));
        c.setReminder24hSent(data.get("reminder24hSent") instanceof Boolean b && b);
        c.setReminder3hSent(data.get("reminder3hSent") instanceof Boolean b && b);
        return c;
    }

    private static String str(Object o) { return o == null ? null : String.valueOf(o); }
}
