package com.clinica.bot.controller;

import com.clinica.bot.domain.Profissional;
import com.clinica.bot.security.SecurityUtils;
import com.clinica.bot.service.ProfessionalService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequiredArgsConstructor
public class ProfessionalController {

    private final ProfessionalService service;

    @PostMapping("/profissionais")
    @ResponseStatus(HttpStatus.CREATED)
    public Profissional create(@RequestBody Map<String, Object> body) {
        SecurityUtils.requireUser();
        return service.cadastrar(body);
    }

    @GetMapping("/profissionais")
    public List<Profissional> list() {
        return service.listar();
    }

    @PatchMapping("/profissionais/{id}/ativo")
    public Profissional patchAtivo(@PathVariable String id, @RequestBody Map<String, Object> body) {
        SecurityUtils.requireUser();
        return service.atualizarAtivo(id, body.get("ativo") instanceof Boolean b ? b : null);
    }

    @DeleteMapping("/profissionais/{id}")
    public Map<String, Object> delete(@PathVariable String id) {
        SecurityUtils.requireUser();
        return service.excluir(id);
    }

    @GetMapping("/servicos")
    public List<String> servicos() {
        return service.listarServicos();
    }
}
