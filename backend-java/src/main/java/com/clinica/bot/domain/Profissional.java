package com.clinica.bot.domain;

import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;
import java.util.List;

@Data
@Document(collection = "profissionais")
public class Profissional {

    @Id
    private String id;
    private String legacyId;
    private String nome;
    private String especialidade;
    private String telefone;
    private String email;
    private List<String> servicos;
    private Boolean ativo;
    private List<Integer> diasTrabalho;
    private Instant createdAt;
}
