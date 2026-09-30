package com.getfocused.matabishi.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDate;

@Entity
@Table(name = "stocks_agence")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor
public class StockAgence {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "article_id")
    private Article article;

    @ManyToOne
    @JoinColumn(name = "agence_id")
    private Agence agence;

    private Double quantite;

    private String numeroLot; // Pour la traçabilité usine

    private LocalDate dateExpiration; // Précision pro demandée

    private Double seuilAlerte; // Pour prévenir quand le stock est bas
}