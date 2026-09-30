package com.getfocused.matabishi.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "ordres_production")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor
public class OrdreProduction {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "agence_id")
    private Agence agence;

    @ManyToOne
    @JoinColumn(name = "produit_fini_id")
    private Article produitFini;

    private Double quantitePrevue;
    private Double quantiteProduiteReelle;
    private Double perteDeclaree; // Gestion des déchets

    @Enumerated(EnumType.STRING)
    private StatutProduction statut; // PLANIFIE, EN_COURS, TERMINE, ANNULE

    private LocalDateTime dateLancement;
    private LocalDateTime dateFin;

    @ManyToOne
    @JoinColumn(name = "responsable_id")
    private Utilisateur responsable;
}

