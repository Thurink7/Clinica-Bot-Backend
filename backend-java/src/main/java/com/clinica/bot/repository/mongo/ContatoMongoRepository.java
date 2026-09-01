package com.clinica.bot.repository.mongo;

import com.clinica.bot.domain.Contato;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ContatoMongoRepository extends MongoRepository<Contato, String> {
}
