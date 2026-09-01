package com.clinica.bot.repository.mongo;

import com.clinica.bot.domain.Parceiro;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ParceiroMongoRepository extends MongoRepository<Parceiro, String> {
}
