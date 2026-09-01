package com.clinica.bot.domain;

import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.util.List;

@Data
@Document(collection = "configuracoes")
public class ClinicConfig {

    @Id
    private String id;
    private String open;
    private String close;
    private Integer duracaoMinutos;
    private List<Integer> diasUteis;
}
