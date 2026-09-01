package com.clinica.bot.repository.mongo;

import com.clinica.bot.domain.WhatsappSession;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface WhatsappSessionMongoRepository extends MongoRepository<WhatsappSession, String> {
}
