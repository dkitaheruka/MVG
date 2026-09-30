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
@Table(name = "taux_change_agence")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class TauxChangeAgence {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "agence_id")
    private Agence agence;

    @Column(nullable = false, precision = 15, scale = 2)
    private BigDecimal tauxUsdCdf;

    private String motif;
    private boolean actif = true;
    private LocalDateTime dateDebut = LocalDateTime.now();

    @ManyToOne
    @JoinColumn(name = "defini_par_id")
    private Utilisateur definiPar;
}
