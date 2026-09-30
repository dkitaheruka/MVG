package com.getfocused.matabishi.controller;

import com.getfocused.matabishi.model.PlanComptable;
import com.getfocused.matabishi.service.PlanComptableService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/comptabilite/plan-comptable")
@RequiredArgsConstructor
public class PlanComptableController {

    private final PlanComptableService service;

    @GetMapping
    public List<PlanComptable> getAll() {
        return service.listerToutLePlan();
    }

    @GetMapping("/{numero}")
    public PlanComptable getOne(@PathVariable String numero) {
        return service.recupererParNumero(numero);
    }

    @PostMapping
    public PlanComptable save(@RequestBody PlanComptable compte) {
        return service.enregistrerCompte(compte);
    }

    @DeleteMapping("/{numero}")
    public void delete(@PathVariable String numero) {
        service.supprimerCompte(numero);
    }
}