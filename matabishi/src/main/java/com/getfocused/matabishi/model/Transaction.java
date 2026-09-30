package com.getfocused.matabishi.model;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "transactions")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor
public class Transaction {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id; // Identifiant unique pour recherche d'incident

    private String referenceInterne; // ex: MAT-2026-0001

    @ManyToOne
    @JoinColumn(name = "agence_id")
    private Agence agence;

    @ManyToOne
    @JoinColumn(name = "service_id")
    private ServiceEntreprise service;

    @ManyToOne
    @JoinColumn(name = "compte_comptable")
    private PlanComptable compteComptable;

    @ManyToOne
    @JoinColumn(name = "caisse_id")
    private CompteCaisse caisse;

    private BigDecimal montant;
    private String devise; // USD ou CDF
    private BigDecimal tauxApplique;

    @Enumerated(EnumType.STRING)
    private TypeMouvement type; // ENTREE, SORTIE

    private String libelle;

    @Enumerated(EnumType.STRING)
    private StatutTransaction statut = StatutTransaction.EN_ATTENTE;

    private LocalDateTime dateCreation = LocalDateTime.now();
    private LocalDateTime dateValidation;

    @ManyToOne
    @JoinColumn(name = "createur_id")
    private Utilisateur createur;

    @ManyToOne
    @JoinColumn(name = "validateur_id")
    private Utilisateur validateur;
}

