package com.getfocused.matabishi.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.getfocused.matabishi.model.*;
import com.getfocused.matabishi.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class SyncOperationService {

    private final SyncOperationRepository syncRepository;
    private final VenteService venteService;
    private final VenteRepository venteRepository;
    private final StockAgenceRepository stockAgenceRepository;
    private final AuditService auditService;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Transactional
    public SyncOperation synchroniser(SyncOperation operation, Utilisateur currentUser) {
        // 1. Idempotence : Si l'opération a déjà été traitée, on la retourne immédiatement
        Optional<SyncOperation> existante = syncRepository.findByClientOperationId(operation.getClientOperationId());
        if (existante.isPresent()) {
            return existante.get();
        }

        if (operation.getUtilisateur() == null && currentUser != null) {
            operation.setUtilisateur(currentUser);
        }
        if (operation.getAgence() == null && currentUser != null && currentUser.getAgence() != null) {
            operation.setAgence(currentUser.getAgence());
        }

        operation.setDateReception(LocalDateTime.now());

        // 2. Traitement selon le type d'opération
        if ("VENTE".equalsIgnoreCase(operation.getTypeOperation())) {
            traiterVenteHorsLigne(operation);
        } else {
            // Type générique accepté
            operation.setStatut(StatutSyncOperation.ACCEPTEE);
            operation.setMessage("Opération synchronisée avec succès");
            operation.setDateTraitement(LocalDateTime.now());
        }

        SyncOperation saved = syncRepository.save(operation);

        if (currentUser != null) {
            auditService.journaliser(
                    "SYNC_OPERATION",
                    "Synchronisation " + operation.getTypeOperation() + " - " + operation.getClientOperationId() + " (" + operation.getStatut() + ")",
                    currentUser.getEmail(),
                    null
            );
        }

        return saved;
    }

    private void traiterVenteHorsLigne(SyncOperation operation) {
        try {
            if (operation.getPayloadJson() == null || operation.getPayloadJson().isBlank()) {
                operation.setStatut(StatutSyncOperation.REJETEE);
                operation.setMessage("Payload JSON de vente vide ou invalide");
                operation.setDateTraitement(LocalDateTime.now());
                return;
            }

            Vente vente = objectMapper.readValue(operation.getPayloadJson(), Vente.class);
            if (vente.getAgence() == null && operation.getAgence() != null) {
                vente.setAgence(operation.getAgence());
            }
            if (vente.getVendeur() == null && operation.getUtilisateur() != null) {
                vente.setVendeur(operation.getUtilisateur());
            }

            // Vérification des stocks pour détecter le risque de stock négatif offline
            boolean aStockNegatif = false;
            Long agenceId = vente.getAgence() != null ? vente.getAgence().getId() : 1L;

            if (vente.getDetails() != null) {
                for (VenteDetail detail : vente.getDetails()) {
                    if (detail.getArticle() != null) {
                        Long artId = detail.getArticle().getId();
                        StockAgence stock = trouverStock(agenceId, artId);
                        if (stock == null || stock.getQuantite() == null || stock.getQuantite() < detail.getQuantite()) {
                            aStockNegatif = true;
                            // Enregistre quand même la décrémentation (stock négatif autorisé en offline)
                            if (stock != null) {
                                double dispo = stock.getQuantite() != null ? stock.getQuantite() : 0.0;
                                stock.setQuantite(dispo - detail.getQuantite());
                                stockAgenceRepository.save(stock);
                            }
                        }
                    }
                }
            }

            if (aStockNegatif) {
                operation.setStockNegatifSignale(true);
                operation.setStatut(StatutSyncOperation.ACCEPTEE_STOCK_NEGATIF);
                operation.setMessage("Vente acceptée avec signalement de stock négatif - arbitrage requis par le Chef d'Agence");
            } else {
                operation.setStatut(StatutSyncOperation.ACCEPTEE);
                operation.setMessage("Vente synchronisée et stocks mis à jour avec succès");
            }

            // Enregistrement de la vente
            venteRepository.save(vente);
            operation.setDateTraitement(LocalDateTime.now());

        } catch (Exception e) {
            operation.setStatut(StatutSyncOperation.CONFLIT);
            operation.setMessage("Erreur lors de l'intégration de la vente : " + e.getMessage());
            operation.setDateTraitement(LocalDateTime.now());
        }
    }

    @Transactional
    public SyncOperation regulariserStockNegatif(Long syncOpId, Double quantiteAjout, Utilisateur chef) {
        SyncOperation op = syncRepository.findById(syncOpId)
                .orElseThrow(() -> new RuntimeException("Opération de synchronisation introuvable : " + syncOpId));

        if (!op.isStockNegatifSignale()) {
            throw new RuntimeException("Cette opération ne présente aucun stock négatif à régulariser.");
        }

        // Si une quantité de réapprovisionnement est spécifiée, on l'ajoute au stock
        if (quantiteAjout != null && quantiteAjout > 0 && op.getAgence() != null) {
            try {
                Vente vente = objectMapper.readValue(op.getPayloadJson(), Vente.class);
                if (vente.getDetails() != null) {
                    for (VenteDetail d : vente.getDetails()) {
                        if (d.getArticle() != null) {
                            StockAgence stock = trouverStock(op.getAgence().getId(), d.getArticle().getId());
                            if (stock != null) {
                                double qte = stock.getQuantite() != null ? stock.getQuantite() : 0.0;
                                stock.setQuantite(qte + quantiteAjout);
                                stockAgenceRepository.save(stock);
                            }
                        }
                    }
                }
            } catch (Exception ignored) {}
        }

        op.setStockNegatifSignale(false);
        op.setStatut(StatutSyncOperation.ACCEPTEE);
        op.setMessage("Stock régularisé avec succès par " + (chef != null ? chef.getEmail() : "le Chef d'Agence"));
        op.setDateTraitement(LocalDateTime.now());

        SyncOperation saved = syncRepository.save(op);

        if (chef != null) {
            auditService.journaliser(
                    "REGULARISATION_STOCK_OFFLINE",
                    "Régularisation stock négatif pour opération " + op.getClientOperationId(),
                    chef.getEmail(),
                    null
            );
        }

        return saved;
    }

    private StockAgence trouverStock(Long agenceId, Long articleId) {
        return stockAgenceRepository.findByAgenceId(agenceId).stream()
                .filter(s -> s.getArticle() != null && s.getArticle().getId().equals(articleId))
                .findFirst()
                .orElse(null);
    }
}
