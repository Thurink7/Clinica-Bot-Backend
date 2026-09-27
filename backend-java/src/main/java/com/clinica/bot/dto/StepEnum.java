package com.clinica.bot.dto;

import java.util.Locale;

public enum StepEnum {
    MENU,
    NOME,
    ESCOLHER_SERVICO,
    ESCOLHER_DATA_SERVICO,
    ESCOLHER_PROFISSIONAL,
    ESCOLHER_HORARIO,
    REAGENDAR_CPF,
    REAGENDAR_NASCIMENTO,
    REAGENDAR_ESCOLHER;

    public String key() {
        return name().toLowerCase(Locale.ROOT);
    }

    public static StepEnum fromKey(String step) {
        if (step == null || step.isBlank()) {
            return MENU;
        }
        String normalized = step.trim().toLowerCase(Locale.ROOT);
        for (StepEnum value : values()) {
            if (value.key().equals(normalized)) {
                return value;
            }
        }
        return MENU;
    }
}
