package com.clinica.bot.config;

import com.google.cloud.firestore.Firestore;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.Optional;

@Slf4j
@Configuration
public class FirebaseConfig {

    @Bean
    public Optional<Firestore> firestore(DatabaseMode databaseMode) {
        // Ignora a inicializacao e retorna um Optional vazio sem subir excecao
        log.info("Firebase totalmente desabilitado. Rodando apenas com MongoDB Atlas.");
        return Optional.empty();
    }
}
