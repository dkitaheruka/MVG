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

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "lots_production")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class LotProduction {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String numeroLot;

    @ManyToOne
    @JoinColumn(name = "article_id")
    private Article article;

    @ManyToOne
    @JoinColumn(name = "agence_id")
    private Agence agence;

    @ManyToOne
    @JoinColumn(name = "ordre_production_id")
    private OrdreProduction ordreProduction;

    private Double quantiteProduite;
    private LocalDate dateExpiration;

    @Column(columnDefinition = "text")
    private String qrPayload;

    private String qrSignature;
    private boolean bloque = false;
    private LocalDateTime dateCreation = LocalDateTime.now();
}
