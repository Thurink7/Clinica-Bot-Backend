package com.clinica.bot.repository.mongo;

import com.clinica.bot.domain.ClinicConfig;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ClinicConfigMongoRepository extends MongoRepository<ClinicConfig, String> {
}
