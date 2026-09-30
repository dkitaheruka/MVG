package com.getfocused.matabishi.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
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

@Entity
@Table(name = "prix_articles_agence")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class PrixArticleAgence {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "agence_id")
    private Agence agence;

    @ManyToOne
    @JoinColumn(name = "article_id")
    private Article article;

    @Column(nullable = false, precision = 15, scale = 2)
    private BigDecimal prix;

    @Column(nullable = false)
    private String devise;

    private boolean actif = true;
    private LocalDateTime dateDebut = LocalDateTime.now();
    private LocalDateTime dateFin;

    @ManyToOne
    @JoinColumn(name = "defini_par_id")
    private Utilisateur definiPar;
}
