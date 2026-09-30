package com.getfocused.matabishi.model;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;

@Entity
@Table(name = "agences")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor
public class Agence {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String nom;
    private String ville;
    private String adresse;

    @Column(precision = 10, scale = 2)
    private BigDecimal tauxUsdCdfLocal;

    private boolean estSiege = false;
}