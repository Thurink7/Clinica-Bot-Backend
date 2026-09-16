package com.clinica.bot.config;

import com.twilio.Twilio;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Configuration;
import org.springframework.util.StringUtils;

/** Initializes the Twilio SDK once, when the application starts. */
@Slf4j
@Configuration
@RequiredArgsConstructor
public class TwilioConfig {

    private final ClinicaProperties properties;

    @PostConstruct
    void initialize() {
        ClinicaProperties.Twilio twilio = properties.getTwilio();
        if (!StringUtils.hasText(twilio.getAccountSid()) || !StringUtils.hasText(twilio.getAuthToken())) {
            throw new IllegalStateException("As credenciais do Twilio devem ser configuradas para iniciar a aplicação.");
        }

        Twilio.init(twilio.getAccountSid(), twilio.getAuthToken());
        log.info("Twilio SDK inicializado para a conta terminada em {}", lastFour(twilio.getAccountSid()));
    }

    private String lastFour(String value) {
        return value.length() <= 4 ? "****" : value.substring(value.length() - 4);
    }
}
