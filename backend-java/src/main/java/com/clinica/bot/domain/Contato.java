package com.clinica.bot.domain;

import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

@Data
@Document(collection = "contatos")
public class Contato {

    @Id
    private String id;
    private String legacyId;
    private String nomeClinica;
    private String nomeContato;
    private String email;
    private String telefone;
    private String cidade;
    private String mensagem;
    private String status;
    private Instant createdAt;
}
