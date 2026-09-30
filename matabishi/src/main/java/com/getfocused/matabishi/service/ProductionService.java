package com.getfocused.matabishi.service;

import com.getfocused.matabishi.model.*;
import com.getfocused.matabishi.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ProductionService {

    private final OrdreProductionRepository productionRepo;
    private final RecetteRepository recetteRepo;
    private final StockAgenceRepository stockRepo;

    @Transactional
    public OrdreProduction terminerProduction(Long ordreId, Double quantiteReelle, Double pertes) {
        OrdreProduction ordre = productionRepo.findById(ordreId).orElseThrow();
        List<Recette> composants = recetteRepo.findByProduitFiniId(ordre.getProduitFini().getId());

        // 1. Déduire les matières premières du stock de l'agence
        for (Recette r : composants) {
            Double besoinTotal = r.getQuantitePourUneUnite() * quantiteReelle;
            // Logique de mise à jour du stock (Simplifiée ici)
            actualiserStock(ordre.getAgence().getId(), r.getMatierePremiere().getId(), -besoinTotal);
        }

        // 2. Ajouter le produit fini au stock
        actualiserStock(ordre.getAgence().getId(), ordre.getProduitFini().getId(), quantiteReelle);

        // 3. Clôturer l'ordre
        ordre.setQuantiteProduiteReelle(quantiteReelle);
        ordre.setPerteDeclaree(pertes);
        ordre.setStatut(StatutProduction.TERMINE);
        ordre.setDateFin(LocalDateTime.now());

        return productionRepo.save(ordre);
    }

    private void actualiserStock(Long agenceId, Long articleId, Double quantite) {
        // Recherche du stock spécifique (Lot à gérer ultérieurement pour plus de précision)
        StockAgence stock = stockRepo.findByAgenceId(agenceId).stream()
                .filter(s -> s.getArticle().getId().equals(articleId))
                .findFirst()
                .orElseThrow(() -> new RuntimeException("Stock non trouvé pour l'article " + articleId));

        stock.setQuantite(stock.getQuantite() + quantite);
        stockRepo.save(stock);
    }
}