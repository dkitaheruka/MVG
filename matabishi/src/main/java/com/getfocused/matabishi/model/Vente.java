package com.getfocused.matabishi.model;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Entity
@Table(name = "ventes")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor
public class Vente {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String referenceVente; // ex: VTE-2026-XXXX

    @ManyToOne
    @JoinColumn(name = "agence_id")
    private Agence agence;

    @ManyToOne
    @JoinColumn(name = "vendeur_id")
    private Utilisateur vendeur;

    @ManyToOne
    @JoinColumn(name = "client_id")
    private Client client;

    private BigDecimal montantTotal;
    private String devise;

    private boolean estCredit = false;

    @Enumerated(EnumType.STRING)
    private StatutCredit statutCredit = StatutCredit.AUCUN; // AUCUN, EN_ATTENTE, VALIDE

    private LocalDateTime dateVente = LocalDateTime.now();

    @OneToMany(cascade = CascadeType.ALL)
    @JoinColumn(name = "vente_id")
    private List<VenteDetail> details;
}

