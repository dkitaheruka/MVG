package com.getfocused.matabishi.service;

import com.getfocused.matabishi.model.RapportPerformance;
import com.getfocused.matabishi.model.Transaction;
import com.getfocused.matabishi.repository.TransactionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ReportingService {

    private final TransactionRepository transactionRepo;

    public RapportPerformance genererRapportGlobal() {
        // Récupérer toutes les transactions validées (Siège voit tout)
        List<Transaction> transactions = transactionRepo.findAll().stream()
                .filter(t -> "VALIDE".equals(t.getStatut().name()))
                .toList();

        // 1. Total Recettes en USD pur
        BigDecimal usd = transactions.stream()
                .filter(t -> "USD".equals(t.getDevise()) && "ENTREE".equals(t.getType().name()))
                .map(Transaction::getMontant)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        // 2. Total Recettes en CDF pur
        BigDecimal cdf = transactions.stream()
                .filter(t -> "CDF".equals(t.getDevise()) && "ENTREE".equals(t.getType().name()))
                .map(Transaction::getMontant)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        // 3. Consolidation (Conversion automatique selon le taux saisi à chaque opération)
        BigDecimal consolide = transactions.stream()
                .filter(t -> "ENTREE".equals(t.getType().name()))
                .map(t -> {
                    if ("USD".equals(t.getDevise())) return t.getMontant();
                    // Si CDF, on convertit en USD : Montant / TauxAppliqué
                    return t.getMontant().divide(t.getTauxApplique(), 2, RoundingMode.HALF_UP);
                })
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        return new RapportPerformance(usd, cdf, consolide, transactions.size());
    }
}