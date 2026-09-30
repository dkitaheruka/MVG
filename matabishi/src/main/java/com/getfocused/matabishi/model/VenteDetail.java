package com.getfocused.matabishi.model;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;

@Entity
@Table(name = "vente_details")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor
public class VenteDetail {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "article_id")
    private Article article;

    private Double quantite;
    private BigDecimal prixUnitaireApplique;
}