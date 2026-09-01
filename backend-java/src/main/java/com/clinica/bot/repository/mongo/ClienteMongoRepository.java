package com.clinica.bot.repository.mongo;

import com.clinica.bot.domain.Cliente;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ClienteMongoRepository extends MongoRepository<Cliente, String> {
}
