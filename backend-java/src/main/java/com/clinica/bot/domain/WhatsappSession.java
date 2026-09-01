package com.clinica.bot.domain;

import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;
import java.util.Map;

@Data
@Document(collection = "whatsapp_sessoes")
public class WhatsappSession {

    @Id
    private String id;
    private String telefone;
    private String step;
    private String nomePaciente;
    private Object servicosOfertados;
    private String servicoEscolhido;
    private Object diasOfertados;
    private String dataEscolhida;
    private Object profissionaisOfertados;
    private Object slotsOfertados;
    private Object profissionalEscolhido;
    private String cpfVerificacao;
    private String nascimentoVerificacao;
    private Object consultasReagendar;
    private Instant updatedAt;
}
