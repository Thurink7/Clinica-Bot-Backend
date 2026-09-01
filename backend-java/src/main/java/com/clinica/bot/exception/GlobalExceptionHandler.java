package com.clinica.bot.exception;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.LinkedHashMap;
import java.util.Map;

@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {

    @Value("${spring.profiles.active:}")
    private String activeProfile;

    @ExceptionHandler(ApiException.class)
    public ResponseEntity<Map<String, Object>> handleApi(ApiException ex) {
        log.error("http_error status={} message={}", ex.getStatus(), ex.getMessage());
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("error", ex.getMessage());
        if (isDevelopment()) {
            body.put("stack", ex.getStackTrace().length > 0 ? ex.getStackTrace()[0].toString() : "");
        }
        return ResponseEntity.status(ex.getStatus()).body(body);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, Object>> handleGeneric(Exception ex) {
        log.error("http_error status=500 message={}", ex.getMessage(), ex);
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("error", ex.getMessage() != null ? ex.getMessage() : "Erro interno");
        if (isDevelopment()) {
            body.put("stack", ex.toString());
        }
        return ResponseEntity.internalServerError().body(body);
    }

    private boolean isDevelopment() {
        return activeProfile.contains("dev");
    }
}
