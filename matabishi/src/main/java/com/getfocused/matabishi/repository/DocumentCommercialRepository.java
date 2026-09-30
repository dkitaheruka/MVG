package com.getfocused.matabishi.repository;

import com.getfocused.matabishi.model.DocumentCommercial;
import com.getfocused.matabishi.model.TypeDocument;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface DocumentCommercialRepository extends JpaRepository<DocumentCommercial, Long> {
    Optional<DocumentCommercial> findByReference(String reference);
    List<DocumentCommercial> findByAgenceId(Long agenceId);
    List<DocumentCommercial> findByType(TypeDocument type);
}
