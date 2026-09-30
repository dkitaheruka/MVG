package com.getfocused.matabishi.service;

import com.getfocused.matabishi.model.PlanComptable;
import com.getfocused.matabishi.repository.PlanComptableRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class PlanComptableService {

    private final PlanComptableRepository repository;

    @Transactional
    public PlanComptable enregistrerCompte(PlanComptable compte) {
        // Logique de protection
        if (!compte.isEstModifiable() && repository.existsById(compte.getNumero())) {
            throw new RuntimeException("Ce compte système ne peut pas être modifié.");
        }
        return repository.save(compte);
    }

    public List<PlanComptable> listerToutLePlan() {
        return repository.findAllByOrderByNumeroAsc();
    }

    public PlanComptable recupererParNumero(String numero) {
        return repository.findById(numero)
                .orElseThrow(() -> new RuntimeException("Compte comptable " + numero + " non trouvé"));
    }

    @Transactional
    public void supprimerCompte(String numero) {
        PlanComptable compte = recupererParNumero(numero);
        if (!compte.isEstModifiable()) {
            throw new RuntimeException("Impossible de supprimer un compte racine du système.");
        }
        repository.deleteById(numero);
    }
}