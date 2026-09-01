package com.clinica.bot.controller;

import com.clinica.bot.domain.Contato;
import com.clinica.bot.exception.ApiException;
import com.clinica.bot.repository.ContatoRepository;
import com.clinica.bot.util.CpfUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;
import java.util.regex.Pattern;

@RestController
@RequiredArgsConstructor
public class ContatoController {
    private static final Pattern EMAIL = Pattern.compile("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$");
    private final ContatoRepository contatos;

    @PostMapping("/contato")
    @ResponseStatus(HttpStatus.CREATED)
    public Map<String, Object> criar(@RequestBody Map<String, Object> body) {
        String clinica = text(body.get("nomeClinica")), nome = text(body.get("nomeContato")), email = text(body.get("email"));
        String telefone = CpfUtils.digitsOnly(text(body.get("telefone")));
        if (clinica.isBlank() || nome.isBlank() || email.isBlank() || telefone.isBlank()) throw new ApiException("Preencha nome da clínica, seu nome, e-mail e telefone.", 400);
        email = email.toLowerCase();
        if (!EMAIL.matcher(email).matches()) throw new ApiException("E-mail inválido.", 400);
        Map<String, Object> data = new HashMap<>(body);
        data.put("nomeClinica", clinica); data.put("nomeContato", nome); data.put("email", email); data.put("telefone", telefone);
        Contato contato = contatos.create(data);
        return Map.of("ok", true, "id", contato.getId(), "message", "Recebemos seu contato. Em breve nossa equipe retorna.");
    }
    private static String text(Object value) { return value == null ? "" : String.valueOf(value).trim(); }
}
