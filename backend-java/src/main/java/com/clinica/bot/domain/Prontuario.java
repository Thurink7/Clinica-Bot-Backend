package com.clinica.bot.domain;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "prontuarios")
public class Prontuario {
    @Id
    private String id;
    @Indexed
    private String clienteCpf;
    private String parceiroId;
    private String profissionalId;
    private String diagnostico;
    private String prescricao;
    private List<Object> resultados;
    private String dataProntuario;
    private Instant createdAt;
}
