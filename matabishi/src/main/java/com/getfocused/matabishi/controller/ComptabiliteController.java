package com.getfocused.matabishi.controller;

import com.getfocused.matabishi.model.EcritureComptable;
import com.getfocused.matabishi.model.LigneFinanciere;
import com.getfocused.matabishi.model.PlanComptable;
import com.getfocused.matabishi.model.ServiceEntreprise;
import com.getfocused.matabishi.model.ServicePerformance;
import com.getfocused.matabishi.repository.EcritureComptableRepository;
import com.getfocused.matabishi.repository.ServiceEntrepriseRepository;
import com.getfocused.matabishi.service.EtatsFinanciersService;
import com.getfocused.matabishi.service.PlanComptableService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/comptabilite")
@RequiredArgsConstructor
public class ComptabiliteController {

    private final EcritureComptableRepository ecritureRepository;
    private final EtatsFinanciersService etatsFinanciersService;
    private final ServiceEntrepriseRepository serviceEntrepriseRepository;
    private final PlanComptableService planComptableService;

    // ─── Écritures comptables ────────────────────────────────────────────────
    @GetMapping("/ecritures")
    public List<EcritureComptable> listerEcritures(@RequestParam(required = false) Long agenceId,
                                                  @RequestParam(required = false) String compte) {
        if (agenceId != null) return ecritureRepository.findByAgenceId(agenceId);
        if (compte != null) return ecritureRepository.findByCompteNumero(compte);
        return ecritureRepository.findAll();
    }

    @PostMapping("/ecritures")
    public EcritureComptable enregistrerEcriture(@RequestBody EcritureComptable ecriture) {
        return ecritureRepository.save(ecriture);
    }

    // ─── Balance Générale OHADA (JSON) ──────────────────────────────────────
    @GetMapping("/balance")
    public List<LigneFinanciere> obtenirBalance(@RequestParam(required = false) Long agenceId,
                                                @RequestParam(required = false) Integer mois,
                                                @RequestParam(required = false) Integer annee) {
        LocalDate now = LocalDate.now();
        int m = (mois != null) ? mois : now.getMonthValue();
        int a = (annee != null) ? annee : now.getYear();
        return etatsFinanciersService.genererBalance(agenceId, m, a);
    }

    // ─── Performance analytique par Service / Département ───────────────────
    @GetMapping("/performance-services")
    public List<ServicePerformance> obtenirPerformanceServices(@RequestParam(required = false) Long agenceId,
                                                               @RequestParam(required = false) Integer mois,
                                                               @RequestParam(required = false) Integer annee) {
        LocalDate now = LocalDate.now();
        int m = (mois != null) ? mois : now.getMonthValue();
        int a = (annee != null) ? annee : now.getYear();
        return etatsFinanciersService.genererPerformanceParService(agenceId, m, a);
    }

    // ─── Départements / Services de l'entreprise ────────────────────────────
    @GetMapping("/services")
    public List<ServiceEntreprise> listerServices() {
        return serviceEntrepriseRepository.findAll();
    }

    // ─── Plan Comptable ─────────────────────────────────────────────────────
    @GetMapping("/plan")
    public List<PlanComptable> listerPlan() {
        return planComptableService.listerToutLePlan();
    }

    @PostMapping("/plan")
    public PlanComptable enregistrerComptePlan(@RequestBody PlanComptable compte) {
        return planComptableService.enregistrerCompte(compte);
    }
}
