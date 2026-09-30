package com.getfocused.matabishi.service;

import com.getfocused.matabishi.model.StockAgence;
import com.getfocused.matabishi.repository.StockAgenceRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import java.time.LocalDate;
import java.util.List;

@Service
@RequiredArgsConstructor
public class StockService {
    private final StockAgenceRepository stockRepo;

    public List<StockAgence> getStockParAgence(Long agenceId) {
        return stockRepo.findByAgenceId(agenceId);
    }

    // Analyse de péremption : Articles expirant dans les 30 prochains jours
    public List<StockAgence> getAlertesExpiration(Long agenceId) {
        LocalDate dateLimite = LocalDate.now().plusDays(30);
        return stockRepo.findByAgenceIdAndDateExpirationBefore(agenceId, dateLimite);
    }

    public List<StockAgence> getAlertesRupture(Long agenceId) {
        return stockRepo.findProduitsEnAlerte(agenceId);
    }
}