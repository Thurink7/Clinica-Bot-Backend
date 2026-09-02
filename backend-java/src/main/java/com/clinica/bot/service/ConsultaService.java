package com.clinica.bot.service;

import com.clinica.bot.domain.ClinicConfig;
import com.clinica.bot.domain.Consulta;
import com.clinica.bot.domain.Profissional;
import com.clinica.bot.exception.ApiException;
import com.clinica.bot.repository.ConfigRepository;
import com.clinica.bot.repository.ConsultaRepository;
import com.clinica.bot.repository.ProfessionalRepository;
import com.clinica.bot.repository.firestore.ClienteFirestoreRepository;
import com.clinica.bot.util.CpfUtils;
import com.clinica.bot.util.DateTimeUtils;
import com.clinica.bot.util.SlotsUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.*;

@Slf4j
@Service
@RequiredArgsConstructor
public class ConsultaService {

    private static final Set<String> VALID_STATUS = Set.of("agendado", "confirmado", "cancelado");

    private final ConsultaRepository consultaRepo;
    private final ConfigRepository configRepo;
    private final ClienteFirestoreRepository clienteRepo;
    private final ProfessionalRepository professionalRepo;
    private final WhatsappProvider whatsappProvider;

    public Consulta agendar(Map<String, Object> body, boolean notify) {
        String nome = str(body.get("nomePaciente"));
        String telefone = CpfUtils.digitsOnly(str(body.get("telefone")));
        String data = str(body.get("data"));
        String hora = str(body.get("hora"));
        String profissionalId = str(body.get("profissionalId"));
        String servico = str(body.get("servico"));
        String parceiroId = strOr(body.get("parceiroId"), "default");
        String cpf = str(body.get("cpf"));
        String dataNascimento = str(body.get("dataNascimento"));

        if (nome == null || telefone == null || data == null || hora == null) {
            throw new ApiException("Campos obrigatórios: nomePaciente, telefone, data, hora", 400);
        }

        ClinicConfig cfg = configRepo.get(parceiroId);
        if (profissionalId != null) validarProfissionalNoDia(profissionalId, data);
        List<String> slots = SlotsUtils.generateSlotsForDay(data, cfg);
        if (!slots.contains(hora)) {
            throw new ApiException("Horário inválido ou fora do expediente", 409);
        }
        if (consultaRepo.hasConflict(data, hora, null, profissionalId, parceiroId)) {
            throw new ApiException("Horário já ocupado", 409);
        }

        if (cpf != null && !cpf.isBlank()) {
            try {
                clienteRepo.getOrCreate(cpf, Map.of("nome", nome, "telefone", telefone));
            } catch (Exception e) {
                log.warn("Ignorando criacao de cliente no Firestore pois o serviço está desabilitado: {}", e.getMessage());
            }
        }
        Map<String, Object> row = new HashMap<>();
        row.put("nomePaciente", nome.trim());
        row.put("telefone", telefone);
        row.put("cpf", cpf != null ? CpfUtils.digitsOnly(cpf) : null);
        row.put("dataNascimento", dataNascimento != null ? dataNascimento.substring(0, Math.min(10, dataNascimento.length())) : null);
        row.put("parceiroId", parceiroId);
        row.put("data", data);
        row.put("hora", hora);
        row.put("profissionalId", profissionalId);
        row.put("servico", servico != null ? servico.trim().toUpperCase() : null);
        row.put("status", "agendado");
        row.put("reminder24hSent", false);
        row.put("reminder3hSent", false);

        Consulta created = consultaRepo.create(row);
        log.info("consulta_criada id={} data={} hora={} parceiroId={}", created.getId(), data, hora, parceiroId);

        if (notify) {
            try {
                whatsappProvider.sendText(telefone,
                        "Consulta agendada para " + data + " às " + hora + ". Status: agendado. Para cancelar, responda CANCELAR " + created.getId());
            } catch (Exception e) {
                log.warn("whatsapp_pos_agendar: {}", e.getMessage());
            }
        }
        return created;
    }

    public List<Consulta> listar(String data, String de, String ate, String parceiroId) {
        if (data != null && !data.isBlank()) {
            return consultaRepo.listByDate(data, parceiroId);
        }
        String today = DateTimeUtils.todayDateStr();
        String start = de != null && !de.isBlank() ? de : today;
        String end = ate != null && !ate.isBlank() ? ate : today;
        return consultaRepo.listByDateRange(start, end, parceiroId);
    }

    public Consulta cancelar(String id) {
        if (id == null || id.isBlank()) throw new ApiException("id obrigatório", 400);
        consultaRepo.getById(id).orElseThrow(() -> new ApiException("Consulta não encontrada", 404));
        return consultaRepo.update(id, Map.of("status", "cancelado"));
    }

    public Consulta atualizarStatus(String id, String status) {
        if (!VALID_STATUS.contains(status)) throw new ApiException("status inválido", 400);
        consultaRepo.getById(id).orElseThrow(() -> new ApiException("Consulta não encontrada", 404));
        return consultaRepo.update(id, Map.of("status", status));
    }

    public Map<String, Object> excluir(String id) {
        if (id == null || id.isBlank()) throw new ApiException("id obrigatório", 400);
        consultaRepo.getById(id).orElseThrow(() -> new ApiException("Consulta não encontrada", 404));
        return consultaRepo.delete(id);
    }

    public Consulta reagendar(String id, String data, String hora) {
        Consulta cur = consultaRepo.getById(id).orElseThrow(() -> new ApiException("Consulta não encontrada", 404));
        ClinicConfig cfg = configRepo.get(cur.getParceiroId());
        if (!SlotsUtils.generateSlotsForDay(data, cfg).contains(hora)) {
            throw new ApiException("Horário inválido ou fora do expediente", 409);
        }
        if (cur.getProfissionalId() != null) validarProfissionalNoDia(cur.getProfissionalId(), data);
        if (consultaRepo.hasConflict(data, hora, id, cur.getProfissionalId(), cur.getParceiroId())) {
            throw new ApiException("Horário já ocupado", 409);
        }
        Map<String, Object> patch = new HashMap<>();
        patch.put("data", data);
        patch.put("hora", hora);
        return consultaRepo.update(id, patch);
    }

    public List<String> horariosDisponiveis(String dataStr, String profissionalId, String parceiroId) {
        if (profissionalId != null) {
            try { validarProfissionalNoDia(profissionalId, dataStr); }
            catch (ApiException e) { return List.of(); }
        }
        ClinicConfig cfg = configRepo.get(parceiroId);
        List<String> slots = SlotsUtils.generateSlotsForDay(dataStr, cfg);
        List<Consulta> ocupadas = profissionalId != null
                ? consultaRepo.listByDateAndProfessional(dataStr, profissionalId, parceiroId)
                : consultaRepo.listByDate(dataStr, parceiroId);
        Set<String> taken = new HashSet<>();
        for (Consulta c : ocupadas) {
            if (!"cancelado".equals(c.getStatus())) taken.add(c.getHora());
        }
        return slots.stream().filter(h -> !taken.contains(h)).toList();
    }

    public void validarProfissionalNoDia(String profissionalId, String data) {
        Profissional p = professionalRepo.getById(profissionalId)
                .orElseThrow(() -> new ApiException("Profissional indisponível", 409));
        if (Boolean.FALSE.equals(p.getAtivo())) throw new ApiException("Profissional indisponível", 409);
        List<Integer> days = p.getDiasTrabalho() != null ? p.getDiasTrabalho() : List.of(1, 2, 3, 4, 5);
        LocalDate ld = LocalDate.parse(data);
        int day = ld.getDayOfWeek().getValue() % 7;
        if (!days.contains(day)) throw new ApiException("Profissional não atende neste dia", 409);
    }

    public List<Map<String, Object>> proximosSlotsResumo(int nDiasUteis, String parceiroId) {
        ClinicConfig cfg = configRepo.get(parceiroId);
        Set<Integer> setDow = new HashSet<>(cfg.getDiasUteis() != null ? cfg.getDiasUteis() : List.of(1, 2, 3, 4, 5));
        List<Map<String, Object>> out = new ArrayList<>();
        LocalDate base = LocalDate.now();
        for (int addDays = 0; out.size() < nDiasUteis && addDays < 90; addDays++) {
            LocalDate cur = base.plusDays(addDays);
            int dow = cur.getDayOfWeek().getValue() % 7;
            if (!setDow.contains(dow)) continue;
            String ds = cur.format(DateTimeFormatter.ISO_LOCAL_DATE);
            if (SlotsUtils.generateSlotsForDay(ds, cfg).isEmpty()) continue;
            List<String> livres = horariosDisponiveis(ds, null, parceiroId);
            if (!livres.isEmpty()) out.add(Map.of("data", ds, "horarios", livres));
        }
        return out;
    }

    public List<Map<String, Object>> proximosSlotsResumoApos(String aposDataIso, int nDiasUteis, String parceiroId) {
        ClinicConfig cfg = configRepo.get(parceiroId);
        Set<Integer> setDow = new HashSet<>(cfg.getDiasUteis() != null ? cfg.getDiasUteis() : List.of(1, 2, 3, 4, 5));
        List<Map<String, Object>> out = new ArrayList<>();
        LocalDate base;
        try {
            base = LocalDate.parse(String.valueOf(aposDataIso).substring(0, 10)).plusDays(1);
        } catch (Exception e) {
            return List.of();
        }
        for (int addDays = 0; out.size() < nDiasUteis && addDays < 90; addDays++) {
            LocalDate cur = base.plusDays(addDays);
            int dow = cur.getDayOfWeek().getValue() % 7;
            if (!setDow.contains(dow)) continue;
            String ds = cur.format(DateTimeFormatter.ISO_LOCAL_DATE);
            if (SlotsUtils.generateSlotsForDay(ds, cfg).isEmpty()) continue;
            List<String> livres = horariosDisponiveis(ds, null, parceiroId);
            if (!livres.isEmpty()) out.add(Map.of("data", ds, "horarios", livres));
        }
        return out;
    }

    public List<Consulta> listarConsultasReagendar(String telefone) {
        return consultaRepo.listFromDateByTelefone(DateTimeUtils.todayDateStr(), telefone);
    }

    private static String str(Object o) { return o == null ? null : String.valueOf(o); }
    private static String strOr(Object o, String def) { return o == null ? def : String.valueOf(o); }
}
