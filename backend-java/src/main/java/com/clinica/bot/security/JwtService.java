package com.clinica.bot.security;

import com.clinica.bot.config.ClinicaProperties;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import lombok.RequiredArgsConstructor;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Arrays;
import java.util.Date;

@Service
@RequiredArgsConstructor
public class JwtService {

    private final ClinicaProperties properties;
    private final Environment environment;

    public String generateToken(String userId, String email, String parceiroId) {
        Instant now = Instant.now();
        Instant exp = now.plus(properties.getJwt().getExpirationDays(), ChronoUnit.DAYS);
        return Jwts.builder()
                .subject(userId)
                .claim("email", email)
                .claim("parceiroId", parceiroId)
                .issuedAt(Date.from(now))
                .expiration(Date.from(exp))
                .signWith(secretKey())
                .compact();
    }

    public Claims parseToken(String token) {
        return Jwts.parser()
                .verifyWith(secretKey())
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    private SecretKey secretKey() {
        String secret = properties.getJwt().getSecret();
        if (secret == null || secret.isBlank()) {
            boolean prod = Arrays.asList(environment.getActiveProfiles()).contains("prod")
                    || "production".equalsIgnoreCase(environment.getProperty("NODE_ENV", ""));
            if (prod) {
                throw new IllegalStateException("JWT_SECRET obrigatório em produção");
            }
            secret = "dev-only-insecure-jwt-secret-change-me";
        }
        byte[] bytes = secret.getBytes(StandardCharsets.UTF_8);
        if (bytes.length < 32) {
            bytes = java.util.Arrays.copyOf(bytes, 32);
        }
        return Keys.hmacShaKeyFor(bytes);
    }
}
