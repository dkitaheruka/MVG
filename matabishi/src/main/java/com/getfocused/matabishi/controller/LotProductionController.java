package com.getfocused.matabishi.controller;

import com.getfocused.matabishi.model.LotProduction;
import com.getfocused.matabishi.repository.LotProductionRepository;
import com.getfocused.matabishi.service.QrLotService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/production/lots")
@RequiredArgsConstructor
public class LotProductionController {

    private final LotProductionRepository lotRepository;
    private final QrLotService qrLotService;

    @GetMapping
    public List<LotProduction> lister(@RequestParam(required = false) Long agenceId,
                                      @RequestParam(required = false) Long articleId) {
        if (agenceId != null) return lotRepository.findByAgenceId(agenceId);
        if (articleId != null) return lotRepository.findByArticleId(articleId);
        return lotRepository.findAll();
    }

    @PostMapping
    public LotProduction creer(@RequestBody LotProduction lot) {
        return qrLotService.enregistrerLotAvecQr(lot);
    }

    @PostMapping("/verifier")
    public Map<String, Boolean> verifier(@RequestBody Map<String, String> request) {
        boolean valide = qrLotService.verifierSignature(request.get("payload"), request.get("signature"));
        return Map.of("valide", valide);
    }
}
