package com.getfocused.matabishi.repository;

import com.getfocused.matabishi.model.AppareilAutorise;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface AppareilAutoriseRepository extends JpaRepository<AppareilAutorise, Long> {
    Optional<AppareilAutorise> findByDeviceId(String deviceId);
    List<AppareilAutorise> findByUtilisateurId(Long utilisateurId);
}
