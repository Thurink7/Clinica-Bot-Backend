package com.clinica.bot.repository.firestore;

import com.clinica.bot.domain.Prontuario;
import com.clinica.bot.util.CpfUtils;
import com.google.cloud.firestore.DocumentReference;
import com.google.cloud.firestore.Firestore;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.time.LocalDate;
import java.util.*;
import java.util.concurrent.ExecutionException;
import java.util.stream.Collectors;

@Repository
@RequiredArgsConstructor
public class ProntuarioFirestoreRepository {

    private final Optional<Firestore> firestore;

    private Firestore db() {
        return firestore.orElseThrow(() -> new IllegalStateException("Firestore não inicializado"));
    }

    public Prontuario create(Map<String, Object> data) {
        try {
            DocumentReference ref = db().collection("prontuarios").document();
            Map<String, Object> payload = new HashMap<>(data);
            payload.put("clienteCpf", CpfUtils.digitsOnly(String.valueOf(data.get("clienteCpf"))));
            payload.put("dataProntuario", LocalDate.now().toString());
            payload.put("createdAt", Instant.now().toString());
            ref.set(payload).get();
            return toProntuario(ref.getId(), payload);
        } catch (InterruptedException | ExecutionException e) {
            Thread.currentThread().interrupt();
            throw new RuntimeException(e);
        }
    }

    public List<Prontuario> listByClienteCpf(String cpf) {
        try {
            return db().collection("prontuarios")
                    .whereEqualTo("clienteCpf", CpfUtils.digitsOnly(cpf))
                    .get().get().getDocuments().stream()
                    .map(d -> toProntuario(d.getId(), d.getData()))
                    .collect(Collectors.toList());
        } catch (InterruptedException | ExecutionException e) {
            Thread.currentThread().interrupt();
            throw new RuntimeException(e);
        }
    }

    @SuppressWarnings("unchecked")
    private Prontuario toProntuario(String id, Map<String, Object> data) {
        return Prontuario.builder()
                .id(id)
                .clienteCpf(str(data.get("clienteCpf")))
                .parceiroId(str(data.get("parceiroId")))
                .profissionalId(str(data.get("profissionalId")))
                .diagnostico(str(data.get("diagnostico")))
                .prescricao(str(data.get("prescricao")))
                .resultados((List<Object>) data.get("resultados"))
                .dataProntuario(str(data.get("dataProntuario")))
                .createdAt(Instant.now())
                .build();
    }

    private static String str(Object o) { return o == null ? null : String.valueOf(o); }
}
