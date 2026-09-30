package com.getfocused.matabishi.repository;

import com.getfocused.matabishi.model.Transaction;
import com.getfocused.matabishi.model.StatutTransaction;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.UUID;
import java.util.List;

public interface TransactionRepository extends JpaRepository<Transaction, UUID> {
    // Requis par ReportingService.genererRapportFinancier()
    List<Transaction> findByAgenceId(Long agenceId);

    List<Transaction> findByStatut(StatutTransaction statut);

    List<Transaction> findByAgenceIdAndStatut(Long agenceId, StatutTransaction statut);
}
