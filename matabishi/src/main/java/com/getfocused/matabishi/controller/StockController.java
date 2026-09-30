package com.getfocused.matabishi.controller;

import com.getfocused.matabishi.model.StockAgence;
import com.getfocused.matabishi.service.StockService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/stocks")
@RequiredArgsConstructor
public class StockController {

    private final StockService stockService;

    @GetMapping("/agence/{agenceId}")
    public List<StockAgence> getStockParAgence(@PathVariable Long agenceId) {
        return stockService.getStockParAgence(agenceId);
    }

    @GetMapping("/agence/{agenceId}/alertes/expiration")
    public List<StockAgence> getAlertesExpiration(@PathVariable Long agenceId) {
        return stockService.getAlertesExpiration(agenceId);
    }

    @GetMapping("/agence/{agenceId}/alertes/rupture")
    public List<StockAgence> getAlertesRupture(@PathVariable Long agenceId) {
        return stockService.getAlertesRupture(agenceId);
    }
}
