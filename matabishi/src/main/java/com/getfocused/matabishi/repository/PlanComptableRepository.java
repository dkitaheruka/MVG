package com.getfocused.matabishi.repository;

import com.getfocused.matabishi.model.PlanComptable;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface PlanComptableRepository extends JpaRepository<PlanComptable, String> {
    // Requis par PlanComptableService.listerToutLePlan()
    List<PlanComptable> findAllByOrderByNumeroAsc();

    List<PlanComptable> findByNumeroStartingWith(String prefixe);
}