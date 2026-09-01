package com.clinica.bot.util;

import java.util.Optional;
import java.util.regex.Pattern;

public final class CpfUtils {

    private static final Pattern REPEATED = Pattern.compile("(\\d)\\1{10}");

    private CpfUtils() {}

    public record ValidationResult(boolean ok, String digits, String message) {
        public static ValidationResult success(String digits) {
            return new ValidationResult(true, digits, null);
        }

        public static ValidationResult failure(String message) {
            return new ValidationResult(false, null, message);
        }
    }

    public record BirthDateResult(boolean ok, String iso, String message) {}

    public static ValidationResult validateCpf(String cpfRaw) {
        String d = String.valueOf(cpfRaw == null ? "" : cpfRaw).replaceAll("\\D", "");
        if (d.length() != 11) {
            return ValidationResult.failure("O CPF deve ter 11 dígitos.");
        }
        if (REPEATED.matcher(d).matches()) {
            return ValidationResult.failure("CPF inválido (sequência repetida).");
        }
        int sum = 0;
        for (int i = 0; i < 9; i++) {
            sum += Character.getNumericValue(d.charAt(i)) * (10 - i);
        }
        int r = (sum * 10) % 11;
        if (r == 10) r = 0;
        if (r != Character.getNumericValue(d.charAt(9))) {
            return ValidationResult.failure("CPF inválido (dígito verificador).");
        }
        sum = 0;
        for (int i = 0; i < 10; i++) {
            sum += Character.getNumericValue(d.charAt(i)) * (11 - i);
        }
        r = (sum * 10) % 11;
        if (r == 10) r = 0;
        if (r != Character.getNumericValue(d.charAt(10))) {
            return ValidationResult.failure("CPF inválido (dígito verificador).");
        }
        return ValidationResult.success(d);
    }

    public static BirthDateResult parseBirthDateBr(String text) {
        String t = String.valueOf(text == null ? "" : text).trim();
        var m = Pattern.compile("^(\\d{1,2})/(\\d{1,2})/(\\d{4})$").matcher(t);
        if (!m.matches()) {
            return new BirthDateResult(false, null,
                    "Use a data de nascimento no formato DD/MM/AAAA (ex.: 05/12/1990).");
        }
        int day = Integer.parseInt(m.group(1));
        int month = Integer.parseInt(m.group(2));
        int year = Integer.parseInt(m.group(3));
        if (month < 1 || month > 12) {
            return new BirthDateResult(false, null, "Mês inválido na data de nascimento.");
        }
        if (day < 1 || day > 31) {
            return new BirthDateResult(false, null, "Dia inválido na data de nascimento.");
        }
        var dt = java.time.LocalDate.of(year, month, day);
        if (dt.getDayOfMonth() != day || dt.getMonthValue() != month || dt.getYear() != year) {
            return new BirthDateResult(false, null, "Data de nascimento inexistente (verifique dia/mês/ano).");
        }
        if (dt.isAfter(java.time.LocalDate.now())) {
            return new BirthDateResult(false, null, "A data de nascimento não pode ser no futuro.");
        }
        long ageYears = java.time.temporal.ChronoUnit.YEARS.between(dt, java.time.LocalDate.now());
        if (ageYears > 130) {
            return new BirthDateResult(false, null, "Data de nascimento improvável.");
        }
        String iso = String.format("%04d-%02d-%02d", year, month, day);
        return new BirthDateResult(true, iso, null);
    }

    public static String digitsOnly(String raw) {
        return String.valueOf(raw == null ? "" : raw).replaceAll("\\D", "");
    }

    public static String generateLegacyId() {
        byte[] bytes = new byte[10];
        new java.security.SecureRandom().nextBytes(bytes);
        StringBuilder sb = new StringBuilder(20);
        for (byte b : bytes) {
            sb.append(String.format("%02x", b));
        }
        return sb.substring(0, 20);
    }

    public static String normalizePhone(String raw) {
        String d = digitsOnly(raw);
        if (d.length() <= 11) {
            return "55" + d;
        }
        return d;
    }
}
