package com.getfocused.matabishi.service;

import com.getfocused.matabishi.model.*;
import com.getfocused.matabishi.repository.BulletinPaieRepository;
import com.getfocused.matabishi.repository.VenteRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class PaieService {

    private final VenteRepository venteRepository;
    private final BulletinPaieRepository bulletinPaieRepository;

    /**
     * Calcule la prime de commission d'un agent basée sur son chiffre d'affaires mensuel.
     */
    public BigDecimal calculerPrimeVendeur(Agent agent, int mois, int annee) {
        // Si l'agent n'a pas de taux de commission (0%), la prime est de 0
        if (agent.getTauxCommission() == null || agent.getTauxCommission().compareTo(BigDecimal.ZERO) <= 0) {
            return BigDecimal.ZERO;
        }

        // Appel au repository avec les 3 paramètres : ID, MOIS, ANNÉE
        List<Vente> ventesDuMois = venteRepository.findByVendeurIdAndDateVenteMonth(agent.getId(), mois, annee);

        // Somme des montants de toutes les ventes valides
        BigDecimal chiffreAffaireTotal = ventesDuMois.stream()
                .map(Vente::getMontantTotal)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        // Calcul : CA * Taux (ex: 1000$ * 0.02 = 20$)
        return chiffreAffaireTotal.multiply(agent.getTauxCommission());
    }

    /**
     * Génère le bulletin de paie final pour un agent.
     */
    @Transactional
    public BulletinPaie genererBulletin(Agent agent, int mois, int annee) {
        // 1. Vérifier si un bulletin existe déjà pour éviter les doubles paiements
        List<BulletinPaie> existants = bulletinPaieRepository.findByAgentIdAndMoisAndAnnee(agent.getId(), mois, annee);
        if (!existants.isEmpty()) {
            throw new RuntimeException("Un bulletin de paie existe déjà pour cet agent pour " + mois + "/" + annee);
        }

        // 2. Calculer la prime
        BigDecimal prime = calculerPrimeVendeur(agent, mois, annee);

        // 3. Calculer le Net à Payer (Salaire Base + Prime)
        // Note : On pourrait ajouter ici la déduction des avances sur salaire
        BigDecimal netAPayer = agent.getSalaireBase().add(prime);

        // 4. Créer et sauvegarder le bulletin
        BulletinPaie bulletin = new BulletinPaie();
        bulletin.setAgent(agent);
        bulletin.setMois(mois);
        bulletin.setAnnee(annee);
        bulletin.setSalaireBase(agent.getSalaireBase());
        bulletin.setPrimes(prime);
        bulletin.setNetAPayer(netAPayer);
        bulletin.setEstPaye(false); // Sera marqué TRUE après validation financière

        return bulletinPaieRepository.save(bulletin);
    }
}