package com.clinica.bot.service;

import com.clinica.bot.domain.Consulta;
import com.clinica.bot.domain.Profissional;
import com.clinica.bot.repository.PacienteRepository;
import com.clinica.bot.repository.SessionRepository;
import com.clinica.bot.util.CpfUtils;
import com.clinica.bot.util.DateTimeUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Slf4j
@Service
@RequiredArgsConstructor
public class WhatsappFlowService {

    private static final String MENU = """
            Olá! Sou o assistente da clínica.
            1 — Agendar consulta
            2 — Falar com atendente
            3 — Reagendar consulta
            
            Responda com o número da opção.""";

    private final SessionRepository sessions;
    private final ConsultaService consultas;
    private final ProfessionalService professionals;
    private final PacienteRepository pacientes;
    private final WhatsappProvider whatsappProvider;

    @Async
    public void handleIncomingAsync(String telefoneRaw, String textoRaw, boolean useProvider) {
        handleIncoming(telefoneRaw, textoRaw, useProvider);
    }

    public Map<String, Object> handleIncoming(String telefoneRaw, String textoRaw, boolean useProvider) {
        String telefone = CpfUtils.normalizePhone(telefoneRaw);
        String text = String.valueOf(textoRaw == null ? "" : textoRaw).trim().toUpperCase();

        Matcher confirm = Pattern.compile("^CONFIRMAR\\s+(\\S+)").matcher(text);
        Matcher cancel = Pattern.compile("^CANCELAR\\s+(\\S+)").matcher(text);
        Matcher reag = Pattern.compile("^REAGENDAR\\s+(\\S+)").matcher(text);

        if (confirm.find()) {
            consultas.atualizarStatus(confirm.group(1), "confirmado");
            respond(telefone, "Consulta confirmada. Obrigado!", useProvider);
            return Map.of("ok", true);
        }
        if (cancel.find()) {
            consultas.cancelar(cancel.group(1));
            respond(telefone, "Consulta cancelada. O horário foi liberado.", useProvider);
            return Map.of("ok", true);
        }
        if (reag.find()) {
            consultas.cancelar(reag.group(1));
            sessions.set(telefone, Map.of("step", "menu"));
            respond(telefone, "Consulta anterior cancelada para reagendamento. " + MENU, useProvider);
            return Map.of("ok", true);
        }

        Map<String, Object> session = sessions.get(telefone).orElse(new HashMap<>(Map.of("step", "menu")));

        if ("menu".equals(session.get("step")) && "3".equals(text)) {
            sessions.set(telefone, Map.of("step", "reagendar_cpf"));
            respond(telefone, "Para reagendar com segurança, informe seu CPF (somente números, 11 dígitos, sem pontos ou traços):", useProvider);
            return Map.of("ok", true);
        }

        if ("reagendar_cpf".equals(session.get("step"))) {
            var v = CpfUtils.validateCpf(textoRaw);
            if (!v.ok()) {
                respond(telefone, v.message() + " Tente novamente ou envie MENU para voltar.", useProvider);
                return Map.of("ok", true);
            }
            Map<String, Object> next = new HashMap<>(session);
            next.put("step", "reagendar_nascimento");
            next.put("cpfVerificacao", v.digits());
            sessions.set(telefone, next);
            respond(telefone, "Informe sua data de nascimento no formato DD/MM/AAAA (ex.: 08/03/1985):", useProvider);
            return Map.of("ok", true);
        }

        if ("reagendar_nascimento".equals(session.get("step"))) {
            var p = CpfUtils.parseBirthDateBr(textoRaw);
            if (!p.ok()) {
                respond(telefone, p.message() + " Tente novamente ou envie MENU.", useProvider);
                return Map.of("ok", true);
            }
            var cad = pacientes.getByTelefone(telefone);
            if (cad.isPresent() && cad.get().getCpf() != null && cad.get().getDataNascimento() != null) {
                if (!cad.get().getCpf().equals(session.get("cpfVerificacao")) || !cad.get().getDataNascimento().equals(p.iso())) {
                    respond(telefone, "CPF ou data de nascimento não conferem com o cadastro da clínica. Confira os dados e tente novamente ou envie MENU.", useProvider);
                    return Map.of("ok", true);
                }
            }
            List<Consulta> lista = consultas.listarConsultasReagendar(telefone);
            if (lista.isEmpty()) {
                respond(telefone, "Não encontramos consultas futuras para este número. Para um novo agendamento, responda 1. Para voltar ao menu, envie MENU.", useProvider);
                sessions.set(telefone, Map.of("step", "menu"));
                return Map.of("ok", true);
            }
            StringBuilder lines = new StringBuilder();
            for (int i = 0; i < lista.size(); i++) {
                Consulta c = lista.get(i);
                lines.append(i + 1).append(" — ").append(DateTimeUtils.formatDateBr(c.getData()))
                        .append(" às ").append(c.getHora()).append(" (").append(c.getNomePaciente()).append(")\n");
            }
            respond(telefone, "Escolha qual consulta deseja liberar para reagendamento (responda o número):\n" + lines, useProvider);
            Map<String, Object> next = new HashMap<>(session);
            next.put("step", "reagendar_escolher");
            next.put("consultasReagendar", lista);
            next.put("nascimentoVerificacao", p.iso());
            sessions.set(telefone, next);
            return Map.of("ok", true);
        }

        if ("reagendar_escolher".equals(session.get("step")) && session.get("consultasReagendar") instanceof List<?> list) {
            int idx = parseIntSafe(text);
            if (idx < 1 || idx > list.size()) {
                respond(telefone, "Número inválido. Escolha uma opção da lista ou envie MENU.", useProvider);
                return Map.of("ok", true);
            }
            Consulta c = (Consulta) list.get(idx - 1);
            consultas.cancelar(c.getId());
            sessions.set(telefone, Map.of("step", "menu"));
            respond(telefone, "A consulta de " + DateTimeUtils.formatDateBr(c.getData()) + " às " + c.getHora() + " foi cancelada para liberar reagendamento. " + MENU, useProvider);
            return Map.of("ok", true);
        }

        if ("1".equals(text) || (text.contains("AGENDAR") && !text.contains("REAGENDAR"))) {
            sessions.set(telefone, Map.of("step", "nome"));
            respond(telefone, "Informe seu nome completo:", useProvider);
            return Map.of("ok", true);
        }

        if ("2".equals(text) || text.contains("ATENDENTE")) {
            sessions.set(telefone, Map.of("step", "menu"));
            respond(telefone, "Encaminhamos para um atendente humano. Para voltar ao menu, envie qualquer mensagem.", useProvider);
            return Map.of("ok", true);
        }

        if ("nome".equals(session.get("step")) && !text.isBlank() && !Set.of("1", "2", "3").contains(text)) {
            List<String> servicos = professionals.listarServicos();
            if (servicos.isEmpty()) {
                respond(telefone, "Nenhum serviço cadastrado no momento. Peça ao atendente para cadastrar os profissionais/serviços.", useProvider);
                return Map.of("ok", true);
            }
            StringBuilder lines = new StringBuilder("Qual serviço médico você deseja?\n");
            for (int i = 0; i < servicos.size(); i++) lines.append(i + 1).append(" — ").append(servicos.get(i)).append("\n");
            Map<String, Object> next = new HashMap<>();
            next.put("step", "escolher_servico");
            next.put("nomePaciente", textoRaw.trim());
            next.put("servicosOfertados", servicos);
            sessions.set(telefone, next);
            respond(telefone, lines.toString(), useProvider);
            return Map.of("ok", true);
        }

        if ("escolher_servico".equals(session.get("step")) && session.get("servicosOfertados") instanceof List<?> servList) {
            int si = parseIntSafe(text);
            if (si >= 1 && si <= servList.size()) {
                String chosen = String.valueOf(servList.get(si - 1));
                List<Map<String, Object>> dias = consultas.proximosSlotsResumo(5, null);
                if (dias.isEmpty()) {
                    respond(telefone, "Sem horários nos próximos dias. Tente mais tarde.", useProvider);
                    return Map.of("ok", true);
                }
                StringBuilder lines = new StringBuilder("Serviço escolhido: " + chosen + "\n\nPróximos dias úteis com horários — escolha o dia pelo número:\n");
                for (int i = 0; i < dias.size(); i++) {
                    String br = DateTimeUtils.formatDateBr(String.valueOf(dias.get(i).get("data")));
                    String[] parts = br.split("/");
                    lines.append(i + 1).append(" — DIA ").append(parts[0]).append(", MÊS ").append(parts[1]).append(" e ANO ").append(parts[2]).append("\n");
                }
                Map<String, Object> next = new HashMap<>();
                next.put("step", "escolher_data_servico");
                next.put("nomePaciente", session.get("nomePaciente"));
                next.put("servicoEscolhido", chosen);
                next.put("diasOfertados", dias);
                sessions.set(telefone, next);
                respond(telefone, lines + "\nDigite MAISDIAS para carregar mais dias úteis.", useProvider);
                return Map.of("ok", true);
            }
        }

        if ("escolher_horario".equals(session.get("step")) && session.get("slotsOfertados") instanceof List<?> slots && session.get("dataEscolhida") != null) {
            int idx = parseIntSafe(text);
            if (idx >= 1 && idx <= slots.size()) {
                @SuppressWarnings("unchecked")
                Map<String, Object> slot = (Map<String, Object>) slots.get(idx - 1);
                String hora = String.valueOf(slot.get("hora"));
                try {
                    Map<String, Object> body = new HashMap<>();
                    body.put("nomePaciente", session.get("nomePaciente"));
                    body.put("telefone", telefone);
                    body.put("data", session.get("dataEscolhida"));
                    body.put("hora", hora);
                    if (session.get("profissionalEscolhido") instanceof Map<?, ?> prof) {
                        body.put("profissionalId", prof.get("id"));
                    }
                    body.put("servico", session.get("servicoEscolhido"));
                    Consulta created = consultas.agendar(body, useProvider);
                    sessions.clear(telefone);
                    String br = DateTimeUtils.formatDateBr(created.getData());
                    String[] parts = br.split("/");
                    respond(telefone, "Consulta agendada para DIA " + parts[0] + ", MÊS " + parts[1] + " e ANO " + parts[2]
                            + " às " + created.getHora() + ". Para cancelar, responda CANCELAR " + created.getId(), useProvider);
                } catch (Exception e) {
                    respond(telefone, "Não foi possível agendar: " + e.getMessage(), useProvider);
                }
                return Map.of("ok", true);
            }
        }

        if ("MENU".equals(text)) {
            respond(telefone, MENU, useProvider);
            sessions.set(telefone, Map.of("step", "menu"));
            return Map.of("ok", true);
        }

        respond(telefone, MENU, useProvider);
        sessions.set(telefone, Map.of("step", "menu"));
        return Map.of("ok", true);
    }

    private void respond(String telefone, String message, boolean useProvider) {
        if (useProvider) {
            try {
                whatsappProvider.sendText(telefone, message);
            } catch (Exception e) {
                log.error("whatsapp_send_error: {}", e.getMessage());
            }
        }
    }

    private static int parseIntSafe(String text) {
        try { return Integer.parseInt(text.trim()); } catch (Exception e) { return -1; }
    }
}
