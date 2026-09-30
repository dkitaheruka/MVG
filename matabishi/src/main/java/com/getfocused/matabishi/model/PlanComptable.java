package com.getfocused.matabishi.model;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "plan_comptable")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor
public class PlanComptable {

    @Id
    private String numero; // La clé primaire est le numéro de compte (ex: "6011")

    @Column(nullable = false)
    private String libelle;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "parent_numero")
    private PlanComptable parent;

    private boolean estModifiable = true; // Permet de protéger les comptes racines

    // Méthode utilitaire pour obtenir la classe (1 à 9)
    public String getClasse() {
        return numero != null && !numero.isEmpty() ? numero.substring(0, 1) : "";
    }
}