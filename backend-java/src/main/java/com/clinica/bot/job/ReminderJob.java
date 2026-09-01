package com.clinica.bot.job;

import com.clinica.bot.service.ReminderService;
import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class ReminderJob {

    private final ReminderService reminderService;

    @Scheduled(cron = "0 */5 * * * *")
    public void runReminders() {
        reminderService.run();
    }
}
