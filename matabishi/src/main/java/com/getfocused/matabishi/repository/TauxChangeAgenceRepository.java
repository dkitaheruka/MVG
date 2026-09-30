package com.getfocused.matabishi.repository;

import com.getfocused.matabishi.model.TauxChangeAgence;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface TauxChangeAgenceRepository extends JpaRepository<TauxChangeAgence, Long> {
    List<TauxChangeAgence> findByAgenceIdOrderByDateDebutDesc(Long agenceId);
    Optional<TauxChangeAgence> findFirstByAgenceIdAndActifTrueOrderByDateDebutDesc(Long agenceId);
}
