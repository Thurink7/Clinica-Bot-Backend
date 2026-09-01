package com.clinica.bot.repository.mongo;

import com.clinica.bot.domain.Profissional;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ProfissionalMongoRepository extends MongoRepository<Profissional, String> {
    List<Profissional> findByAtivoTrue();
}
