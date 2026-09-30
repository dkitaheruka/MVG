package com.getfocused.matabishi.model;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;

@Entity
@Table(name = "comptes_caisse")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor
public class CompteCaisse {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "agence_id")
    private Agence agence;

    private String nom; // ex: "Caisse Principale", "M-Pesa Business"

    @Column(precision = 18, scale = 2)
    private BigDecimal soldeUsd = BigDecimal.ZERO;

    @Column(precision = 18, scale = 2)
    private BigDecimal soldeCdf = BigDecimal.ZERO;
}