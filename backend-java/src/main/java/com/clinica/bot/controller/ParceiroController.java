package com.clinica.bot.controller;

import com.clinica.bot.domain.Parceiro;
import com.clinica.bot.exception.ApiException;
import com.clinica.bot.repository.ParceiroRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequiredArgsConstructor
public class ParceiroController {
    private final ParceiroRepository parceiros;

    @GetMapping("/parceiros/busca")
    public Object buscar(@RequestParam(required = false) Double lat, @RequestParam(required = false) Double lng,
                         @RequestParam(defaultValue = "50") double maxDistanceKm) {
        if (lat == null || lng == null || lat == 0 || lng == 0) return parceiros.listAll().stream().map(parceiros::toApi).toList();
        return parceiros.listNear(lat, lng, maxDistanceKm);
    }

    @PostMapping("/parceiros")
    @ResponseStatus(HttpStatus.CREATED)
    public Map<String, Object> criar(@RequestBody Map<String, Object> body) {
        return parceiros.toApi(parceiros.create(body));
    }

    @GetMapping("/parceiros/{id}")
    public Map<String, Object> detalhes(@PathVariable String id) {
        Parceiro parceiro = parceiros.getById(id).orElseThrow(() -> new ApiException("Parceiro não encontrado", 404));
        return parceiros.toApi(parceiro);
    }
}
