package com.clinica.bot.controller;

import com.clinica.bot.exception.ApiException;
import com.clinica.bot.security.AuthUser;
import com.clinica.bot.security.SecurityUtils;
import com.clinica.bot.service.AuthService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @PostMapping("/auth/login")
    public Map<String, Object> login(@RequestBody Map<String, String> body) {
        return authService.login(body.get("email"), body.get("password"));
    }

    @GetMapping("/auth/me")
    public Map<String, Object> me(@RequestHeader(value = "Authorization", required = false) String authorization) {
        AuthUser user = authService.userFromBearer(authorization);
        if (user == null) throw new ApiException("Sessão inválida ou expirada", 401);
        return Map.of("user", Map.of(
                "id", user.getId(),
                "email", user.getEmail(),
                "nome", user.getNome(),
                "parceiroId", user.getParceiroId()
        ));
    }
}
