package com.clinica.bot.config;

import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Getter
@Component
@RequiredArgsConstructor
public class DatabaseMode {

    private final ClinicaProperties properties;

    public String getRead() {
        String read = normalize(properties.getDatabase().getRead());
        return isMongo(read) ? "mongo" : "firestore";
    }

    public String getWrite() {
        String write = normalize(properties.getDatabase().getWrite());
        if ("dual".equals(write) || "both".equals(write)) {
            return "dual";
        }
        return isMongo(write) ? "mongo" : "firestore";
    }

    public boolean useMongo() {
        return "mongo".equals(getRead()) || "mongo".equals(getWrite()) || "dual".equals(getWrite());
    }

    public boolean useFirestore() {
        return !"mongo".equals(getRead()) || "dual".equals(getWrite()) || "firestore".equals(getWrite());
    }

    public boolean needsFirebaseInit() {
        return useFirestore();
    }

    public boolean needsMongoInit() {
        return useMongo();
    }

    private static String normalize(String value) {
        return value == null ? "" : value.trim().toLowerCase();
    }

    private static boolean isMongo(String value) {
        return "mongo".equals(value) || "mongodb".equals(value);
    }
}
