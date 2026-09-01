package com.clinica.bot.util;

import com.clinica.bot.domain.ClinicConfig;

import java.time.LocalDate;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;

public final class SlotsUtils {

    private static final DateTimeFormatter TIME_FMT = DateTimeFormatter.ofPattern("HH:mm");

    private SlotsUtils() {}

    public static List<String> generateSlotsForDay(String dateStr, ClinicConfig cfg) {
        LocalDate date = LocalDate.parse(dateStr);
        int dow = date.getDayOfWeek().getValue() % 7;
        if (cfg.getDiasUteis() == null || !cfg.getDiasUteis().contains(dow)) {
            return List.of();
        }

        String[] openParts = cfg.getOpen().split(":");
        String[] closeParts = cfg.getClose().split(":");
        ZonedDateTime start = DateTimeUtils.combineLocal(dateStr,
                String.format("%02d:%02d", Integer.parseInt(openParts[0]), Integer.parseInt(openParts[1])));
        ZonedDateTime end = DateTimeUtils.combineLocal(dateStr,
                String.format("%02d:%02d", Integer.parseInt(closeParts[0]), Integer.parseInt(closeParts[1])));

        List<String> slots = new ArrayList<>();
        ZonedDateTime cursor = start;
        int step = cfg.getDuracaoMinutos();

        while (cursor.plusMinutes(step).compareTo(end) <= 0) {
            slots.add(cursor.format(TIME_FMT));
            cursor = cursor.plusMinutes(step);
        }
        return slots;
    }

    public static ClinicConfig defaultClinicConfig() {
        ClinicConfig cfg = new ClinicConfig();
        cfg.setOpen("08:00");
        cfg.setClose("18:00");
        cfg.setDuracaoMinutos(30);
        cfg.setDiasUteis(List.of(1, 2, 3, 4, 5));
        return cfg;
    }
}
