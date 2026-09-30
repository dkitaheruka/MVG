package com.getfocused.matabishi.service;

import com.getfocused.matabishi.model.*;
import com.getfocused.matabishi.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class VenteService {

    private final VenteRepository venteRepo;
    private final StockAgenceRepository stockRepo;
    private final CompteCaisseRepository caisseRepo;
    private final TransactionRepository transactionRepo;
    private final DocumentCommercialRepository documentRepo;
    private final ClientRepository clientRepo;
    private final AuditService auditService;

    @Transactional
    public Vente enregistrerVente(Vente vente) {
        if (vente.getReferenceVente() == null || vente.getReferenceVente().isBlank()) {
            vente.setReferenceVente("VTE-" + System.currentTimeMillis());
        }

        // 1. Décrémenter le stock immédiatement pour chaque produit
        if (vente.getDetails() != null) {
            for (VenteDetail detail : vente.getDetails()) {
                actualiserStockVente(vente.getAgence().getId(), detail.getArticle().getId(), detail.getQuantite());
            }
        }

        // 2. Gestion financière
        if (!vente.isEstCredit()) {
            // Vente CASH : On crée une transaction financière auto-validée et le reçu
            vente.setStatutCredit(StatutCredit.AUCUN);
            Vente saved = venteRepo.save(vente);
            genererFluxCaisseAutomatique(saved);
            genererDocumentCommercial(saved, TypeDocument.RECU);
            return saved;
        } else {
            // Vente CREDIT : On met en attente de validation par le Chef
            vente.setStatutCredit(StatutCredit.EN_ATTENTE);
            Vente saved = venteRepo.save(vente);
            genererDocumentCommercial(saved, TypeDocument.FACTURE);
            return saved;
        }
    }

    @Transactional
    public Vente validerCredit(Long venteId, Utilisateur chef) {
        Vente vente = venteRepo.findById(venteId)
                .orElseThrow(() -> new RuntimeException("Vente non trouvée avec l'ID " + venteId));
        if (vente.getStatutCredit() != StatutCredit.EN_ATTENTE) {
            throw new RuntimeException("Statut invalide pour validation : " + vente.getStatutCredit());
        }

        // Augmenter la dette du client si un client est rattaché
        if (vente.getClient() != null) {
            Client client = vente.getClient();
            BigDecimal detteActuelle = client.getSoldeDette() != null ? client.getSoldeDette() : BigDecimal.ZERO;
            client.setSoldeDette(detteActuelle.add(vente.getMontantTotal()));
            clientRepo.save(client);
        }

        vente.setStatutCredit(StatutCredit.VALIDE);
        Vente saved = venteRepo.save(vente);

        if (chef != null) {
            auditService.journaliser("VALIDATION_CREDIT", "Validation crédit vente " + vente.getReferenceVente() + " (" + vente.getMontantTotal() + " " + vente.getDevise() + ")", chef.getEmail(), null);
        }
        return saved;
    }

    @Transactional
    public Vente rejeterCredit(Long venteId, Utilisateur chef, String motif) {
        Vente vente = venteRepo.findById(venteId)
                .orElseThrow(() -> new RuntimeException("Vente non trouvée avec l'ID " + venteId));
        if (vente.getStatutCredit() != StatutCredit.EN_ATTENTE) {
            throw new RuntimeException("Impossible de rejeter une vente qui n'est pas en attente.");
        }

        // Rétablissement du stock
        if (vente.getDetails() != null && vente.getAgence() != null) {
            for (VenteDetail detail : vente.getDetails()) {
                restaurerStock(vente.getAgence().getId(), detail.getArticle().getId(), detail.getQuantite());
            }
        }

        vente.setStatutCredit(StatutCredit.REJETE);
        Vente saved = venteRepo.save(vente);

        if (chef != null) {
            auditService.journaliser("REJET_CREDIT", "Rejet crédit vente " + vente.getReferenceVente() + (motif != null ? " - Motif: " + motif : ""), chef.getEmail(), null);
        }
        return saved;
    }

    private void actualiserStockVente(Long agenceId, Long articleId, Double quantite) {
        StockAgence stock = stockRepo.findByAgenceId(agenceId).stream()
                .filter(s -> s.getArticle() != null && s.getArticle().getId().equals(articleId))
                .findFirst()
                .orElseThrow(() -> new RuntimeException("Stock épuisé ou inexistant pour l'article ID " + articleId));

        if (stock.getQuantite() == null || stock.getQuantite() < quantite) {
            throw new RuntimeException("Stock insuffisant pour l'article " + (stock.getArticle() != null ? stock.getArticle().getDesignation() : articleId));
        }
        stock.setQuantite(stock.getQuantite() - quantite);
        stockRepo.save(stock);
    }

    private void restaurerStock(Long agenceId, Long articleId, Double quantite) {
        stockRepo.findByAgenceId(agenceId).stream()
                .filter(s -> s.getArticle() != null && s.getArticle().getId().equals(articleId))
                .findFirst()
                .ifPresent(stock -> {
                    double actuelle = stock.getQuantite() != null ? stock.getQuantite() : 0.0;
                    stock.setQuantite(actuelle + quantite);
                    stockRepo.save(stock);
                });
    }

    private void genererFluxCaisseAutomatique(Vente vente) {
        if (vente.getAgence() == null || vente.getMontantTotal() == null) return;

        List<CompteCaisse> caisses = caisseRepo.findByAgenceId(vente.getAgence().getId());
        CompteCaisse caisse;
        if (caisses.isEmpty()) {
            caisse = new CompteCaisse();
            caisse.setAgence(vente.getAgence());
            caisse.setNom("Caisse Principale");
            caisse.setSoldeUsd(BigDecimal.ZERO);
            caisse.setSoldeCdf(BigDecimal.ZERO);
            caisse = caisseRepo.save(caisse);
        } else {
            caisse = caisses.get(0);
        }

        // Incrémentation caisse selon devise
        if ("USD".equalsIgnoreCase(vente.getDevise())) {
            BigDecimal actuel = caisse.getSoldeUsd() != null ? caisse.getSoldeUsd() : BigDecimal.ZERO;
            caisse.setSoldeUsd(actuel.add(vente.getMontantTotal()));
        } else {
            BigDecimal actuel = caisse.getSoldeCdf() != null ? caisse.getSoldeCdf() : BigDecimal.ZERO;
            caisse.setSoldeCdf(actuel.add(vente.getMontantTotal()));
        }
        caisseRepo.save(caisse);

        // Création de la transaction financière
        Transaction tx = new Transaction();
        tx.setReferenceInterne("MAT-VTE-" + System.currentTimeMillis());
        tx.setAgence(vente.getAgence());
        tx.setCaisse(caisse);
        tx.setMontant(vente.getMontantTotal());
        tx.setDevise(vente.getDevise());
        tx.setTauxApplique(BigDecimal.ONE);
        tx.setType(TypeMouvement.ENTREE);
        tx.setLibelle("Encaissement vente comptant " + vente.getReferenceVente());
        tx.setStatut(StatutTransaction.VALIDE);
        tx.setDateCreation(LocalDateTime.now());
        tx.setDateValidation(LocalDateTime.now());
        tx.setCreateur(vente.getVendeur());
        tx.setValidateur(vente.getVendeur());
        transactionRepo.save(tx);
    }

    private void genererDocumentCommercial(Vente vente, TypeDocument type) {
        DocumentCommercial doc = new DocumentCommercial();
        doc.setReference("DOC-" + (type == TypeDocument.RECU ? "REC-" : "FAC-") + System.currentTimeMillis());
        doc.setType(type);
        doc.setSourceModule("VENTES");
        doc.setSourceId(String.valueOf(vente.getId()));
        doc.setAgence(vente.getAgence());
        doc.setGenerePar(vente.getVendeur());
        doc.setDateGeneration(LocalDateTime.now());
        documentRepo.save(doc);
    }
}