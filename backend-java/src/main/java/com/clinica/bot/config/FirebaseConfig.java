package com.clinica.bot.config;

import com.google.auth.oauth2.GoogleCredentials;
import com.google.cloud.firestore.Firestore;
import com.google.firebase.FirebaseApp;
import com.google.firebase.FirebaseOptions;
import com.google.firebase.cloud.FirestoreClient;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.io.ByteArrayInputStream;
import java.io.FileInputStream;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.Optional;

@Slf4j
@Configuration
public class FirebaseConfig {

    @Value("${firebase.credentials-path:}")
    private String credentialsPath;

    @Value("${firebase.service-account-json:}")
    private String serviceAccountJson;

    @Value("${firebase.service-account-b64:}")
    private String serviceAccountB64;

    @Bean
    public Optional<Firestore> firestore(DatabaseMode databaseMode) {
        if (!databaseMode.needsFirebaseInit()) {
            log.info("Firebase desabilitado (modo DB sem Firestore)");
            return Optional.empty();
        }
        try {
            if (FirebaseApp.getApps().isEmpty()) {
                InputStream stream = resolveCredentialsStream();
                FirebaseOptions options = FirebaseOptions.builder()
                        .setCredentials(GoogleCredentials.fromStream(stream))
                        .build();
                FirebaseApp.initializeApp(options);
                log.info("Firebase inicializado");
            }
            return Optional.of(FirestoreClient.getFirestore());
        } catch (Exception e) {
            throw new IllegalStateException("Falha ao inicializar Firebase: " + e.getMessage(), e);
        }
    }

    private InputStream resolveCredentialsStream() throws Exception {
        if (serviceAccountJson != null && !serviceAccountJson.isBlank()) {
            return new ByteArrayInputStream(serviceAccountJson.getBytes(StandardCharsets.UTF_8));
        }
        if (serviceAccountB64 != null && !serviceAccountB64.isBlank()) {
            byte[] decoded = Base64.getDecoder().decode(serviceAccountB64.trim());
            return new ByteArrayInputStream(decoded);
        }
        if (credentialsPath != null && !credentialsPath.isBlank()) {
            return new FileInputStream(credentialsPath.trim());
        }
        throw new IllegalStateException(
                "Credenciais Firebase não configuradas. Defina GOOGLE_APPLICATION_CREDENTIALS, "
                        + "FIREBASE_SERVICE_ACCOUNT_JSON ou FIREBASE_SERVICE_ACCOUNT_B64.");
    }
}
