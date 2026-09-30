package com.getfocused.matabishi.repository;

import com.getfocused.matabishi.model.ServiceEntreprise;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ServiceEntrepriseRepository extends JpaRepository<ServiceEntreprise, Long> {
    // Recherche par nom de service
    java.util.Optional<ServiceEntreprise> findByNom(String nom);
}