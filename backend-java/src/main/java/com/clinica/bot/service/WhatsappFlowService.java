package com.clinica.bot.service;

import com.clinica.bot.domain.Consulta;
import com.clinica.bot.domain.Profissional;
import com.clinica.bot.dto.IncomingMessageDTO;
import com.clinica.bot.dto.SessionContext;
import com.clinica.bot.dto.StepEnum;
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

    private static final int HORARIOS_POR_BLOCO = 20;

    private static final String MENU = """
            Olá! Sou o assistente da clínica.
            1 — Agendar consulta
            2 — Falar com atendente
            3 — Reagendar consulta
            
            Responda com o número da opção.""";

    private static final Pattern CONFIRMAR = Pattern.compile("^CONFIRMAR\\s+(\\S+)");
    private static final Pattern CANCELAR = Pattern.compile("^CANCELAR\\s+(\\S+)");
    private static final Pattern REAGENDAR = Pattern.compile("^REAGENDAR\\s+(\\S+)");

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
        IncomingMessageDTO msg = IncomingMessageDTO.of(telefoneRaw, textoRaw, useProvider);

        if (handleGlobalCommands(msg)) {
            return Map.of("ok", true);
        }

        SessionContext ctx = sessions.get(msg.telefone())
                .map(SessionContext::fromMap)
                .orElseGet(SessionContext::menu);

        if (ctx.getStep() == StepEnum.MENU && "3".equals(msg.textoNormalizado())) {
            ctx.setStep(StepEnum.REAGENDAR_CPF);
            save(msg.telefone(), ctx);
            respond(msg, "Para reagendar com segurança, informe seu CPF (somente números, 11 dígitos, sem pontos ou traços):");
            return Map.of("ok", true);
        }

        if ("MENU".equals(msg.textoNormalizado())) {
            resetToMenu(msg);
            return Map.of("ok", true);
        }

        return switch (ctx.getStep()) {
            case REAGENDAR_CPF -> handleReagendarCpf(msg, ctx);
            case REAGENDAR_NASCIMENTO -> handleReagendarNascimento(msg, ctx);
            case REAGENDAR_ESCOLHER -> handleReagendarEscolher(msg, ctx);
            case NOME -> handleNome(msg, ctx);
            case ESCOLHER_SERVICO -> handleEscolherServico(msg, ctx);
            case ESCOLHER_DATA_SERVICO -> handleEscolherDataServico(msg, ctx);
            case ESCOLHER_PROFISSIONAL -> handleEscolherProfissional(msg, ctx);
            case ESCOLHER_HORARIO -> handleEscolherHorario(msg, ctx);
            case MENU -> handleMenu(msg, ctx);
        };
    }

    private boolean handleGlobalCommands(IncomingMessageDTO msg) {
        Matcher confirm = CONFIRMAR.matcher(msg.textoNormalizado());
        if (confirm.find()) {
            consultas.atualizarStatus(confirm.group(1), "confirmado");
            respond(msg, "Consulta confirmada. Obrigado!");
            return true;
        }
        Matcher cancel = CANCELAR.matcher(msg.textoNormalizado());
        if (cancel.find()) {
            consultas.cancelar(cancel.group(1));
            respond(msg, "Consulta cancelada. O horário foi liberado.");
            return true;
        }
        Matcher reag = REAGENDAR.matcher(msg.textoNormalizado());
        if (reag.find()) {
            consultas.cancelar(reag.group(1));
            sessions.set(msg.telefone(), SessionContext.menu().toMap());
            respond(msg, "Consulta anterior cancelada para reagendamento. " + MENU);
            return true;
        }
        return false;
    }

    private Map<String, Object> handleMenu(IncomingMessageDTO msg, SessionContext ctx) {
        if ("1".equals(msg.textoNormalizado()) || wantsAgendar(msg.textoNormalizado())) {
            ctx.setStep(StepEnum.NOME);
            save(msg.telefone(), ctx);
            respond(msg, "Informe seu nome completo:");
            return Map.of("ok", true);
        }
        if ("2".equals(msg.textoNormalizado()) || msg.textoNormalizado().contains("ATENDENTE")) {
            save(msg.telefone(), SessionContext.menu());
            respond(msg, "Encaminhamos para um atendente humano. Para voltar ao menu, envie qualquer mensagem.");
            return Map.of("ok", true);
        }
        resetToMenu(msg);
        return Map.of("ok", true);
    }

    private Map<String, Object> handleReagendarCpf(IncomingMessageDTO msg, SessionContext ctx) {
        var v = CpfUtils.validateCpf(msg.textoRaw());
        if (!v.ok()) {
            respond(msg, v.message() + " Tente novamente ou envie MENU para voltar.");
            return Map.of("ok", true);
        }
        ctx.setCpfVerificacao(v.digits());
        ctx.setStep(StepEnum.REAGENDAR_NASCIMENTO);
        save(msg.telefone(), ctx);
        respond(msg, "Informe sua data de nascimento no formato DD/MM/AAAA (ex.: 08/03/1985):");
        return Map.of("ok", true);
    }

    private Map<String, Object> handleReagendarNascimento(IncomingMessageDTO msg, SessionContext ctx) {
        var p = CpfUtils.parseBirthDateBr(msg.textoRaw());
        if (!p.ok()) {
            respond(msg, p.message() + " Tente novamente ou envie MENU.");
            return Map.of("ok", true);
        }
        var cad = pacientes.getByTelefone(msg.telefone());
        if (cad.isPresent() && cad.get().getCpf() != null && cad.get().getDataNascimento() != null) {
            if (!cad.get().getCpf().equals(ctx.getCpfVerificacao()) || !cad.get().getDataNascimento().equals(p.iso())) {
                respond(msg, "CPF ou data de nascimento não conferem com o cadastro da clínica. Confira os dados e tente novamente ou envie MENU.");
                return Map.of("ok", true);
            }
        }
        List<Consulta> lista = consultas.listarConsultasReagendar(msg.telefone());
        if (lista.isEmpty()) {
            respond(msg, "Não encontramos consultas futuras para este número. Para um novo agendamento, responda 1. Para voltar ao menu, envie MENU.");
            save(msg.telefone(), SessionContext.menu());
            return Map.of("ok", true);
        }
        StringBuilder lines = new StringBuilder("Escolha qual consulta deseja liberar para reagendamento (responda o número):\n");
        for (int i = 0; i < lista.size(); i++) {
            Consulta c = lista.get(i);
            lines.append(i + 1).append(" — ").append(DateTimeUtils.formatDateBr(c.getData()))
                    .append(" às ").append(c.getHora()).append(" (").append(c.getNomePaciente()).append(")\n");
        }
        ctx.setConsultasReagendar(lista);
        ctx.setNascimentoVerificacao(p.iso());
        ctx.setStep(StepEnum.REAGENDAR_ESCOLHER);
        save(msg.telefone(), ctx);
        respond(msg, lines.toString());
        return Map.of("ok", true);
    }

    private Map<String, Object> handleReagendarEscolher(IncomingMessageDTO msg, SessionContext ctx) {
        int idx = parseIntSafe(msg.textoNormalizado());
        List<Consulta> list = ctx.getConsultasReagendar();
        if (idx < 1 || idx > list.size()) {
            respond(msg, "Número inválido. Escolha uma opção da lista ou envie MENU.");
            return Map.of("ok", true);
        }
        Consulta c = list.get(idx - 1);
        consultas.cancelar(c.getId());
        save(msg.telefone(), SessionContext.menu());
        respond(msg, "A consulta de " + DateTimeUtils.formatDateBr(c.getData()) + " às " + c.getHora()
                + " foi cancelada para liberar reagendamento. Para agendar a nova data, responda 1 no menu principal.\n\n" + MENU);
        return Map.of("ok", true);
    }

    private Map<String, Object> handleNome(IncomingMessageDTO msg, SessionContext ctx) {
        if (msg.textoNormalizado().isBlank() || Set.of("1", "2", "3").contains(msg.textoNormalizado())) {
            resetToMenu(msg);
            return Map.of("ok", true);
        }
        List<String> servicos = professionals.listarServicos();
        if (servicos.isEmpty()) {
            respond(msg, "Nenhum serviço cadastrado no momento. Peça ao atendente para cadastrar os profissionais/serviços.");
            return Map.of("ok", true);
        }
        ctx.setNomePaciente(msg.textoRaw().trim());
        ctx.setServicosOfertados(servicos);
        ctx.setStep(StepEnum.ESCOLHER_SERVICO);
        save(msg.telefone(), ctx);
        respond(msg, buildServicosMessage(servicos));
        return Map.of("ok", true);
    }

    private Map<String, Object> handleEscolherServico(IncomingMessageDTO msg, SessionContext ctx) {
        int si = parseIntSafe(msg.textoNormalizado());
        if (si < 1 || si > ctx.getServicosOfertados().size()) {
            respond(msg, "Opção inválida. Escolha um número da lista ou envie MENU.");
            return Map.of("ok", true);
        }
        String chosen = ctx.getServicosOfertados().get(si - 1);
        List<Map<String, Object>> dias = consultas.proximosSlotsResumo(5, null);
        if (dias.isEmpty()) {
            respond(msg, "Sem horários nos próximos dias. Tente mais tarde.");
            return Map.of("ok", true);
        }
        ctx.setServicoEscolhido(chosen);
        ctx.setDiasOfertados(new ArrayList<>(dias));
        ctx.setStep(StepEnum.ESCOLHER_DATA_SERVICO);
        save(msg.telefone(), ctx);
        respond(msg, buildDiasMessage(chosen, ctx.getDiasOfertados()));
        return Map.of("ok", true);
    }

    private Map<String, Object> handleEscolherDataServico(IncomingMessageDTO msg, SessionContext ctx) {
        if ("MAISDIAS".equals(msg.textoNormalizado()) || "MAIS".equals(msg.textoNormalizado())) {
            if (ctx.getDiasOfertados().isEmpty()) {
                respond(msg, "Não há dias carregados. Envie MENU para recomeçar.");
                return Map.of("ok", true);
            }
            String lastData = String.valueOf(ctx.getDiasOfertados().get(ctx.getDiasOfertados().size() - 1).get("data"));
            List<Map<String, Object>> more = consultas.proximosSlotsResumoApos(lastData, 5, null);
            Set<String> seen = new LinkedHashSet<>();
            List<Map<String, Object>> merged = new ArrayList<>();
            for (Map<String, Object> d : ctx.getDiasOfertados()) {
                String ds = String.valueOf(d.get("data"));
                if (seen.add(ds)) {
                    merged.add(d);
                }
            }
            for (Map<String, Object> d : more) {
                String ds = String.valueOf(d.get("data"));
                if (seen.add(ds)) {
                    merged.add(d);
                }
            }
            ctx.setDiasOfertados(merged);
            save(msg.telefone(), ctx);
            respond(msg, buildDiasMessage(ctx.getServicoEscolhido(), merged));
            return Map.of("ok", true);
        }

        int di = parseIntSafe(msg.textoNormalizado());
        if (di < 1 || di > ctx.getDiasOfertados().size()) {
            respond(msg, "Opção inválida. Escolha o número do dia ou digite MAISDIAS. Envie MENU para voltar.");
            return Map.of("ok", true);
        }

        String dataIso = String.valueOf(ctx.getDiasOfertados().get(di - 1).get("data"));
        List<Profissional> candidatos = professionals.profissionaisPorServico(ctx.getServicoEscolhido());
        List<Map<String, Object>> ofertados = new ArrayList<>();
        for (Profissional p : candidatos) {
            List<String> livres = consultas.horariosDisponiveis(dataIso, p.getId(), null);
            if (!livres.isEmpty()) {
                Map<String, Object> row = new HashMap<>();
                row.put("id", p.getId());
                row.put("nome", p.getNome());
                row.put("qtdHorarios", livres.size());
                ofertados.add(row);
            }
        }
        if (ofertados.isEmpty()) {
            respond(msg, "Não há profissionais com horários livres nesta data. Escolha outro dia ou digite MAISDIAS.");
            return Map.of("ok", true);
        }

        ctx.setDataEscolhida(dataIso);
        ctx.setProfissionaisOfertados(ofertados);
        ctx.setStep(StepEnum.ESCOLHER_PROFISSIONAL);
        save(msg.telefone(), ctx);
        respond(msg, buildProfissionaisMessage(ofertados));
        return Map.of("ok", true);
    }

    private Map<String, Object> handleEscolherProfissional(IncomingMessageDTO msg, SessionContext ctx) {
        int pi = parseIntSafe(msg.textoNormalizado());
        if (pi < 1 || pi > ctx.getProfissionaisOfertados().size()) {
            respond(msg, "Opção inválida. Escolha um médico da lista ou envie MENU.");
            return Map.of("ok", true);
        }
        Map<String, Object> prof = ctx.getProfissionaisOfertados().get(pi - 1);
        String profId = String.valueOf(prof.get("id"));
        List<String> horarios = consultas.horariosDisponiveis(ctx.getDataEscolhida(), profId, null);
        if (horarios.isEmpty()) {
            respond(msg, "Os horários deste profissional acabaram de ser ocupados. Escolha outro médico ou outra data.");
            return Map.of("ok", true);
        }
        List<Map<String, Object>> slots = new ArrayList<>();
        for (String hora : horarios) {
            Map<String, Object> slot = new HashMap<>();
            slot.put("data", ctx.getDataEscolhida());
            slot.put("hora", hora);
            slots.add(slot);
        }
        ctx.setProfissionalEscolhido(prof);
        ctx.setSlotsOfertados(slots);
        ctx.setStep(StepEnum.ESCOLHER_HORARIO);
        save(msg.telefone(), ctx);
        respondHorarios(msg, slots);
        return Map.of("ok", true);
    }

    private Map<String, Object> handleEscolherHorario(IncomingMessageDTO msg, SessionContext ctx) {
        int idx = parseIntSafe(msg.textoNormalizado());
        List<Map<String, Object>> slots = ctx.getSlotsOfertados();
        if (idx < 1 || idx > slots.size()) {
            respond(msg, "Número inválido. Escolha um horário da lista ou envie MENU.");
            return Map.of("ok", true);
        }
        Map<String, Object> slot = slots.get(idx - 1);
        String hora = String.valueOf(slot.get("hora"));
        try {
            Map<String, Object> body = new HashMap<>();
            body.put("nomePaciente", ctx.getNomePaciente());
            body.put("telefone", msg.telefone());
            body.put("data", ctx.getDataEscolhida());
            body.put("hora", hora);
            if (ctx.getProfissionalEscolhido() != null) {
                body.put("profissionalId", ctx.getProfissionalEscolhido().get("id"));
            }
            body.put("servico", ctx.getServicoEscolhido());
            Consulta created = consultas.agendar(body, false);
            sessions.clear(msg.telefone());
            String br = DateTimeUtils.formatDateBr(created.getData());
            String[] parts = br.split("/");
            respond(msg, "Consulta agendada para DIA " + parts[0] + ", MÊS " + parts[1] + " e ANO " + parts[2]
                    + " às " + created.getHora() + ". Para cancelar, responda CANCELAR " + created.getId());
        } catch (Exception e) {
            respond(msg, "Não foi possível agendar: " + e.getMessage());
        }
        return Map.of("ok", true);
    }

    private void respondHorarios(IncomingMessageDTO msg, List<Map<String, Object>> slots) {
        int total = slots.size();
        int blockCount = (int) Math.ceil((double) total / HORARIOS_POR_BLOCO);
        for (int block = 0; block < blockCount; block++) {
            int start = block * HORARIOS_POR_BLOCO;
            int end = Math.min(start + HORARIOS_POR_BLOCO, total);
            StringBuilder lines = new StringBuilder();
            if (blockCount > 1) {
                lines.append("Horários disponíveis (parte ").append(block + 1).append(" de ").append(blockCount).append("):\n");
            } else {
                lines.append("Escolha o horário (responda o número):\n");
            }
            for (int i = start; i < end; i++) {
                Map<String, Object> slot = slots.get(i);
                String dataBr = DateTimeUtils.formatDateBr(String.valueOf(slot.get("data")));
                lines.append(i + 1).append(" — ").append(dataBr).append(" ").append(slot.get("hora")).append("\n");
            }
            respond(msg, lines.toString().trim());
        }
    }

    private static String buildServicosMessage(List<String> servicos) {
        StringBuilder lines = new StringBuilder("Qual serviço médico você deseja?\n");
        for (int i = 0; i < servicos.size(); i++) {
            lines.append(i + 1).append(" — ").append(servicos.get(i)).append("\n");
        }
        return lines.toString().trim();
    }

    private static String buildDiasMessage(String servico, List<Map<String, Object>> dias) {
        StringBuilder lines = new StringBuilder("Serviço escolhido: ").append(servico)
                .append("\n\nPróximos dias úteis com horários — escolha o dia pelo número:\n");
        for (int i = 0; i < dias.size(); i++) {
            String br = DateTimeUtils.formatDateBr(String.valueOf(dias.get(i).get("data")));
            String[] parts = br.split("/");
            lines.append(i + 1).append(" — DIA ").append(parts[0]).append(", MÊS ").append(parts[1])
                    .append(" e ANO ").append(parts[2]).append("\n");
        }
        lines.append("\nDigite MAISDIAS para carregar mais dias úteis.");
        return lines.toString().trim();
    }

    private static String buildProfissionaisMessage(List<Map<String, Object>> profissionais) {
        StringBuilder lines = new StringBuilder("Escolha o profissional (responda o número):\n");
        for (int i = 0; i < profissionais.size(); i++) {
            Map<String, Object> p = profissionais.get(i);
            lines.append(i + 1).append(" — Dr(a). ").append(p.get("nome"))
                    .append(" (").append(p.get("qtdHorarios")).append(" horários livres)\n");
        }
        return lines.toString().trim();
    }

    private void resetToMenu(IncomingMessageDTO msg) {
        save(msg.telefone(), SessionContext.menu());
        respond(msg, MENU);
    }

    private void save(String telefone, SessionContext ctx) {
        sessions.set(telefone, ctx.toMap());
    }

    private void respond(IncomingMessageDTO msg, String message) {
        if (!msg.useProvider()) {
            return;
        }
        try {
            whatsappProvider.sendText(msg.telefone(), message);
        } catch (Exception e) {
            log.error("whatsapp_send_error telefone={} err={}", msg.telefone(), e.getMessage());
        }
    }

    private static boolean wantsAgendar(String text) {
        return text.contains("AGENDAR") && !text.contains("REAGENDAR");
    }

    private static int parseIntSafe(String text) {
        try {
            return Integer.parseInt(text.trim());
        } catch (Exception e) {
            return -1;
        }
    }
}
