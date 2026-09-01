package com.clinica.bot.util;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;

public final class DateTimeUtils {

    private static final ZoneId BRAZIL = ZoneId.of("America/Sao_Paulo");
    private static final DateTimeFormatter DATE_FMT = DateTimeFormatter.ofPattern("yyyy-MM-dd");

    private DateTimeUtils() {}

    public static ZonedDateTime combineLocal(String dateStr, String timeStr) {
        LocalDate date = LocalDate.parse(dateStr, DATE_FMT);
        String[] parts = timeStr.split(":");
        int hour = Integer.parseInt(parts[0]);
        int minute = parts.length > 1 ? Integer.parseInt(parts[1]) : 0;
        return ZonedDateTime.of(date.getYear(), date.getMonthValue(), date.getDayOfMonth(),
                hour, minute, 0, 0, BRAZIL);
    }

    public static String toDateStr(LocalDate date) {
        return date.format(DATE_FMT);
    }

    public static String todayDateStr() {
        return LocalDate.now(BRAZIL).format(DATE_FMT);
    }

    public static String formatDateBr(String isoDateStr) {
        if (isoDateStr == null || isoDateStr.length() < 10) {
            return String.valueOf(isoDateStr);
        }
        String[] parts = isoDateStr.substring(0, 10).split("-");
        if (parts.length != 3) return isoDateStr;
        return parts[2] + "/" + parts[1] + "/" + parts[0];
    }

    public static LocalDateTime addMinutes(ZonedDateTime dateTime, int mins) {
        return dateTime.plusMinutes(mins).toLocalDateTime();
    }
}
