package com.clinica.bot.controller;

import com.clinica.bot.domain.ClinicConfig;
import com.clinica.bot.domain.Consulta;
import com.clinica.bot.domain.Paciente;
import com.clinica.bot.exception.ApiException;
import com.clinica.bot.repository.ConfigRepository;
import com.clinica.bot.repository.ConsultaRepository;
import com.clinica.bot.repository.PacienteRepository;
import com.clinica.bot.security.AuthUser;
import com.clinica.bot.security.SecurityUtils;
import com.clinica.bot.service.ConsultaService;
import com.clinica.bot.util.CpfUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequiredArgsConstructor
public class ConsultaController {

    private final ConsultaService consultaService;
    private final ConsultaRepository consultaRepo;
    private final PacienteRepository pacienteRepo;
    private final ConfigRepository configRepo;

    @PostMapping("/agendar")
    @ResponseStatus(HttpStatus.CREATED)
    public Consulta agendar(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @RequestBody Map<String, Object> body) {
        optionalAuthStrict(authorization);
        AuthUser user = SecurityUtils.currentUser();
        String parceiroId = user != null && user.getParceiroId() != null
                ? user.getParceiroId()
                : String.valueOf(body.getOrDefault("parceiroId", "default"));
        body.put("parceiroId", parceiroId);
        Consulta created = consultaService.agendar(body, true);
        if (body.get("cpf") != null) {
            pacienteRepo.upsert(body);
        }
        return created;
    }

    @GetMapping("/consultas")
    public List<Consulta> listarConsultas(
            @RequestParam(required = false) String data,
            @RequestParam(required = false) String de,
            @RequestParam(required = false) String ate,
            @RequestParam(required = false) String parceiroId) {
        AuthUser user = SecurityUtils.requireUser();
        String tenant = user.getParceiroId() != null ? user.getParceiroId() : parceiroId;
        return consultaService.listar(data, de, ate, tenant);
    }

    @PutMapping("/cancelar")
    public Consulta cancelar(@RequestBody(required = false) Map<String, Object> body,
                             @RequestParam(required = false) String id) {
        SecurityUtils.requireUser();
        String consultaId = body != null && body.get("id") != null ? String.valueOf(body.get("id")) : id;
        return consultaService.cancelar(consultaId);
    }

    @PatchMapping("/consultas/status")
    public Consulta patchStatus(@RequestBody Map<String, Object> body) {
        SecurityUtils.requireUser();
        return consultaService.atualizarStatus(String.valueOf(body.get("id")), String.valueOf(body.get("status")));
    }

    @DeleteMapping("/consultas/{id}")
    public Map<String, Object> deleteConsulta(@PathVariable String id) {
        SecurityUtils.requireUser();
        return consultaService.excluir(id);
    }

    @PatchMapping("/consultas/{id}/reagendar")
    public Consulta reagendar(@PathVariable String id, @RequestBody Map<String, Object> body) {
        SecurityUtils.requireUser();
        return consultaService.reagendar(id, String.valueOf(body.get("data")), String.valueOf(body.get("hora")));
    }

    @GetMapping("/slots")
    public Map<String, Object> slots(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @RequestParam String data,
            @RequestParam(required = false) String profissionalId,
            @RequestParam(required = false) String parceiroId) {
        optionalAuthStrict(authorization);
        AuthUser user = SecurityUtils.currentUser();
        String tenant = user != null && user.getParceiroId() != null ? user.getParceiroId() : parceiroId;
        List<String> livres = consultaService.horariosDisponiveis(data, profissionalId, tenant);
        return Map.of("data", data, "horarios", livres);
    }

    @GetMapping("/config")
    public ClinicConfig getConfig(@RequestParam(required = false) String parceiroId) {
        AuthUser user = SecurityUtils.requireUser();
        String tenant = user.getParceiroId() != null ? user.getParceiroId() : (parceiroId != null ? parceiroId : "default");
        return configRepo.get(tenant);
    }

    @PutMapping("/config")
    public ClinicConfig putConfig(@RequestBody Map<String, Object> body) {
        AuthUser user = SecurityUtils.requireUser();
        String tenant = user.getParceiroId() != null ? user.getParceiroId()
                : String.valueOf(body.getOrDefault("parceiroId", "default"));
        return configRepo.update(body, tenant);
    }

    @GetMapping("/pacientes")
    public List<Map<String, Object>> getPacientes(@RequestParam(required = false) String profissionalId) {
        AuthUser user = SecurityUtils.requireUser();
        String parceiroId = user.getParceiroId();
        List<Map<String, Object>> agregados = profissionalId != null && !profissionalId.isBlank()
                ? consultaRepo.listPacientesAggregatedByProfessional(profissionalId, parceiroId)
                : consultaRepo.listPacientesAggregated(parceiroId);

        List<Paciente> cadastros = pacienteRepo.listAll();
        Map<String, Paciente> cadByTel = new HashMap<>();
        for (Paciente c : cadastros) {
            cadByTel.put(CpfUtils.digitsOnly(c.getTelefone()), c);
        }

        Map<String, Map<String, Object>> map = new LinkedHashMap<>();
        for (Map<String, Object> a : agregados) {
            String tel = CpfUtils.digitsOnly(String.valueOf(a.get("telefone")));
            Paciente cad = cadByTel.getOrDefault(tel, new Paciente());
            String cpf = cad.getCpf() != null ? cad.getCpf() : cad.getId();
            if (cpf == null) cpf = String.valueOf(a.getOrDefault("cpf", ""));
            String key = cpf != null && !cpf.isBlank() ? cpf : "tel:" + tel;
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("id", cpf != null && !cpf.isBlank() ? cpf : tel);
            row.put("telefone", tel);
            row.put("nome", cad.getNome() != null && !cad.getNome().isBlank() ? cad.getNome() : a.get("nome"));
            row.put("cpf", cpf);
            row.put("dataNascimento", cad.getDataNascimento());
            row.put("observacoes", cad.getObservacoes());
            row.put("consultas", a.get("consultas"));
            map.put(key, row);
        }

        if (profissionalId == null || profissionalId.isBlank()) {
            for (Paciente c : cadastros) {
                String cpf = c.getCpf() != null ? c.getCpf() : c.getId();
                String key = cpf != null ? cpf : "tel:" + CpfUtils.digitsOnly(c.getTelefone());
                if (!map.containsKey(key)) {
                    Map<String, Object> row = new LinkedHashMap<>();
                    row.put("id", cpf != null ? cpf : c.getId());
                    row.put("telefone", CpfUtils.digitsOnly(c.getTelefone()));
                    row.put("nome", c.getNome());
                    row.put("cpf", cpf);
                    row.put("dataNascimento", c.getDataNascimento());
                    row.put("observacoes", c.getObservacoes());
                    row.put("consultas", List.of());
                    map.put(key, row);
                }
            }
        }

        return map.values().stream()
                .sorted(Comparator.comparing(m -> String.valueOf(m.get("nome")), Comparator.nullsLast(String.CASE_INSENSITIVE_ORDER)))
                .toList();
    }

    @GetMapping("/pacientes/{cpf}/agendamentos")
    public List<Consulta> clientAgendamentos(@PathVariable String cpf) {
        return consultaRepo.listByCpf(cpf);
    }

    private void optionalAuthStrict(String authorization) {
        if (authorization != null && !authorization.isBlank() && SecurityUtils.currentUser() == null) {
            throw new ApiException("Sessão inválida ou expirada", 401);
        }
    }
}
