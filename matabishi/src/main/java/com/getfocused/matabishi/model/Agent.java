package com.getfocused.matabishi.model;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDate;

@Entity
@Table(name = "agents")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor
public class Agent {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String nom;
    private String matricule; // ex: MAT-AG-001

    @ManyToOne
    @JoinColumn(name = "agence_id")
    private Agence agence;

    @ManyToOne
    @JoinColumn(name = "service_id")
    private ServiceEntreprise service;

    private BigDecimal salaireBase;
    private String deviseSalaire; // USD ou CDF

    private LocalDate dateEmbauche;
    private boolean actif = true;

    private BigDecimal tauxCommission = BigDecimal.ZERO; // ex: 0.02 pour 2%
}