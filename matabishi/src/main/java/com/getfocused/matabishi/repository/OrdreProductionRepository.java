package com.getfocused.matabishi.repository;

import com.getfocused.matabishi.model.OrdreProduction;
import com.getfocused.matabishi.model.StatutProduction;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface OrdreProductionRepository extends JpaRepository<OrdreProduction, Long> {
    List<OrdreProduction> findByAgenceIdAndStatut(Long agenceId, StatutProduction statut);
}