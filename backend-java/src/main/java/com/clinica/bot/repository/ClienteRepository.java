package com.clinica.bot.repository;

import com.clinica.bot.config.DatabaseMode;
import com.clinica.bot.domain.Cliente;
import com.clinica.bot.exception.ApiException;
import com.clinica.bot.repository.firestore.ClienteFirestoreRepository;
import com.clinica.bot.repository.mongo.ClienteMongoRepository;
import com.clinica.bot.util.CpfUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.Map;

@Slf4j
@Repository
@RequiredArgsConstructor
public class ClienteRepository {

    private final DatabaseMode databaseMode;
    private final ObjectProvider<ClienteMongoRepository> mongoRepoProvider;
    private final ClienteFirestoreRepository firestoreRepo;

    private ClienteMongoRepository mongo() {
        return mongoRepoProvider.getObject();
    }

    public Cliente getOrCreate(String cpfRaw, Map<String, Object> data) {
        Cliente created = primary().getOrCreate(cpfRaw, data);
        mirrorWrite(() -> secondary().getOrCreate(cpfRaw, data));
        return created;
    }

    private ClienteBackend primary() {
        return "mongo".equals(databaseMode.getRead()) ? mongoBackend() : firestoreBackend();
    }

    private ClienteBackend secondary() {
        return "dual".equals(databaseMode.getWrite())
                ? ("mongo".equals(databaseMode.getRead()) ? firestoreBackend() : mongoBackend())
                : noop();
    }

    private void mirrorWrite(Runnable action) {
        if (!"dual".equals(databaseMode.getWrite())) return;
        try { action.run(); } catch (Exception e) { log.warn("dual_write_secondary_failed: {}", e.getMessage()); }
    }

    private ClienteBackend mongoBackend() { return new MongoBackend(); }
    private ClienteBackend firestoreBackend() { return new FirestoreBackend(); }
    private ClienteBackend noop() { return new ClienteBackend() {}; }

    private interface ClienteBackend {
        default Cliente getOrCreate(String cpfRaw, Map<String, Object> data) { throw new UnsupportedOperationException(); }
    }

    private class MongoBackend implements ClienteBackend {
        @Override
        public Cliente getOrCreate(String cpfRaw, Map<String, Object> data) {
            String cpf = CpfUtils.digitsOnly(cpfRaw);
            if (cpf.isBlank()) throw new ApiException("CPF é obrigatório", 400);
            return mongo().findById(cpf).orElseGet(() -> {
                Cliente c = Cliente.builder()
                        .cpf(cpf)
                        .nome(String.valueOf(data.getOrDefault("nome", "Paciente")))
                        .telefone(CpfUtils.digitsOnly(String.valueOf(data.getOrDefault("telefone", ""))))
                        .email(String.valueOf(data.getOrDefault("email", "")))
                        .createdAt(Instant.now())
                        .build();
                return mongo().save(c);
            });
        }
    }

    private class FirestoreBackend implements ClienteBackend {
        @Override
        public Cliente getOrCreate(String cpfRaw, Map<String, Object> data) {
            return firestoreRepo.getOrCreate(cpfRaw, data);
        }
    }
}
