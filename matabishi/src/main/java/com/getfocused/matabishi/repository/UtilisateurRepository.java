package com.getfocused.matabishi.repository;

import com.getfocused.matabishi.model.Utilisateur;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
import java.util.List;

public interface UtilisateurRepository extends JpaRepository<Utilisateur, Long> {
    Optional<Utilisateur> findByEmail(String email);
    List<Utilisateur> findByAgenceId(Long agenceId);
}