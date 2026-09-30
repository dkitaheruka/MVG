package com.getfocused.matabishi.repository;

import com.getfocused.matabishi.model.RoleUtilisateur;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface RoleUtilisateurRepository extends JpaRepository<RoleUtilisateur, Long> {
    Optional<RoleUtilisateur> findByCode(String code);
}
