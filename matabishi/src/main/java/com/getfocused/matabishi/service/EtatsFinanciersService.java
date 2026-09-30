package com.getfocused.matabishi.service;

import com.getfocused.matabishi.model.*;
import com.getfocused.matabishi.repository.TransactionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class EtatsFinanciersService {

    private final TransactionRepository transactionRepo;

    /**
     * Génère la Balance Générale (OHADA)
     * Regroupe les transactions par compte comptable avec colonnes USD, CDF et Consolidation.
     */
    @Transactional(readOnly = true)
    public List<LigneFinanciere> genererBalance(Long agenceId, int mois, int annee) {
        // 1. Récupération des transactions validées sur la période
        List<Transaction> transactions = recupererTransactionsValides(agenceId, mois, annee);

        // 2. Groupage par numéro de compte OHADA
        Map<String, List<Transaction>> parCompte = transactions.stream()
                .collect(Collectors.groupingBy(t -> t.getCompteComptable().getNumero()));

        // 3. Calcul des totaux par ligne
        return parCompte.entrySet().stream()
                .map(entry -> {
                    String numero = entry.getKey();
                    List<Transaction> txList = entry.getValue();
                    String libelle = txList.get(0).getCompteComptable().getLibelle();

                    BigDecimal debitUsd = calculerTotal(txList, "USD", "ENTREE");
                    BigDecimal creditUsd = calculerTotal(txList, "USD", "SORTIE");
                    BigDecimal debitCdf = calculerTotal(txList, "CDF", "ENTREE");
                    BigDecimal creditCdf = calculerTotal(txList, "CDF", "SORTIE");

                    // Consolidation (Total USD en utilisant le taux historique de chaque transaction)
                    BigDecimal totalConsolideUsd = txList.stream()
                            .map(this::calculerMontantConsolide)
                            .reduce(BigDecimal.ZERO, BigDecimal::add);

                    return new LigneFinanciere(numero, libelle, debitUsd, creditUsd, debitCdf, creditCdf, totalConsolideUsd);
                })
                .sorted((a, b) -> a.numeroCompte().compareTo(b.numeroCompte()))
                .toList();
    }

    /**
     * Génère le Compte de Résultat par Service (Analytique)
     * Calcule : Revenus (Classe 7) - Charges (Classe 6) pour chaque département.
     */
    @Transactional(readOnly = true)
    public List<ServicePerformance> genererPerformanceParService(Long agenceId, int mois, int annee) {
        List<Transaction> transactions = recupererTransactionsValides(agenceId, mois, annee);

        // Groupage par Service
        Map<ServiceEntreprise, List<Transaction>> parService = transactions.stream()
                .collect(Collectors.groupingBy(Transaction::getService));

        return parService.entrySet().stream()
                .map(entry -> {
                    String nomService = entry.getKey().getNom();
                    List<Transaction> txList = entry.getValue();

                    // Charges (Classe 6)
                    BigDecimal charges = txList.stream()
                            .filter(t -> t.getCompteComptable().getNumero().startsWith("6"))
                            .map(this::calculerMontantConsolide)
                            .reduce(BigDecimal.ZERO, BigDecimal::add);

                    // Produits (Classe 7)
                    BigDecimal produits = txList.stream()
                            .filter(t -> t.getCompteComptable().getNumero().startsWith("7"))
                            .map(this::calculerMontantConsolide)
                            .reduce(BigDecimal.ZERO, BigDecimal::add);

                    return new ServicePerformance(nomService, charges, produits, produits.subtract(charges));
                })
                .toList();
    }

    // --- MÉTHODES UTILITAIRES DE CALCUL ---

    private List<Transaction> recupererTransactionsValides(Long agenceId, int mois, int annee) {
        List<Transaction> all = (agenceId == null) ? transactionRepo.findAll() : transactionRepo.findByAgenceId(agenceId);

        return all.stream()
                .filter(t -> "VALIDE".equals(t.getStatut().name()))
                .filter(t -> t.getDateValidation().getMonthValue() == mois && t.getDateValidation().getYear() == annee)
                .toList();
    }

    private BigDecimal calculerTotal(List<Transaction> list, String devise, String typeMouvement) {
        return list.stream()
                .filter(t -> t.getDevise().equals(devise) && t.getType().name().equals(typeMouvement))
                .map(Transaction::getMontant)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private BigDecimal calculerMontantConsolide(Transaction t) {
        BigDecimal montantUsd;
        if ("USD".equals(t.getDevise())) {
            montantUsd = t.getMontant();
        } else {
            // Conversion CDF vers USD au taux historique enregistré dans la transaction
            montantUsd = t.getMontant().divide(t.getTauxApplique(), 2, RoundingMode.HALF_UP);
        }
        // Si c'est une sortie, on le compte en négatif pour le solde net
        return "SORTIE".equals(t.getType().name()) ? montantUsd.negate() : montantUsd;
    }
}