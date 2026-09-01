package com.clinica.bot.security;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class AuthUser {
    private String id;
    private String email;
    private String nome;
    private String parceiroId;
}
