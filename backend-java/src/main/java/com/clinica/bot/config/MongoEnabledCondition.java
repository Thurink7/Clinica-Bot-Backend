package com.clinica.bot.config;

import org.springframework.context.annotation.Condition;
import org.springframework.context.annotation.ConditionContext;
import org.springframework.core.env.Environment;
import org.springframework.core.type.AnnotatedTypeMetadata;

/**
 * Liga MongoDB quando DB_READ/DB_WRITE usam mongo ou dual — igual ao backend Node.
 */
public class MongoEnabledCondition implements Condition {

    @Override
    public boolean matches(ConditionContext context, AnnotatedTypeMetadata metadata) {
        Environment env = context.getEnvironment();
        String read = normalize(env.getProperty("clinica.database.read", "firestore"));
        String write = normalize(env.getProperty("clinica.database.write", "firestore"));
        return isMongo(read) || isMongo(write) || "dual".equals(write) || "both".equals(write);
    }

    private static String normalize(String value) {
        return value == null ? "" : value.trim().toLowerCase();
    }

    private static boolean isMongo(String value) {
        return "mongo".equals(value) || "mongodb".equals(value);
    }
}
