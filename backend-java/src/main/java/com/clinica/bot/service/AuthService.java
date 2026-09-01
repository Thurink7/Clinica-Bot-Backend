package com.clinica.bot.service;

import com.clinica.bot.exception.ApiException;
import com.clinica.bot.repository.firestore.AdminUserFirestoreRepository;
import com.clinica.bot.security.AuthUser;
import com.clinica.bot.security.JwtService;
import io.jsonwebtoken.Claims;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.Map;
import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
public class AuthService {

    private static final Pattern BEARER = Pattern.compile("^Bearer\\s+(.+)$", Pattern.CASE_INSENSITIVE);

    private final AdminUserFirestoreRepository adminUserRepo;
    private final JwtService jwtService;
    private final PasswordEncoder passwordEncoder;

    public Map<String, Object> login(String emailRaw, String passwordRaw) {
        String email = String.valueOf(emailRaw == null ? "" : emailRaw).trim().toLowerCase();
        String password = String.valueOf(passwordRaw == null ? "" : passwordRaw);
        if (email.isBlank() || password.isBlank()) {
            throw new ApiException("E-mail e senha são obrigatórios", 400);
        }

        var user = adminUserRepo.findByEmail(email)
                .orElseThrow(() -> new ApiException("E-mail ou senha incorretos", 401));

        if (user.getPasswordHash() == null || !passwordEncoder.matches(password, user.getPasswordHash())) {
            throw new ApiException("E-mail ou senha incorretos", 401);
        }

        String token = jwtService.generateToken(user.getId(), user.getEmail(), user.getParceiroId());
        Map<String, Object> userMap = new HashMap<>();
        userMap.put("id", user.getId());
        userMap.put("email", user.getEmail());
        userMap.put("nome", user.getNome());
        userMap.put("parceiroId", user.getParceiroId());

        return Map.of("token", token, "user", userMap);
    }

    public AuthUser userFromBearer(String authHeader) {
        if (authHeader == null || authHeader.isBlank()) return null;
        var m = BEARER.matcher(authHeader);
        if (!m.find()) return null;
        try {
            Claims claims = jwtService.parseToken(m.group(1));
            String id = claims.getSubject();
            if (id == null) return null;
            return adminUserRepo.getById(id)
                    .map(u -> AuthUser.builder()
                            .id(u.getId())
                            .email(u.getEmail())
                            .nome(u.getNome())
                            .parceiroId(u.getParceiroId() != null ? u.getParceiroId() : str(claims.get("parceiroId")))
                            .build())
                    .orElse(null);
        } catch (Exception e) {
            return null;
        }
    }

    private static String str(Object o) { return o == null ? null : String.valueOf(o); }
}
