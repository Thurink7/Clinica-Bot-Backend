package com.clinica.bot.controller;

import com.clinica.bot.config.ClinicaProperties;
import com.clinica.bot.service.WhatsappFlowService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequiredArgsConstructor
public class WebhookController {

    private static final String EMPTY_TWIML = "<?xml version=\"1.0\" encoding=\"UTF-8\"?><Response></Response>";

    private final WhatsappFlowService flow;
    private final ClinicaProperties properties;

    @PostMapping("/webhook-whatsapp")
    public ResponseEntity<String> meta(@RequestBody(required = false) Map<String, Object> body) {
        Map<String, String> message = parseMeta(body);
        if (message == null && body != null && body.get("from") != null) {
            message = Map.of(
                    "from", String.valueOf(body.get("from")),
                    "text", String.valueOf(body.getOrDefault("message", ""))
            );
        }
        if (message != null) {
            flow.handleIncomingAsync(message.get("from"), message.get("text"), true);
        }
        return ResponseEntity.ok("OK");
    }

    /**
     * Twilio sends WhatsApp webhooks as application/x-www-form-urlencoded.
     * Do not use @RequestBody here: it would try to consume the same form payload.
     */
    @PostMapping(
            value = "/webhook",
            consumes = MediaType.APPLICATION_FORM_URLENCODED_VALUE,
            produces = MediaType.TEXT_XML_VALUE
    )
    public ResponseEntity<String> twilio(
            @RequestParam("From") String from,
            @RequestParam(value = "Body", defaultValue = "") String text
    ) {
        String phone = from.replaceFirst("(?i)^whatsapp:", "");
        flow.handleIncomingAsync(phone, text, true);

        return ResponseEntity.ok()
                .contentType(MediaType.TEXT_XML)
                .body(EMPTY_TWIML);
    }

    @GetMapping("/webhook-whatsapp")
    public ResponseEntity<String> verify(@RequestParam(name = "hub.mode", required = false) String mode,
                                         @RequestParam(name = "hub.verify_token", required = false) String token,
                                         @RequestParam(name = "hub.challenge", required = false) String challenge) {
        return "subscribe".equals(mode) && token != null && token.equals(properties.getWhatsapp().getVerifyToken())
                ? ResponseEntity.ok(challenge == null ? "" : challenge) : ResponseEntity.status(403).build();
    }

    @SuppressWarnings("unchecked")
    private Map<String, String> parseMeta(Map<String, Object> body) {
        try {
            var entry = (Map<String, Object>) ((java.util.List<?>) body.get("entry")).get(0);
            var change = (Map<String, Object>) ((java.util.List<?>) entry.get("changes")).get(0);
            var value = (Map<String, Object>) change.get("value");
            var msg = (Map<String, Object>) ((java.util.List<?>) value.get("messages")).get(0);
            String text = "";
            if ("text".equals(msg.get("type"))) {
                text = String.valueOf(((Map<?, ?>) msg.get("text")).get("body"));
            }
            return Map.of("from", String.valueOf(msg.get("from")), "text", text);
        } catch (Exception ignored) {
            return null;
        }
    }
}
