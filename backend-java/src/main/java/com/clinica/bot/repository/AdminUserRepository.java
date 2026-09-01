package com.clinica.bot.repository;

import com.clinica.bot.config.DatabaseMode;
import com.clinica.bot.domain.AdminUser;
import com.clinica.bot.repository.firestore.AdminUserFirestoreRepository;
import com.clinica.bot.repository.mongo.AdminUserMongoRepository;
import com.clinica.bot.util.CpfUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.Optional;

@Slf4j
@Repository
public class AdminUserRepository {

    private final DatabaseMode databaseMode;
    private final ObjectProvider<AdminUserMongoRepository> mongoRepoProvider;
    private final AdminUserFirestoreRepository firestoreRepo;

    // Reuse instances to avoid unnecessary GC pressure on every request
    private final AdminBackend mongoBackend = new MongoBackend();
    private final AdminBackend firestoreBackend = new FirestoreBackend();
    private final AdminBackend noopBackend = new AdminBackend() {};

    public AdminUserRepository(DatabaseMode databaseMode,
                               ObjectProvider<AdminUserMongoRepository> mongoRepoProvider,
                               AdminUserFirestoreRepository firestoreRepo) {
        this.databaseMode = databaseMode;
        this.mongoRepoProvider = mongoRepoProvider;
        this.firestoreRepo = firestoreRepo;
    }

    private AdminUserMongoRepository mongo() {
        return mongoRepoProvider.getObject();
    }

    public Optional<AdminUser> findByEmail(String email) {
        if (email == null) return Optional.empty();
        return primary().findByEmail(normalizeEmail(email));
    }

    public Optional<AdminUser> getById(String id) {
        if (id == null || id.isBlank()) return Optional.empty();
        return primary().getById(id);
    }

    public AdminUser create(String email, String passwordHash, String nome, String parceiroId) {
        String cleanEmail = normalizeEmail(email);
        AdminUser created = primary().create(cleanEmail, passwordHash, nome, parceiroId);
        mirrorWrite(() -> secondary().createWithId(created.getId(), cleanEmail, passwordHash, nome, parceiroId));
        return created;
    }

    private String normalizeEmail(String email) {
        return email != null ? email.toLowerCase().trim() : "";
    }

    private AdminBackend primary() {
        return "mongo".equalsIgnoreCase(databaseMode.getRead()) ? mongoBackend : firestoreBackend;
    }

    private AdminBackend secondary() {
        if (!"dual".equalsIgnoreCase(databaseMode.getWrite())) {
            return noopBackend;
        }
        return "mongo".equalsIgnoreCase(databaseMode.getRead()) ? firestoreBackend : mongoBackend;
    }

    private void mirrorWrite(Runnable action) {
        if (!"dual".equalsIgnoreCase(databaseMode.getWrite())) return;
        try {
            action.run();
        } catch (Exception e) {
            log.warn("dual_write_secondary_failed: {}", e.getMessage(), e);
        }
    }

    private interface AdminBackend {
        default Optional<AdminUser> findByEmail(String email) { throw new UnsupportedOperationException(); }
        default Optional<AdminUser> getById(String id) { throw new UnsupportedOperationException(); }
        default AdminUser create(String email, String passwordHash, String nome, String parceiroId) { throw new UnsupportedOperationException(); }
        default AdminUser createWithId(String id, String email, String passwordHash, String nome, String parceiroId) { throw new UnsupportedOperationException(); }
    }

    private class MongoBackend implements AdminBackend {
        @Override
        public Optional<AdminUser> findByEmail(String email) {
            return mongo().findByEmail(email);
        }

        @Override
        public Optional<AdminUser> getById(String id) {
            return mongo().findById(id).or(() -> mongo().findByLegacyId(id));
        }

        @Override
        public AdminUser create(String email, String passwordHash, String nome, String parceiroId) {
            return createWithId(CpfUtils.generateLegacyId(), email, passwordHash, nome, parceiroId);
        }

        @Override
        public AdminUser createWithId(String id, String email, String passwordHash, String nome, String parceiroId) {
            AdminUser u = AdminUser.builder()
                    .id(id)
                    .legacyId(id)
                    .email(email)
                    .passwordHash(passwordHash)
                    .nome(nome)
                    .parceiroId(parceiroId)
                    .createdAt(Instant.now())
                    .build();
            return mongo().save(u);
        }
    }

    private class FirestoreBackend implements AdminBackend {
        @Override
        public Optional<AdminUser> findByEmail(String email) {
            return firestoreRepo.findByEmail(email);
        }

        @Override
        public Optional<AdminUser> getById(String id) {
            return firestoreRepo.getById(id);
        }

        @Override
        public AdminUser create(String email, String passwordHash, String nome, String parceiroId) {
            return firestoreRepo.create(email, passwordHash, nome, parceiroId);
        }

        @Override
        public AdminUser createWithId(String id, String email, String passwordHash, String nome, String parceiroId) {
            // Updated to ensure secondary write preserves primary ID if firestore repo supports it
            return firestoreRepo.createWithId(id, email, passwordHash, nome, parceiroId);
        }
    }
}