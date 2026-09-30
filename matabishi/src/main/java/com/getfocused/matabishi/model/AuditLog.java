package com.getfocused.matabishi.model;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Getter
@Setter
@NoArgsConstructor
public class AuditLog {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private String action; // ex: "VALIDATION_CREDIT", "MODIF_PLAN_COMPTABLE"
    private String details;
    private String utilisateurEmail;
    private LocalDateTime dateAction = LocalDateTime.now();
    private String adresseIp;

    public AuditLog(String action, String details, String utilisateurEmail, String adresseIp) {
        this.action = action;
        this.details = details;
        this.utilisateurEmail = utilisateurEmail;
        this.adresseIp = adresseIp;
    }
}
