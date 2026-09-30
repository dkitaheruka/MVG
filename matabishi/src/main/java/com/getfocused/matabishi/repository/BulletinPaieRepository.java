package com.getfocused.matabishi.repository;

import com.getfocused.matabishi.model.BulletinPaie;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface BulletinPaieRepository extends JpaRepository<BulletinPaie, Long> {
    // Requis par PaieService.genererBulletin() pour éviter les doublons
    List<BulletinPaie> findByAgentIdAndMoisAndAnnee(Long agentId, int mois, int annee);
}