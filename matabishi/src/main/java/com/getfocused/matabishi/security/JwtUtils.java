package com.getfocused.matabishi.security;

import com.getfocused.matabishi.model.Utilisateur;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.util.HashMap;
import java.util.Date;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Component
public class JwtUtils {
    private final String SECRET_KEY = "votre_cle_secrete_tres_longue_matabishi_pro_max_2026";
    private final SecretKey key = Keys.hmacShaKeyFor(SECRET_KEY.getBytes());

    public String generateToken(Utilisateur user, String sessionId) {
        Map<String, Object> claims = new HashMap<>();
        claims.put("agenceId", user.getAgence() == null ? null : user.getAgence().getId());
        claims.put("role", user.getRole());
        claims.put("sessionId", sessionId);
        claims.put("permissions", extrairePermissions(user));

        return Jwts.builder()
                .subject(user.getEmail())
                .claims(claims)
                .issuedAt(new Date())
                .expiration(new Date(System.currentTimeMillis() + 86400000)) // 24h
                .signWith(key)
                .compact();
    }

    private Set<String> extrairePermissions(Utilisateur user) {
        if (user.getRolePersonnalise() == null || user.getRolePersonnalise().getPermissions() == null) {
            return Set.of();
        }

        return user.getRolePersonnalise().getPermissions().stream()
                .map(permission -> permission.getCode())
                .collect(Collectors.toSet());
    }
}
