package com.clinica.bot.service;

import com.clinica.bot.config.ClinicaProperties;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestClient;

import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class WhatsappProvider {

    private final ClinicaProperties properties;
    private final RestClient restClient = RestClient.create();

    public Map<String, Object> sendText(String toPhoneE164, String body) {
        var tw = properties.getTwilio();
        if (!tw.getAccountSid().isBlank() && !tw.getAuthToken().isBlank() && !tw.getWhatsappFrom().isBlank()) {
            return sendTwilio(toPhoneE164, body);
        }
        var wa = properties.getWhatsapp();
        if (!wa.getApiUrl().isBlank() && !wa.getAccessToken().isBlank() && !wa.getPhoneNumberId().isBlank()) {
            return sendMeta(toPhoneE164, body);
        }
        log.info("whatsapp_mock_send to={} body={}", toPhoneE164, body.length() > 200 ? body.substring(0, 200) : body);
        return Map.of("ok", true, "mock", true);
    }

    private Map<String, Object> sendTwilio(String toPhoneE164, String body) {
        var tw = properties.getTwilio();
        String toDigits = toPhoneE164.replaceAll("\\D", "");
        String to = "whatsapp:+" + toDigits;
        String from = tw.getWhatsappFrom().startsWith("whatsapp:") ? tw.getWhatsappFrom() : "whatsapp:" + tw.getWhatsappFrom();
        String auth = Base64.getEncoder().encodeToString((tw.getAccountSid() + ":" + tw.getAuthToken()).getBytes(StandardCharsets.UTF_8));

        MultiValueMap<String, String> params = new LinkedMultiValueMap<>();
        params.add("From", from);
        params.add("To", to);
        params.add("Body", body);

        ResponseEntity<String> res = restClient.post()
                .uri("https://api.twilio.com/2010-04-01/Accounts/" + tw.getAccountSid() + "/Messages.json")
                .header(HttpHeaders.AUTHORIZATION, "Basic " + auth)
                .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                .body(params)
                .retrieve()
                .toEntity(String.class);

        if (!res.getStatusCode().is2xxSuccessful()) {
            log.error("twilio_send_failed status={} body={}", res.getStatusCode(), res.getBody());
            throw new RuntimeException("Twilio API: " + res.getStatusCode());
        }
        return Map.of("ok", true);
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> sendMeta(String toPhoneE164, String body) {
        var wa = properties.getWhatsapp();
        String normalized = toPhoneE164.replaceAll("\\D", "");
        String url = wa.getApiUrl().replaceAll("/$", "") + "/" + wa.getPhoneNumberId() + "/messages";

        Map<String, Object> payload = Map.of(
                "messaging_product", "whatsapp",
                "to", normalized,
                "type", "text",
                "text", Map.of("body", body)
        );

        ResponseEntity<Map> res = restClient.post()
                .uri(url)
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + wa.getAccessToken())
                .contentType(MediaType.APPLICATION_JSON)
                .body(payload)
                .retrieve()
                .toEntity(Map.class);

        if (!res.getStatusCode().is2xxSuccessful()) {
            throw new RuntimeException("WhatsApp API: " + res.getStatusCode());
        }
        return res.getBody() != null ? res.getBody() : Map.of("ok", true);
    }
}
