package com.clinica.bot.repository.mongo;

import com.clinica.bot.domain.Paciente;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface PacienteMongoRepository extends MongoRepository<Paciente, String> {
    Optional<Paciente> findByTelefone(String telefone);
}
