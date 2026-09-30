package com.getfocused.matabishi.repository;

import com.getfocused.matabishi.model.EcritureComptable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface EcritureComptableRepository extends JpaRepository<EcritureComptable, Long> {
    List<EcritureComptable> findByAgenceId(Long agenceId);
    List<EcritureComptable> findByCompteNumero(String numero);
}
