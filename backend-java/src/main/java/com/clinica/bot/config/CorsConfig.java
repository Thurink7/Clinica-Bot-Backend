package com.clinica.bot.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.net.URI;
import java.util.List;

@Configuration
public class CorsConfig {

    @Bean
    public CorsConfigurationSource corsConfigurationSource(ClinicaProperties properties) {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowCredentials(false);
        config.setAllowedOriginPatterns(List.of("*"));
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of("*"));

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }

    public static boolean isAllowedOrigin(String origin) {
        if (origin == null || origin.isBlank()) {
            return true;
        }
        try {
            String hostname = URI.create(origin).getHost();
            if ("localhost".equals(hostname) || "127.0.0.1".equals(hostname)) {
                return true;
            }
            return hostname.endsWith(".vercel.app");
        } catch (Exception ignored) {
            return true;
        }
    }
}
