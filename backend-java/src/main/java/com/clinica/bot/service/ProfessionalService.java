package com.clinica.bot.service;

import com.clinica.bot.domain.Profissional;
import com.clinica.bot.exception.ApiException;
import com.clinica.bot.repository.ProfessionalRepository;
import com.clinica.bot.util.CpfUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
public class ProfessionalService {

    private static final Pattern EMAIL = Pattern.compile("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$");

    private final ProfessionalRepository repo;

    public Profissional cadastrar(Map<String, Object> body) {
        String nome = String.valueOf(body.getOrDefault("nome", "")).trim();
        String especialidade = String.valueOf(body.getOrDefault("especialidade", "")).trim();
        String telefone = CpfUtils.digitsOnly(String.valueOf(body.getOrDefault("telefone", "")));
        String email = String.valueOf(body.getOrDefault("email", "")).trim().toLowerCase();

        if (nome.isBlank()) throw new ApiException("nome obrigatório", 400);
        if (especialidade.isBlank()) throw new ApiException("especialidade obrigatória", 400);
        if (telefone.length() < 10) throw new ApiException("telefone obrigatório (mín. 10 dígitos)", 400);
        if (!EMAIL.matcher(email).matches()) throw new ApiException("email obrigatório inválido", 400);

        List<String> list;
        Object servicos = body.get("servicos");
        if (servicos instanceof List<?> l) {
            list = l.stream().map(String::valueOf).map(String::trim).filter(s -> !s.isBlank()).toList();
        } else {
            list = Arrays.stream(String.valueOf(servicos == null ? "" : servicos).split(","))
                    .map(String::trim).filter(s -> !s.isBlank()).toList();
        }
        if (list.isEmpty()) list = List.of(especialidade);
        List<String> norm = list.stream().map(s -> s.toUpperCase()).distinct().toList();

        List<Integer> diasTrabalho;
        Object dw = body.get("diasTrabalho");
        if (dw instanceof List<?> l && !l.isEmpty()) {
            diasTrabalho = l.stream().map(o -> ((Number) o).intValue()).filter(d -> d >= 0 && d <= 6).toList();
        } else {
            diasTrabalho = List.of(1, 2, 3, 4, 5);
        }

        Map<String, Object> data = new HashMap<>();
        data.put("nome", nome);
        data.put("especialidade", especialidade);
        data.put("telefone", telefone);
        data.put("email", email);
        data.put("servicos", norm);
        data.put("ativo", body.get("ativo") instanceof Boolean b ? b : true);
        data.put("diasTrabalho", diasTrabalho);
        return repo.create(data);
    }

    public List<Profissional> listar() { return repo.listAll(); }

    public Profissional atualizarAtivo(String id, Boolean ativo) {
        return repo.update(id, Map.of("ativo", Boolean.TRUE.equals(ativo)));
    }

    public Map<String, Object> excluir(String id) { return repo.delete(id); }

    public List<String> listarServicos() {
        Set<String> set = new TreeSet<>();
        for (Profissional p : repo.listActive()) {
            if (p.getServicos() != null) p.getServicos().forEach(s -> set.add(s.toUpperCase()));
        }
        return new ArrayList<>(set);
    }

    public List<Profissional> profissionaisPorServico(String servico) {
        String s = String.valueOf(servico == null ? "" : servico).trim().toUpperCase();
        if (s.isBlank()) return List.of();
        return repo.listActive().stream()
                .filter(p -> p.getServicos() != null && p.getServicos().stream().map(String::toUpperCase).anyMatch(x -> x.equals(s)))
                .toList();
    }
}
