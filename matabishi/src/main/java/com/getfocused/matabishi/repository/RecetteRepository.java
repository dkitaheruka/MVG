package com.getfocused.matabishi.repository;

import com.getfocused.matabishi.model.Recette;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface RecetteRepository extends JpaRepository<Recette, Long> {
    // Requis par ProductionService.terminerProduction()
    List<Recette> findByProduitFiniId(Long articleId);
}