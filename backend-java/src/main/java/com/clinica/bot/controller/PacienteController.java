package com.clinica.bot.controller;

import com.clinica.bot.domain.Paciente;
import com.clinica.bot.repository.ConsultaRepository;
import com.clinica.bot.repository.PacienteRepository;
import com.clinica.bot.security.SecurityUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequiredArgsConstructor
public class PacienteController {
    private final PacienteRepository pacientes;
    private final ConsultaRepository consultas;

    @PostMapping("/pacientes/cadastro")
    @ResponseStatus(HttpStatus.CREATED)
    public Paciente cadastrar(@RequestBody Map<String, Object> body) {
        return pacientes.upsert(body);
    }

    @PatchMapping("/pacientes/observacoes")
    public Paciente observacoes(@RequestBody Map<String, Object> body) {
        Object id = body.get("cpf") != null ? body.get("cpf")
                : body.get("pacienteId") != null ? body.get("pacienteId") : body.get("telefone");
        return pacientes.updateObservacoes(id == null ? "" : String.valueOf(id),
                body.get("observacoes") == null ? "" : String.valueOf(body.get("observacoes")));
    }

    @DeleteMapping("/pacientes/{id}")
    public Map<String, Object> excluir(@PathVariable String id) {
        SecurityUtils.requireUser();
        Paciente paciente = pacientes.getByCpf(id).orElse(null);
        consultas.deleteByPatient(id, paciente == null ? null : paciente.getTelefone());
        return pacientes.delete(id);
    }
}
