package com.getfocused.matabishi.security;

import com.getfocused.matabishi.model.Utilisateur;
import com.getfocused.matabishi.repository.UtilisateurRepository;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;

@Component
@RequiredArgsConstructor
public class JwtFilter extends OncePerRequestFilter {

    private final UtilisateurRepository utilisateurRepository;
    private final String SECRET_KEY = "votre_cle_secrete_tres_longue_matabishi_pro_max_2026";

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {

        String authHeader = request.getHeader("Authorization");

        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            filterChain.doFilter(request, response);
            return;
        }

        String token = authHeader.substring(7);
        try {
            Claims claims = Jwts.parser()
                    .setSigningKey(Keys.hmacShaKeyFor(SECRET_KEY.getBytes()))
                    .build()
                    .parseClaimsJws(token)
                    .getBody();

            String email = claims.getSubject();
            String sessionId = (String) claims.get("sessionId");
            String role = (String) claims.get("role");

            // --- VÉRIFICATION DE LA SESSION UNIQUE ---
            Utilisateur user = utilisateurRepository.findByEmail(email).orElse(null);

            if (user != null && user.isActif()) {
                // On vérifie si le sessionId du token correspond à l'un des deux slots actifs
                boolean sessionValide = sessionId.equals(user.getCurrentWebSessionId())
                        || sessionId.equals(user.getCurrentMobileSessionId());

                if (sessionValide || user.isExempt()) {
                    var authToken = new UsernamePasswordAuthenticationToken(
                            email, null, List.of(new SimpleGrantedAuthority("ROLE_" + role))
                    );
                    SecurityContextHolder.getContext().setAuthentication(authToken);
                }
            }
        } catch (Exception e) {
            SecurityContextHolder.clearContext();
        }

        filterChain.doFilter(request, response);
    }
}