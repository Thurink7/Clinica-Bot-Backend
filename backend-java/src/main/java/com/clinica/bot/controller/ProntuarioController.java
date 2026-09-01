package com.clinica.bot.controller;

import com.clinica.bot.domain.Prontuario;
import com.clinica.bot.exception.ApiException;
import com.clinica.bot.repository.ClienteRepository;
import com.clinica.bot.repository.ProntuarioRepository;
import com.clinica.bot.security.AuthUser;
import com.clinica.bot.security.SecurityUtils;
import com.clinica.bot.util.CpfUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequiredArgsConstructor
public class ProntuarioController {
    private final ProntuarioRepository prontuarios;
    private final ClienteRepository clientes;

    @PostMapping("/parceiros/prontuarios")
    @ResponseStatus(HttpStatus.CREATED)
    public Prontuario criar(@RequestBody Map<String, Object> body) {
        AuthUser user = SecurityUtils.requireUser();
        String cpf = String.valueOf(body.getOrDefault("clienteCpf", "")).trim();
        String diagnostico = String.valueOf(body.getOrDefault("diagnostico", "")).trim();
        if (cpf.isBlank() || diagnostico.isBlank()) throw new ApiException("CPF do cliente e diagnóstico são obrigatórios", 400);
        clientes.getOrCreate(cpf, Map.of("nome", body.getOrDefault("clienteNome", "Paciente"),
                "telefone", body.getOrDefault("clienteTelefone", "")));
        Map<String, Object> data = new HashMap<>(body);
        data.put("clienteCpf", CpfUtils.digitsOnly(cpf));
        data.put("parceiroId", user.getParceiroId() == null ? "default" : user.getParceiroId());
        return prontuarios.create(data);
    }

    @GetMapping("/pacientes/{cpf}/prontuarios")
    public List<Prontuario> listar(@PathVariable String cpf) {
        return prontuarios.listByClienteCpf(CpfUtils.digitsOnly(cpf));
    }

    @GetMapping("/pacientes/{cpf}/resultados")
    public List<Map<String, Object>> resultados(@PathVariable String cpf) {
        List<Map<String, Object>> out = new ArrayList<>();
        for (Prontuario p : prontuarios.listByClienteCpf(CpfUtils.digitsOnly(cpf))) {
            if (p.getResultados() == null) continue;
            for (Object resultado : p.getResultados()) {
                Map<String, Object> item = new LinkedHashMap<>();
                item.put("prontuarioId", p.getId()); item.put("dataProntuario", p.getDataProntuario()); item.put("parceiroId", p.getParceiroId());
                if (resultado instanceof Map<?, ?> map) map.forEach((k, v) -> item.put(String.valueOf(k), v));
                else item.put("resultado", resultado);
                out.add(item);
            }
        }
        return out;
    }
}
