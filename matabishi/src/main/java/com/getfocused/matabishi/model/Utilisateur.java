package com.getfocused.matabishi.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.util.Set;

@Entity
@Table(name = "utilisateurs")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor
public class Utilisateur {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String nom;

    @Column(unique = true, nullable = false)
    private String email;

    private String password;
    private String role;

    @ManyToOne
    @JoinColumn(name = "role_personnalise_id")
    private RoleUtilisateur rolePersonnalise;

    @ManyToOne
    @JoinColumn(name = "agence_id")
    private Agence agence;

    @ManyToMany
    @JoinTable(
            name = "affectations_services",
            joinColumns = @JoinColumn(name = "utilisateur_id"),
            inverseJoinColumns = @JoinColumn(name = "service_id")
    )
    private Set<ServiceEntreprise> services;

    // --- SÉCURITÉ & SESSIONS ---
    private int failedAttempts = 0;
    private boolean isSuspicious = false;
    private String verificationCode;
    private LocalDateTime codeExpiration;
    private String currentWebSessionId;
    private String currentMobileSessionId;
    private boolean actif = true;

    // --- OPTIONS AVANCÉES ---
    private boolean isExempt = false; // VIP : pas d'archivage, notification si double login
    private boolean mustChangePassword = false; // Forcer le changement après reset
}
