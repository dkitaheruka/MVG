package com.getfocused.matabishi.repository;

import com.getfocused.matabishi.model.StockAgence;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.time.LocalDate;
import java.util.List;

public interface StockAgenceRepository extends JpaRepository<StockAgence, Long> {
    // Requis par StockService.getStockParAgence() et ProductionService.actualiserStock()
    List<StockAgence> findByAgenceId(Long agenceId);

    // Requis par StockService.getAlertesExpiration()
    List<StockAgence> findByAgenceIdAndDateExpirationBefore(Long agenceId, LocalDate date);

    // Requis par StockService.getAlertesRupture()
    @Query("SELECT s FROM StockAgence s WHERE s.quantite <= s.seuilAlerte AND s.agence.id = :agenceId")
    List<StockAgence> findProduitsEnAlerte(@Param("agenceId") Long agenceId);
}