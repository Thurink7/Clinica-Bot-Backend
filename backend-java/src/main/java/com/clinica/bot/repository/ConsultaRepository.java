package com.clinica.bot.repository;

import com.clinica.bot.config.DatabaseMode;
import com.clinica.bot.domain.Consulta;
import com.clinica.bot.repository.firestore.ConsultaFirestoreRepository;
import com.clinica.bot.repository.mongo.ConsultaMongoRepository;
import com.clinica.bot.util.CpfUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Repository
@RequiredArgsConstructor
public class ConsultaRepository {

    private final DatabaseMode databaseMode;
    private final ObjectProvider<ConsultaMongoRepository> mongoRepoProvider;
    private final ConsultaFirestoreRepository firestoreRepo;
    private final ObjectProvider<MongoTemplate> mongoTemplateProvider;

    private ConsultaMongoRepository mongo() {
        return mongoRepoProvider.getObject();
    }

    private MongoTemplate template() {
        return mongoTemplateProvider.getObject();
    }

    public Consulta create(Map<String, Object> data) {
        String id = CpfUtils.generateLegacyId();
        Consulta created = primary().createWithId(id, data);
        mirrorWrite(() -> secondary().createWithId(created.getId(), data));
        return created;
    }

    public Optional<Consulta> getById(String id) {
        return primary().getById(id);
    }

    public Consulta update(String id, Map<String, Object> partial) {
        Consulta updated = primary().update(id, partial);
        mirrorWrite(() -> secondary().update(id, partial));
        return updated;
    }

    public Map<String, Object> delete(String id) {
        Map<String, Object> result = primary().delete(id);
        mirrorWrite(() -> secondary().delete(id));
        return result;
    }

    public void deleteByPatient(String cpf, String telefone) {
        primary().deleteByPatient(cpf, telefone);
        mirrorWrite(() -> secondary().deleteByPatient(cpf, telefone));
    }

    public List<Consulta> listByDate(String dateStr, String parceiroId) {
        return primary().listByDate(dateStr, parceiroId);
    }

    public List<Consulta> listByDateAndProfessional(String dateStr, String profissionalId, String parceiroId) {
        return primary().listByDateAndProfessional(dateStr, profissionalId, parceiroId);
    }

    public List<Consulta> listByDateRange(String start, String end, String parceiroId) {
        return primary().listByDateRange(start, end, parceiroId);
    }

    public List<Consulta> listFromDateByTelefone(String dateMin, String telefone) {
        return primary().listFromDateByTelefone(dateMin, telefone);
    }

    public List<Consulta> listByCpf(String cpf) {
        return primary().listByCpf(cpf);
    }

    public boolean hasConflict(String dateStr, String hora, String excludeId, String profissionalId, String parceiroId) {
        return primary().hasConflict(dateStr, hora, excludeId, profissionalId, parceiroId);
    }

    public List<Consulta> listAllForReminders() {
        return primary().listAllForReminders();
    }

    public List<Map<String, Object>> listPacientesAggregated(String parceiroId) {
        return primary().listPacientesAggregated(parceiroId);
    }

    public List<Map<String, Object>> listPacientesAggregatedByProfessional(String profissionalId, String parceiroId) {
        return primary().listPacientesAggregatedByProfessional(profissionalId, parceiroId);
    }

    private ConsultaBackend primary() {
        return "mongo".equals(databaseMode.getRead()) ? mongoBackend() : firestoreBackend();
    }

    private ConsultaBackend secondary() {
        if (!"dual".equals(databaseMode.getWrite())) {
            return nullBackend();
        }
        return "mongo".equals(databaseMode.getRead()) ? firestoreBackend() : mongoBackend();
    }

    private void mirrorWrite(Runnable action) {
        if (!"dual".equals(databaseMode.getWrite())) return;
        try {
            action.run();
        } catch (Exception e) {
            log.warn("dual_write_secondary_failed: {}", e.getMessage());
        }
    }

    private ConsultaBackend mongoBackend() {
        return new MongoBackend();
    }

    private ConsultaBackend firestoreBackend() {
        return new FirestoreBackend();
    }

    private ConsultaBackend nullBackend() {
        return new ConsultaBackend() {};
    }

    private interface ConsultaBackend {
        default Consulta createWithId(String id, Map<String, Object> data) { throw unsupported(); }
        default Optional<Consulta> getById(String id) { throw unsupported(); }
        default Consulta update(String id, Map<String, Object> partial) { throw unsupported(); }
        default Map<String, Object> delete(String id) { throw unsupported(); }
        default void deleteByPatient(String cpf, String telefone) { throw unsupported(); }
        default List<Consulta> listByDate(String dateStr, String parceiroId) { throw unsupported(); }
        default List<Consulta> listByDateAndProfessional(String dateStr, String profId, String parceiroId) { throw unsupported(); }
        default List<Consulta> listByDateRange(String start, String end, String parceiroId) { throw unsupported(); }
        default List<Consulta> listFromDateByTelefone(String dateMin, String telefone) { throw unsupported(); }
        default List<Consulta> listByCpf(String cpf) { throw unsupported(); }
        default boolean hasConflict(String dateStr, String hora, String excludeId, String profId, String parceiroId) { throw unsupported(); }
        default List<Consulta> listAllForReminders() { throw unsupported(); }
        default List<Map<String, Object>> listPacientesAggregated(String parceiroId) { throw unsupported(); }
        default List<Map<String, Object>> listPacientesAggregatedByProfessional(String profId, String parceiroId) { throw unsupported(); }
        private static UnsupportedOperationException unsupported() {
            return new UnsupportedOperationException("Backend não configurado");
        }
    }

    private class MongoBackend implements ConsultaBackend {
        @Override
        public Consulta createWithId(String id, Map<String, Object> data) {
            Consulta c = mapToConsulta(id, data);
            c.setLegacyId(id);
            c.setCreatedAt(Instant.now());
            if (c.getParceiroId() == null) c.setParceiroId("default");
            if (c.getStatus() == null) c.setStatus("agendado");
            if (c.getReminder24hSent() == null) c.setReminder24hSent(false);
            if (c.getReminder3hSent() == null) c.setReminder3hSent(false);
            return mongo().save(c);
        }

        @Override
        public Optional<Consulta> getById(String id) {
            return mongo().findById(id).or(() -> mongo().findByLegacyId(id));
        }

        @Override
        public Consulta update(String id, Map<String, Object> partial) {
            Consulta cur = getById(id).orElseThrow();
            applyPartial(cur, partial);
            return mongo().save(cur);
        }

        @Override
        public Map<String, Object> delete(String id) {
            getById(id).ifPresent(c -> mongo().deleteById(c.getId()));
            return Map.of("id", id, "deleted", true);
        }

        @Override
        public void deleteByPatient(String cpf, String telefone) {
            Query q = new Query();
            List<Criteria> or = new ArrayList<>();
            if (cpf != null && !cpf.isBlank()) or.add(Criteria.where("cpf").is(CpfUtils.digitsOnly(cpf)));
            if (telefone != null && !telefone.isBlank()) or.add(Criteria.where("telefone").is(CpfUtils.digitsOnly(telefone)));
            if (!or.isEmpty()) {
                q.addCriteria(new Criteria().orOperator(or.toArray(Criteria[]::new)));
                template().remove(q, Consulta.class);
            }
        }

        @Override
        public List<Consulta> listByDate(String dateStr, String parceiroId) {
            if (parceiroId != null) return mongo().findByDataAndParceiroId(dateStr, parceiroId);
            return mongo().findByData(dateStr);
        }

        @Override
        public List<Consulta> listByDateAndProfessional(String dateStr, String profId, String parceiroId) {
            return mongo().findByDataAndProfissionalIdAndParceiroId(dateStr, profId, parceiroId);
        }

        @Override
        public List<Consulta> listByDateRange(String start, String end, String parceiroId) {
            if (parceiroId != null) return mongo().findByDataBetweenAndParceiroId(start, end, parceiroId);
            return mongo().findByDataBetween(start, end);
        }

        @Override
        public List<Consulta> listFromDateByTelefone(String dateMin, String telefone) {
            String tel = CpfUtils.digitsOnly(telefone);
            return mongo().findByTelefone(tel).stream()
                    .filter(c -> !"cancelado".equals(c.getStatus()))
                    .filter(c -> c.getData().compareTo(dateMin) >= 0)
                    .sorted(Comparator.comparing(c -> c.getData() + c.getHora()))
                    .collect(Collectors.toList());
        }

        @Override
        public List<Consulta> listByCpf(String cpf) {
            return mongo().findByCpf(CpfUtils.digitsOnly(cpf));
        }

        @Override
        public boolean hasConflict(String dateStr, String hora, String excludeId, String profId, String parceiroId) {
            Query q = new Query(Criteria.where("data").is(dateStr).and("hora").is(hora).and("status").ne("cancelado"));
            if (profId != null) q.addCriteria(Criteria.where("profissionalId").is(profId));
            if (parceiroId != null) q.addCriteria(Criteria.where("parceiroId").is(parceiroId));
            return template().find(q, Consulta.class).stream()
                    .anyMatch(c -> excludeId == null || !excludeId.equals(c.getId()));
        }

        @Override
        public List<Consulta> listAllForReminders() {
            return mongo().findByStatusIn(List.of("agendado", "confirmado"));
        }

        @Override
        public List<Map<String, Object>> listPacientesAggregated(String parceiroId) {
            List<Consulta> rows = listByDateRange("1900-01-01", "9999-12-31", parceiroId);
            return aggregatePacientes(rows);
        }

        @Override
        public List<Map<String, Object>> listPacientesAggregatedByProfessional(String profId, String parceiroId) {
            Query q = new Query(Criteria.where("profissionalId").is(profId));
            if (parceiroId != null) q.addCriteria(Criteria.where("parceiroId").is(parceiroId));
            return aggregatePacientes(template().find(q, Consulta.class));
        }
    }

    private class FirestoreBackend implements ConsultaBackend {
        @Override
        public Consulta createWithId(String id, Map<String, Object> data) {
            return firestoreRepo.createWithId(id, data);
        }

        @Override
        public Optional<Consulta> getById(String id) {
            return firestoreRepo.getById(id);
        }

        @Override
        public Consulta update(String id, Map<String, Object> partial) {
            return firestoreRepo.update(id, partial);
        }

        @Override
        public Map<String, Object> delete(String id) {
            return firestoreRepo.delete(id);
        }

        @Override
        public void deleteByPatient(String cpf, String telefone) {
            firestoreRepo.deleteByPatient(cpf, telefone);
        }

        @Override
        public List<Consulta> listByDate(String dateStr, String parceiroId) {
            return firestoreRepo.listByDate(dateStr, parceiroId);
        }

        @Override
        public List<Consulta> listByDateAndProfessional(String dateStr, String profId, String parceiroId) {
            return firestoreRepo.listByDateAndProfessional(dateStr, profId, parceiroId);
        }

        @Override
        public List<Consulta> listByDateRange(String start, String end, String parceiroId) {
            return firestoreRepo.listByDateRange(start, end, parceiroId);
        }

        @Override
        public List<Consulta> listFromDateByTelefone(String dateMin, String telefone) {
            return firestoreRepo.listFromDateByTelefone(dateMin, telefone);
        }

        @Override
        public List<Consulta> listByCpf(String cpf) {
            return firestoreRepo.listByCpf(cpf);
        }

        @Override
        public boolean hasConflict(String dateStr, String hora, String excludeId, String profId, String parceiroId) {
            return firestoreRepo.hasConflict(dateStr, hora, excludeId, profId, parceiroId);
        }

        @Override
        public List<Consulta> listAllForReminders() {
            return firestoreRepo.listAllForReminders();
        }

        @Override
        public List<Map<String, Object>> listPacientesAggregated(String parceiroId) {
            return firestoreRepo.listPacientesAggregated(parceiroId);
        }

        @Override
        public List<Map<String, Object>> listPacientesAggregatedByProfessional(String profId, String parceiroId) {
            return firestoreRepo.listPacientesAggregatedByProfessional(profId, parceiroId);
        }
    }

    private List<Map<String, Object>> aggregatePacientes(List<Consulta> rows) {
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

    private Consulta mapToConsulta(String id, Map<String, Object> data) {
        Consulta c = new Consulta();
        c.setId(id);
        c.setNomePaciente(str(data.get("nomePaciente")));
        c.setTelefone(CpfUtils.digitsOnly(str(data.get("telefone"))));
        c.setCpf(data.get("cpf") != null ? CpfUtils.digitsOnly(str(data.get("cpf"))) : null);
        c.setDataNascimento(data.get("dataNascimento") != null ? str(data.get("dataNascimento")).substring(0, Math.min(10, str(data.get("dataNascimento")).length())) : null);
        c.setParceiroId(strOr(data.get("parceiroId"), "default"));
        c.setData(str(data.get("data")));
        c.setHora(str(data.get("hora")));
        c.setProfissionalId(data.get("profissionalId") != null ? str(data.get("profissionalId")) : null);
        c.setServico(data.get("servico") != null ? str(data.get("servico")).trim().toUpperCase() : null);
        c.setStatus(strOr(data.get("status"), "agendado"));
        c.setReminder24hSent(bool(data.get("reminder24hSent"), false));
        c.setReminder3hSent(bool(data.get("reminder3hSent"), false));
        return c;
    }

    private void applyPartial(Consulta c, Map<String, Object> partial) {
        if (partial.containsKey("status")) c.setStatus(str(partial.get("status")));
        if (partial.containsKey("data")) c.setData(str(partial.get("data")));
        if (partial.containsKey("hora")) c.setHora(str(partial.get("hora")));
        if (partial.containsKey("reminder24hSent")) c.setReminder24hSent(bool(partial.get("reminder24hSent"), false));
        if (partial.containsKey("reminder3hSent")) c.setReminder3hSent(bool(partial.get("reminder3hSent"), false));
    }

    private static String str(Object o) { return o == null ? null : String.valueOf(o); }
    private static String strOr(Object o, String def) { return o == null ? def : String.valueOf(o); }
    private static boolean bool(Object o, boolean def) { return o instanceof Boolean b ? b : def; }
}
