package com.getfocused.matabishi.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "ecritures_comptables")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class EcritureComptable {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private UUID referenceOperation;

    @ManyToOne
    @JoinColumn(name = "agence_id")
    private Agence agence;

    @ManyToOne
    @JoinColumn(name = "compte_numero")
    private PlanComptable compte;

    @Enumerated(EnumType.STRING)
    private SensEcriture sens;

    @Column(nullable = false, precision = 18, scale = 2)
    private BigDecimal montant;

    @Column(nullable = false)
    private String devise;

    @Column(precision = 15, scale = 2)
    private BigDecimal tauxApplique;

    private String libelle;
    private String sourceModule;
    private String sourceType;
    private String sourceId;
    private boolean annulee = false;
    private LocalDateTime dateEcriture = LocalDateTime.now();

    @ManyToOne
    @JoinColumn(name = "utilisateur_id")
    private Utilisateur utilisateur;
}
