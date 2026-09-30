package com.getfocused.matabishi.model;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;

@Entity
@Table(name = "articles")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor
public class Article {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String codeUnique; // SKU ou Code barre
    private String designation;

    @Enumerated(EnumType.STRING)
    private TypeArticle type; // MATIERE_PREMIERE, PRODUIT_FINI

    @ManyToOne
    @JoinColumn(name = "categorie_id")
    private Categorie categorie;

    private String uniteMesure; // Kg, Litre, Pièce, Cartouche

    @Column(precision = 15, scale = 2)
    private BigDecimal prixVenteStandard;

    private boolean alerteExpiration = false; // Si l'article doit être suivi par date d'expiration
}

enum TypeArticle { MATIERE_PREMIERE, PRODUIT_FINI }