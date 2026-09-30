package com.getfocused.matabishi.controller;

import com.getfocused.matabishi.model.OrdreProduction;
import com.getfocused.matabishi.service.ProductionService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/production")
@RequiredArgsConstructor
public class OrdreProductionController {

    private final ProductionService productionService;

    @PostMapping("/terminer/{id}")
    public OrdreProduction terminer(@PathVariable Long id,
                                    @RequestParam Double quantite,
                                    @RequestParam Double pertes) {
        return productionService.terminerProduction(id, quantite, pertes);
    }
}