package com.clinica.bot.service;

import com.clinica.bot.config.ClinicaProperties;
import com.clinica.bot.domain.Consulta;
import com.clinica.bot.repository.ConsultaRepository;
import com.clinica.bot.util.DateTimeUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class ReminderService {

    private final ConsultaRepository consultaRepo;
    private final WhatsappProvider whatsappProvider;
    private final ClinicaProperties properties;

    public Map<String, Object> run() {
        long now = System.currentTimeMillis();
        long w = properties.getReminder().getWindowMinutes() * 60L * 1000L;
        List<Consulta> list = consultaRepo.listAllForReminders();
        int sent = 0;

        long h24 = 24L * 60 * 60 * 1000;
        long h3 = 3L * 60 * 60 * 1000;

        for (Consulta c : list) {
            long dt = DateTimeUtils.combineLocal(c.getData(), c.getHora()).toInstant().toEpochMilli();
            long until = dt - now;

            if (!Boolean.TRUE.equals(c.getReminder24hSent()) && until <= h24 + w && until >= h24 - w) {
                send(c, "24h", "Lembrete: sua consulta é em 24h (" + c.getData() + " " + c.getHora()
                        + "). Responda CONFIRMAR " + c.getId() + ", CANCELAR " + c.getId() + " ou REAGENDAR " + c.getId());
                sent++;
            } else if (!Boolean.TRUE.equals(c.getReminder3hSent()) && until <= h3 + w && until >= h3 - w) {
                send(c, "3h", "Lembrete: sua consulta é em 3h (" + c.getData() + " " + c.getHora()
                        + "). Responda CONFIRMAR " + c.getId() + ", CANCELAR " + c.getId() + " ou REAGENDAR " + c.getId());
                sent++;
            }
        }

        log.info("reminder_job_done checked={} sent={}", list.size(), sent);
        return Map.of("checked", list.size(), "sent", sent);
    }

    private void send(Consulta consulta, String kind, String text) {
        try {
            whatsappProvider.sendText(consulta.getTelefone(), text);
            Map<String, Object> patch = new HashMap<>();
            patch.put("24h".equals(kind) ? "reminder24hSent" : "reminder3hSent", true);
            consultaRepo.update(consulta.getId(), patch);
        } catch (Exception e) {
            log.error("reminder_send_error id={} kind={} message={}", consulta.getId(), kind, e.getMessage());
        }
    }
}
