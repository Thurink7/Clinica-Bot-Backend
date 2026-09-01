package com.clinica.bot.domain;

import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;
import java.util.List;

@Data
@Document(collection = "consultas")
public class Consulta {

    @Id
    private String id;
    private String legacyId;
    private String nomePaciente;
    private String telefone;
    private String cpf;
    private String dataNascimento;
    private String parceiroId;
    private String data;
    private String hora;
    private String profissionalId;
    private String servico;
    private String status;
    private Boolean reminder24hSent;
    private Boolean reminder3hSent;
    private Instant createdAt;
}
