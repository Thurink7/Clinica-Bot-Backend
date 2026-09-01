package com.clinica.bot.domain;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "users")
public class AdminUser {
    @Id
    private String id;
    private String legacyId;
    @Indexed
    private String email;
    private String passwordHash;
    private String nome;
    private String parceiroId;
    private Instant createdAt;
}
