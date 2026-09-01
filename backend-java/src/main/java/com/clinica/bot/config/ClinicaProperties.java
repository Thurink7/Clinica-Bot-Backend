package com.clinica.bot.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Getter
@Setter
@Configuration
@ConfigurationProperties(prefix = "clinica")
public class ClinicaProperties {

    private Jwt jwt = new Jwt();
    private Cors cors = new Cors();
    private Database database = new Database();
    private Admin admin = new Admin();
    private Whatsapp whatsapp = new Whatsapp();
    private Twilio twilio = new Twilio();
    private Reminder reminder = new Reminder();

    @Getter
    @Setter
    public static class Jwt {
        private String secret;
        private int expirationDays = 7;
    }

    @Getter
    @Setter
    public static class Cors {
        private String extraOrigins = "";
    }

    @Getter
    @Setter
    public static class Database {
        private String read = "firestore";
        private String write = "firestore";
    }

    @Getter
    @Setter
    public static class Admin {
        private String bootstrapEmail = "";
        private String bootstrapPassword = "";
        private String bootstrapNome = "Administrador";
    }

    @Getter
    @Setter
    public static class Whatsapp {
        private String apiUrl = "";
        private String accessToken = "";
        private String phoneNumberId = "";
        private String verifyToken = "";
    }

    @Getter
    @Setter
    public static class Twilio {
        private String accountSid = "";
        private String authToken = "";
        private String whatsappFrom = "";
    }

    @Getter
    @Setter
    public static class Reminder {
        private int windowMinutes = 10;
    }
}
