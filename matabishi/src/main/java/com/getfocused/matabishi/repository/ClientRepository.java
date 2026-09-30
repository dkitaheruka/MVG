package com.getfocused.matabishi.repository;

import com.getfocused.matabishi.model.Client;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface ClientRepository extends JpaRepository<Client, Long> {
    // Trouver les clients qui ont des dettes (SoldeDette > 0)
    @Query("SELECT c FROM Client c WHERE c.soldeDette > 0")
    List<Client> findClientsEndettes();

    // Recherche par téléphone pour les agents de terrain
    List<Client> findByTelephoneContaining(String telephone);
}