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
@RequiredArgsConstructor
public class AdminUserRepository {

    private final DatabaseMode databaseMode;
    private final ObjectProvider<AdminUserMongoRepository> mongoRepoProvider;
    private final AdminUserFirestoreRepository firestoreRepo;

    private AdminUserMongoRepository mongo() {
        return mongoRepoProvider.getObject();
    }

    public Optional<AdminUser> findByEmail(String email) {
        return primary().findByEmail(email);
    }

    public Optional<AdminUser> getById(String id) {
        return primary().getById(id);
    }

    public AdminUser create(String email, String passwordHash, String nome, String parceiroId) {
        AdminUser created = primary().create(email, passwordHash, nome, parceiroId);
        mirrorWrite(() -> secondary().createWithId(created.getId(), email, passwordHash, nome, parceiroId));
        return created;
    }

    private AdminBackend primary() {
        return "mongo".equals(databaseMode.getRead()) ? mongoBackend() : firestoreBackend();
    }

    private AdminBackend secondary() {
        return "dual".equals(databaseMode.getWrite())
                ? ("mongo".equals(databaseMode.getRead()) ? firestoreBackend() : mongoBackend())
                : noop();
    }

    private void mirrorWrite(Runnable action) {
        if (!"dual".equals(databaseMode.getWrite())) return;
        try { action.run(); } catch (Exception e) { log.warn("dual_write_secondary_failed: {}", e.getMessage()); }
    }

    private AdminBackend mongoBackend() { return new MongoBackend(); }
    private AdminBackend firestoreBackend() { return new FirestoreBackend(); }
    private AdminBackend noop() { return new AdminBackend() {}; }

    private interface AdminBackend {
        default Optional<AdminUser> findByEmail(String email) { throw new UnsupportedOperationException(); }
        default Optional<AdminUser> getById(String id) { throw new UnsupportedOperationException(); }
        default AdminUser create(String email, String passwordHash, String nome, String parceiroId) { throw new UnsupportedOperationException(); }
        default AdminUser createWithId(String id, String email, String passwordHash, String nome, String parceiroId) { throw new UnsupportedOperationException(); }
    }

    private class MongoBackend implements AdminBackend {
        @Override
        public Optional<AdminUser> findByEmail(String email) {
            return mongo().findByEmail(email.toLowerCase().trim());
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
                    .email(email.toLowerCase().trim())
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
            return firestoreRepo.create(email, passwordHash, nome, parceiroId);
        }
    }
}
