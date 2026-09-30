package com.getfocused.matabishi.service;

import com.getfocused.matabishi.model.*;
import com.getfocused.matabishi.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class TresorerieService {

    private final TransactionRepository transactionRepo;
    private final CompteCaisseRepository caisseRepo;
    private final EcritureComptableRepository ecritureRepo;
    private final PlanComptableRepository planComptableRepo;

    // ─── Création d'une demande ────────────────────────────────────────────────
    @Transactional
    public Transaction creerDemande(Transaction transaction) {
        transaction.setStatut(StatutTransaction.EN_ATTENTE);
        transaction.setReferenceInterne("MAT-" + System.currentTimeMillis());
        return transactionRepo.save(transaction);
    }

    // ─── Validation avec double écriture OHADA ─────────────────────────────────
    @Transactional
    public Transaction validerTransaction(UUID transactionId, Utilisateur chef) {
        Transaction tx = transactionRepo.findById(transactionId).orElseThrow(
            () -> new RuntimeException("Transaction introuvable : " + transactionId)
        );

        if (tx.getStatut() != StatutTransaction.EN_ATTENTE) {
            throw new RuntimeException("Transaction déjà traitée");
        }

        CompteCaisse caisse = tx.getCaisse();

        if (tx.getType() == TypeMouvement.SORTIE) {
            BigDecimal soldeActuel = "USD".equals(tx.getDevise())
                ? caisse.getSoldeUsd() : caisse.getSoldeCdf();
            if (soldeActuel.compareTo(tx.getMontant()) < 0) {
                throw new RuntimeException("Solde insuffisant dans la caisse " + caisse.getNom());
            }
            if ("USD".equals(tx.getDevise())) caisse.setSoldeUsd(caisse.getSoldeUsd().subtract(tx.getMontant()));
            else caisse.setSoldeCdf(caisse.getSoldeCdf().subtract(tx.getMontant()));
        } else {
            if ("USD".equals(tx.getDevise())) caisse.setSoldeUsd(caisse.getSoldeUsd().add(tx.getMontant()));
            else caisse.setSoldeCdf(caisse.getSoldeCdf().add(tx.getMontant()));
        }

        tx.setStatut(StatutTransaction.VALIDE);
        tx.setValidateur(chef);
        tx.setDateValidation(LocalDateTime.now());

        caisseRepo.save(caisse);
        transactionRepo.save(tx);

        // ── Génération des écritures comptables en partie double ──────────────
        genererEcrituresComptables(tx);

        return tx;
    }

    // ─── Rejet d'une demande ───────────────────────────────────────────────────
    @Transactional
    public Transaction rejeterTransaction(UUID transactionId, Utilisateur chef, String motif) {
        Transaction tx = transactionRepo.findById(transactionId).orElseThrow(
            () -> new RuntimeException("Transaction introuvable : " + transactionId)
        );

        if (tx.getStatut() != StatutTransaction.EN_ATTENTE) {
            throw new RuntimeException("Seules les transactions EN_ATTENTE peuvent être rejetées");
        }

        tx.setStatut(StatutTransaction.REJETE);
        tx.setValidateur(chef);
        tx.setDateValidation(LocalDateTime.now());
        if (motif != null && !motif.isBlank()) {
            String libelleActuel = tx.getLibelle() != null ? tx.getLibelle() : "";
            tx.setLibelle(libelleActuel + " [Motif rejet: " + motif + "]");
        }
        return transactionRepo.save(tx);
    }

    // ─── Logique de double ecriture OHADA ─────────────────────────────────────
    private void genererEcrituresComptables(Transaction tx) {
        UUID ref = UUID.randomUUID();
        LocalDateTime date = tx.getDateValidation() != null
            ? tx.getDateValidation()
            : LocalDateTime.now();

        String numeroCaisse = "USD".equals(tx.getDevise()) ? "572" : "571";
        PlanComptable compteCaisse = planComptableRepo.findById(numeroCaisse).orElse(null);

        // Determination du compte de contrepartie selon le libelle de la transaction
        String numeroContrepartie = determinerNumeroContrepartie(tx);
        PlanComptable compteContrepartie = planComptableRepo.findById(numeroContrepartie).orElse(null);

        if (compteCaisse == null || compteContrepartie == null) {
            // Plan comptable pas encore seede - on ne bloque pas la validation
            return;
        }

        if (tx.getType() == TypeMouvement.ENTREE) {
            // ENTREE : DEBIT Caisse / CREDIT Produit
            sauvegarderEcriture(ref, date, tx, compteCaisse, SensEcriture.DEBIT);
            sauvegarderEcriture(ref, date, tx, compteContrepartie, SensEcriture.CREDIT);
        } else {
            // SORTIE : DEBIT Charge / CREDIT Caisse
            sauvegarderEcriture(ref, date, tx, compteContrepartie, SensEcriture.DEBIT);
            sauvegarderEcriture(ref, date, tx, compteCaisse, SensEcriture.CREDIT);
        }
    }

    /**
     * Heuristique de selection du compte de contrepartie.
     * Priorite : compte explicitement lie a la transaction (si la Transaction
     * porte un champ compteComptable) ; sinon, regle sur le libelle / service.
     */
    private String determinerNumeroContrepartie(Transaction tx) {
        // Si la transaction a deja un compte comptable explicite, on l'utilise
        if (tx.getCompteComptable() != null) {
            return tx.getCompteComptable().getNumero();
        }

        String libelle = tx.getLibelle() != null ? tx.getLibelle().toLowerCase() : "";
        String service  = tx.getService() != null ? tx.getService().getNom().toLowerCase() : "";

        if (tx.getType() == TypeMouvement.ENTREE) {
            // Recette de vente de service
            if (libelle.contains("service") || service.contains("commercial")) return "706";
            // Recette de vente de produit fini
            if (libelle.contains("produit") || service.contains("production")) return "701";
            // Defaut produits : vente de marchandises
            return "707";
        } else {
            // Depenses de personnel
            if (libelle.contains("salaire") || libelle.contains("personnel")
                    || libelle.contains("prime") || service.contains("administration")) return "661";
            // Achats matieres premieres
            if (libelle.contains("matiere") || service.contains("production")) return "601";
            // Achats de marchandises
            if (libelle.contains("marchandise")) return "602";
            // Defaut charges : autres achats
            return "605";
        }
    }

    private void sauvegarderEcriture(UUID ref, LocalDateTime date, Transaction tx,
                                     PlanComptable compte, SensEcriture sens) {
        EcritureComptable e = new EcritureComptable();
        e.setReferenceOperation(ref);
        e.setDateEcriture(date);
        e.setCompte(compte);
        e.setSens(sens);
        e.setMontant(tx.getMontant());
        e.setDevise(tx.getDevise());
        e.setLibelle(tx.getLibelle());
        e.setAgence(tx.getAgence());
        e.setSourceModule("TRESORERIE");
        e.setSourceType("Transaction");
        e.setSourceId(tx.getId() != null ? tx.getId().toString() : null);
        ecritureRepo.save(e);
    }
}