package com.getfocused.matabishi.repository;

import com.getfocused.matabishi.model.PrixArticleAgence;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface PrixArticleAgenceRepository extends JpaRepository<PrixArticleAgence, Long> {
    List<PrixArticleAgence> findByAgenceId(Long agenceId);
    List<PrixArticleAgence> findByArticleId(Long articleId);
    Optional<PrixArticleAgence> findFirstByAgenceIdAndArticleIdAndActifTrueOrderByDateDebutDesc(Long agenceId, Long articleId);
}
