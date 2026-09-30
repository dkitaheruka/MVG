package com.getfocused.matabishi.model;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "bulletins_paie")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor
public class BulletinPaie {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    private Agent agent;

    private int mois;
    private int annee;

    private BigDecimal salaireBase;
    private BigDecimal primes;
    private BigDecimal avances; // Déduit automatiquement
    private BigDecimal netAPayer;

    private boolean estPaye = false;
    private LocalDateTime datePaiement;

    @OneToOne
    @JoinColumn(name = "transaction_id")
    private Transaction transactionComptable; // Lien avec le Module 5
}