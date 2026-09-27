package com.clinica.bot.dto;

import com.clinica.bot.util.CpfUtils;

public record IncomingMessageDTO(
        String telefone,
        String textoRaw,
        String textoNormalizado,
        boolean useProvider
) {
    public static IncomingMessageDTO of(String telefoneRaw, String textoRaw, boolean useProvider) {
        String telefone = CpfUtils.normalizePhone(telefoneRaw);
        String raw = textoRaw == null ? "" : textoRaw;
        String normalized = raw.trim().toUpperCase();
        return new IncomingMessageDTO(telefone, raw, normalized, useProvider);
    }
}
