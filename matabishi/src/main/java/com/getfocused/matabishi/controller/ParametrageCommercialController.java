package com.getfocused.matabishi.controller;

import com.getfocused.matabishi.model.PrixArticleAgence;
import com.getfocused.matabishi.model.TauxChangeAgence;
import com.getfocused.matabishi.repository.PrixArticleAgenceRepository;
import com.getfocused.matabishi.repository.TauxChangeAgenceRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/parametrage")
@RequiredArgsConstructor
public class ParametrageCommercialController {

    private final PrixArticleAgenceRepository prixRepository;
    private final TauxChangeAgenceRepository tauxRepository;

    @GetMapping("/agences/{agenceId}/prix")
    public List<PrixArticleAgence> listerPrixAgence(@PathVariable Long agenceId) {
        return prixRepository.findByAgenceId(agenceId);
    }

    @PostMapping("/prix")
    public PrixArticleAgence definirPrix(@RequestBody PrixArticleAgence prix) {
        return prixRepository.save(prix);
    }

    @GetMapping("/agences/{agenceId}/taux")
    public List<TauxChangeAgence> listerTaux(@PathVariable Long agenceId) {
        return tauxRepository.findByAgenceIdOrderByDateDebutDesc(agenceId);
    }

    @GetMapping("/agences/{agenceId}/taux/actif")
    public TauxChangeAgence tauxActif(@PathVariable Long agenceId) {
        return tauxRepository.findFirstByAgenceIdAndActifTrueOrderByDateDebutDesc(agenceId).orElseThrow();
    }

    @PostMapping("/taux")
    public TauxChangeAgence definirTaux(@RequestBody TauxChangeAgence taux) {
        return tauxRepository.save(taux);
    }
}
