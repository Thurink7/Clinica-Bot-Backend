package com.clinica.bot.controller;

import com.clinica.bot.service.TwilioService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/messages")
@RequiredArgsConstructor
public class TwilioController {

    private final TwilioService twilioService;

    @PostMapping("/send-reminder")
    @ResponseStatus(HttpStatus.ACCEPTED)
    public Map<String, String> sendReminder(@Valid @RequestBody ReminderRequest request) {
        String messageSid = twilioService.sendAppointmentReminder(
                request.toPhoneNumber(), request.date(), request.time());
        return Map.of("messageSid", messageSid, "status", "queued");
    }

    public record ReminderRequest(
            @NotBlank String toPhoneNumber,
            @NotBlank String date,
            @NotBlank String time
    ) {
    }
}
