package com.clinica.bot.dto;

import com.clinica.bot.domain.Consulta;
import lombok.Builder;
import lombok.Data;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Data
@Builder
public class SessionContext {

    @Builder.Default
    private StepEnum step = StepEnum.MENU;

    private String nomePaciente;
    private String servicoEscolhido;
    private String dataEscolhida;
    private String cpfVerificacao;
    private String nascimentoVerificacao;

    @Builder.Default
    private List<String> servicosOfertados = new ArrayList<>();

    @Builder.Default
    private List<Map<String, Object>> diasOfertados = new ArrayList<>();

    @Builder.Default
    private List<Map<String, Object>> profissionaisOfertados = new ArrayList<>();

    @Builder.Default
    private List<Map<String, Object>> slotsOfertados = new ArrayList<>();

    private Map<String, Object> profissionalEscolhido;

    @Builder.Default
    private List<Consulta> consultasReagendar = new ArrayList<>();

    public static SessionContext menu() {
        return SessionContext.builder().step(StepEnum.MENU).build();
    }

    public Map<String, Object> toMap() {
        Map<String, Object> map = new HashMap<>();
        map.put("step", step.key());
        map.put("nomePaciente", nomePaciente);
        map.put("servicoEscolhido", servicoEscolhido);
        map.put("dataEscolhida", dataEscolhida);
        map.put("cpfVerificacao", cpfVerificacao);
        map.put("nascimentoVerificacao", nascimentoVerificacao);
        map.put("servicosOfertados", servicosOfertados);
        map.put("diasOfertados", diasOfertados);
        map.put("profissionaisOfertados", profissionaisOfertados);
        map.put("slotsOfertados", slotsOfertados);
        map.put("profissionalEscolhido", profissionalEscolhido);
        map.put("consultasReagendar", consultasReagendar);
        return map;
    }

    @SuppressWarnings("unchecked")
    public static SessionContext fromMap(Map<String, Object> map) {
        if (map == null || map.isEmpty()) {
            return menu();
        }
        SessionContext ctx = SessionContext.builder()
                .step(StepEnum.fromKey(String.valueOf(map.get("step"))))
                .nomePaciente(str(map.get("nomePaciente")))
                .servicoEscolhido(str(map.get("servicoEscolhido")))
                .dataEscolhida(str(map.get("dataEscolhida")))
                .cpfVerificacao(str(map.get("cpfVerificacao")))
                .nascimentoVerificacao(str(map.get("nascimentoVerificacao")))
                .servicosOfertados(asStringList(map.get("servicosOfertados")))
                .diasOfertados(asMapList(map.get("diasOfertados")))
                .profissionaisOfertados(asMapList(map.get("profissionaisOfertados")))
                .slotsOfertados(asMapList(map.get("slotsOfertados")))
                .profissionalEscolhido(asMap(map.get("profissionalEscolhido")))
                .consultasReagendar(asConsultaList(map.get("consultasReagendar")))
                .build();
        return ctx;
    }

    private static String str(Object o) {
        return o == null ? null : String.valueOf(o);
    }

    private static List<String> asStringList(Object raw) {
        if (!(raw instanceof List<?> list)) {
            return new ArrayList<>();
        }
        List<String> out = new ArrayList<>();
        for (Object item : list) {
            out.add(String.valueOf(item));
        }
        return out;
    }

    @SuppressWarnings("unchecked")
    private static List<Map<String, Object>> asMapList(Object raw) {
        if (!(raw instanceof List<?> list)) {
            return new ArrayList<>();
        }
        List<Map<String, Object>> out = new ArrayList<>();
        for (Object item : list) {
            if (item instanceof Map<?, ?> m) {
                out.add((Map<String, Object>) m);
            }
        }
        return out;
    }

    @SuppressWarnings("unchecked")
    private static Map<String, Object> asMap(Object raw) {
        if (raw instanceof Map<?, ?> m) {
            return (Map<String, Object>) m;
        }
        return null;
    }

    private static List<Consulta> asConsultaList(Object raw) {
        if (!(raw instanceof List<?> list)) {
            return new ArrayList<>();
        }
        List<Consulta> out = new ArrayList<>();
        for (Object item : list) {
            out.add(toConsulta(item));
        }
        return out;
    }

    @SuppressWarnings("unchecked")
    static Consulta toConsulta(Object item) {
        if (item instanceof Consulta c) {
            return c;
        }
        if (item instanceof Map<?, ?> m) {
            Consulta c = new Consulta();
            c.setId(str(m.get("id")));
            c.setNomePaciente(str(m.get("nomePaciente")));
            c.setData(str(m.get("data")));
            c.setHora(str(m.get("hora")));
            c.setTelefone(str(m.get("telefone")));
            c.setStatus(str(m.get("status")));
            return c;
        }
        throw new IllegalArgumentException("Consulta inválida na sessão");
    }
}
