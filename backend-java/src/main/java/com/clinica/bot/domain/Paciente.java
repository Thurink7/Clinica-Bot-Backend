package com.clinica.bot.domain;

import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

@Data
@Document(collection = "pacientes")
public class Paciente {

    @Id
    private String id;
    private String legacyId;
    private String cpf;
    private String nome;
    private String telefone;
    private String dataNascimento;
    private String observacoes;
    private Instant updatedAt;
}
