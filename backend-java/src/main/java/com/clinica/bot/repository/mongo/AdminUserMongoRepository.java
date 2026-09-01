package com.clinica.bot.repository.mongo;

import com.clinica.bot.domain.AdminUser;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface AdminUserMongoRepository extends MongoRepository<AdminUser, String> {
    Optional<AdminUser> findByEmail(String email);

    Optional<AdminUser> findByLegacyId(String legacyId);
}
