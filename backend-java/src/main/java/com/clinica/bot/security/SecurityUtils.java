package com.clinica.bot.security;

import com.clinica.bot.exception.ApiException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

public final class SecurityUtils {

    private SecurityUtils() {}

    public static AuthUser currentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof AuthUser user) {
            return user;
        }
        return null;
    }

    public static AuthUser requireUser() {
        AuthUser user = currentUser();
        if (user == null) {
            throw new ApiException("Sessão inválida ou expirada", 401);
        }
        return user;
    }

    public static AuthUser optionalUserStrict(String authorization) {
        if (authorization != null && !authorization.isBlank() && currentUser() == null) {
            throw new ApiException("Sessão inválida ou expirada", 401);
        }
        return currentUser();
    }
}
