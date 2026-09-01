package com.clinica.bot.repository.mongo;

import com.clinica.bot.domain.Prontuario;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ProntuarioMongoRepository extends MongoRepository<Prontuario, String> {
    List<Prontuario> findByClienteCpf(String clienteCpf);
}
