package com.getfocused.matabishi.repository;

import com.getfocused.matabishi.model.CompteCaisse;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;

public interface CompteCaisseRepository extends JpaRepository<CompteCaisse, Long> {

    // Lister tous les coffres/comptes d'une agence
    List<CompteCaisse> findByAgenceId(Long agenceId);

    // Utile pour les tableaux de bord : Somme totale d'une agence en USD
    @Query("SELECT SUM(c.soldeUsd) FROM CompteCaisse c WHERE c.agence.id = :agenceId")
    java.math.BigDecimal getTotalSoldeUsdParAgence(@Param("agenceId") Long agenceId);
}