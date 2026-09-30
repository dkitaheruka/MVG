package com.getfocused.matabishi.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
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
@Table(name = "sync_operations")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class SyncOperation {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String clientOperationId;

    private String typeOperation;

    @Column(columnDefinition = "text")
    private String payloadJson;

    @Enumerated(EnumType.STRING)
    private StatutSyncOperation statut = StatutSyncOperation.EN_ATTENTE;

    private String message;
    private boolean stockNegatifSignale = false;
    private LocalDateTime dateCreationClient;
    private LocalDateTime dateReception = LocalDateTime.now();
    private LocalDateTime dateTraitement;

    @ManyToOne
    @JoinColumn(name = "utilisateur_id")
    private Utilisateur utilisateur;

    @ManyToOne
    @JoinColumn(name = "agence_id")
    private Agence agence;

    @ManyToOne
    @JoinColumn(name = "appareil_id")
    private AppareilAutorise appareil;
}
