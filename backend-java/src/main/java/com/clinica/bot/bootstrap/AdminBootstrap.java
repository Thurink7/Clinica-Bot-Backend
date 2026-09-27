package com.clinica.bot.bootstrap;

import com.clinica.bot.config.ClinicaProperties;
import com.clinica.bot.repository.AdminUserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class AdminBootstrap {

    private final ClinicaProperties properties;
    private final AdminUserRepository adminUserRepo;
    private final PasswordEncoder passwordEncoder;

    @EventListener(ApplicationReadyEvent.class)
    public void ensureBootstrapAdmin() {
        if (!properties.getAdmin().isBootstrapEnabled()) {
            return;
        }
        String email = properties.getAdmin().getBootstrapEmail();
        String password = properties.getAdmin().getBootstrapPassword();
        if (email == null || email.isBlank() || password == null || password.isBlank()) {
            log.warn("bootstrap_admin_skipped: defina ADMIN_BOOTSTRAP_ENABLED=true com email e senha válidos");
            return;
        }
        String normalized = email.trim().toLowerCase();
        if (adminUserRepo.findByEmail(normalized).isPresent()) {
            return;
        }
        String hash = passwordEncoder.encode(password);
        adminUserRepo.create(normalized, hash, properties.getAdmin().getBootstrapNome(), null);
        log.info("bootstrap_admin_created email={}", normalized);
    }
}
