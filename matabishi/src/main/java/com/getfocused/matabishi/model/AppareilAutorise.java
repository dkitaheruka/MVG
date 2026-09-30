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

import java.time.LocalDateTime;

@Entity
@Table(name = "appareils_autorises")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class AppareilAutorise {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "utilisateur_id")
    private Utilisateur utilisateur;

    @Column(nullable = false, unique = true)
    private String deviceId;

    private String nomAppareil;
    private String typeAppareil;
    private String plateforme;
    private boolean actif = true;
    private LocalDateTime dateAutorisation = LocalDateTime.now();
    private LocalDateTime derniereConnexion;
}
