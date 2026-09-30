package com.getfocused.matabishi.controller;

import com.getfocused.matabishi.service.AuthService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @PostMapping("/login")
    public ResponseEntity<?> login(
            @RequestBody Map<String, String> request,
            @RequestHeader(value = "X-Device-Type", defaultValue = "WEB") String deviceType,
            @RequestHeader(value = "X-Device-Id", required = false) String deviceId) {
        try {
            String result = authService.login(request.get("email"), request.get("password"), deviceType, deviceId);

            if ("2FA_REQUIRED".equals(result)) return ResponseEntity.ok("2FA_REQUIRED");
            if ("PASSWORD_CHANGE_REQUIRED".equals(result)) return ResponseEntity.ok("PASSWORD_CHANGE_REQUIRED");

            return ResponseEntity.ok(Map.of("token", result));
        } catch (RuntimeException e) {
            return ResponseEntity.status(403).body(Map.of("message", e.getMessage()));
        }
    }

    @PostMapping("/force-password-change")
    public ResponseEntity<?> changePassword(@RequestBody Map<String, String> request) {
        authService.changerMotDePasse(request.get("email"), request.get("newPassword"));
        return ResponseEntity.ok(Map.of("message", "Mot de passe mis à jour avec succès."));
    }

    @PostMapping("/verify-2fa")
    public ResponseEntity<?> verify2FA(
            @RequestBody Map<String, String> request,
            @RequestHeader(value = "X-Device-Type", defaultValue = "WEB") String deviceType,
            @RequestHeader(value = "X-Device-Id", required = false) String deviceId) {
        try {
            String token = authService.verifier2FA(request.get("email"), request.get("code"), deviceType, deviceId);
            return ResponseEntity.ok(Map.of("token", token));
        } catch (RuntimeException e) {
            return ResponseEntity.status(403).body(Map.of("message", e.getMessage()));
        }
    }

    // Endpoint réservé aux chefs pour réinitialiser un agent
    @PostMapping("/admin/reset-agent-password/{agentId}")
    public ResponseEntity<?> resetAgent(@PathVariable Long agentId) {
        // En prod, vérification que le demandeur est Chef d'agence
        String tempPass = authService.genererMotDePasseProvisoire(agentId, null);
        return ResponseEntity.ok(Map.of("temporaryPassword", tempPass));
    }
}
