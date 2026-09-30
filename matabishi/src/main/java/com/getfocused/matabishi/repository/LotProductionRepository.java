package com.getfocused.matabishi.repository;

import com.getfocused.matabishi.model.LotProduction;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface LotProductionRepository extends JpaRepository<LotProduction, Long> {
    Optional<LotProduction> findByNumeroLot(String numeroLot);
    List<LotProduction> findByAgenceId(Long agenceId);
    List<LotProduction> findByArticleId(Long articleId);
}
