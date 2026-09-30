package com.getfocused.matabishi.model;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "recettes")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor
public class Recette {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "produit_fini_id")
    private Article produitFini;

    @ManyToOne
    @JoinColumn(name = "matiere_premiere_id")
    private Article matierePremiere;

    private Double quantitePourUneUnite; // Quantité de matière nécessaire pour 1 unité de PF
}