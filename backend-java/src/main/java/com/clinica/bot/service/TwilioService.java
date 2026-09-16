package com.clinica.bot.service;

import com.clinica.bot.config.ClinicaProperties;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.twilio.rest.api.v2010.account.Message;
import com.twilio.type.PhoneNumber;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class TwilioService {

    private static final String APPOINTMENT_REMINDER_CONTENT_SID = "HXb5b62575e6e4ff6129ad7c8efe1f983e";

    private final ClinicaProperties properties;
    private final ObjectMapper objectMapper;

    /**
     * Sends the approved WhatsApp appointment-reminder content template.
     *
     * @return Twilio's message SID, useful for auditing and support.
     */
    public String sendAppointmentReminder(String toPhoneNumber, String date, String time) {
        String to = toWhatsappAddress(toPhoneNumber);
        String from = toWhatsappAddress(properties.getTwilio().getWhatsappFrom());
        String contentVariables = contentVariables(date, time);

        try {
            Message message = Message.creator(new PhoneNumber(to), new PhoneNumber(from), (String) null)
                    .setContentSid(APPOINTMENT_REMINDER_CONTENT_SID)
                    .setContentVariables(contentVariables)
                    .create();

            log.info("Lembrete de consulta enviado via Twilio. messageSid={}, to={}", message.getSid(), to);
            return message.getSid();
        } catch (com.twilio.exception.ApiException exception) {
            log.error("Falha ao enviar lembrete via Twilio. status={}, code={}, to={}, message={}",
                    exception.getStatusCode(), exception.getCode(), to, exception.getMessage());
            throw new com.clinica.bot.exception.ApiException(
                    "Não foi possível enviar o lembrete pelo WhatsApp.", 502);
        }
    }

    private String contentVariables(String date, String time) {
        try {
            return objectMapper.writeValueAsString(Map.of("1", date, "2", time));
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("Não foi possível montar as variáveis do template Twilio.", exception);
        }
    }

    private String toWhatsappAddress(String phoneNumber) {
        if (!StringUtils.hasText(phoneNumber)) {
            throw new com.clinica.bot.exception.ApiException("O número de telefone é obrigatório.", 400);
        }

        String normalized = phoneNumber.trim();
        if (normalized.regionMatches(true, 0, "whatsapp:", 0, "whatsapp:".length())) {
            normalized = normalized.substring("whatsapp:".length());
        }
        String digits = normalized.replaceAll("\\D", "");
        if (digits.isBlank()) {
            throw new com.clinica.bot.exception.ApiException("O número de telefone é inválido.", 400);
        }
        return "whatsapp:+" + digits;
    }
}
