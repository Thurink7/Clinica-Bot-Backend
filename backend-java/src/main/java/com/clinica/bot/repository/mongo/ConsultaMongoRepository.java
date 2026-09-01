package com.clinica.bot.repository.mongo;

import com.clinica.bot.domain.Consulta;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ConsultaMongoRepository extends MongoRepository<Consulta, String> {

    List<Consulta> findByData(String data);

    List<Consulta> findByDataAndParceiroId(String data, String parceiroId);

    List<Consulta> findByDataAndProfissionalIdAndParceiroId(String data, String profissionalId, String parceiroId);

    List<Consulta> findByDataBetweenAndParceiroId(String de, String ate, String parceiroId);

    List<Consulta> findByDataBetween(String de, String ate);

    List<Consulta> findByTelefone(String telefone);

    List<Consulta> findByCpf(String cpf);

    List<Consulta> findByStatusIn(List<String> statuses);

    Optional<Consulta> findByLegacyId(String legacyId);
}
