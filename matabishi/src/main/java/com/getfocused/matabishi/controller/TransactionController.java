package com.getfocused.matabishi.controller;

import com.getfocused.matabishi.model.CompteCaisse;
import com.getfocused.matabishi.model.StatutTransaction;
import com.getfocused.matabishi.model.Transaction;
import com.getfocused.matabishi.model.Utilisateur;
import com.getfocused.matabishi.repository.CompteCaisseRepository;
import com.getfocused.matabishi.repository.TransactionRepository;
import com.getfocused.matabishi.repository.UtilisateurRepository;
import com.getfocused.matabishi.service.TresorerieService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/tresorerie")
@RequiredArgsConstructor
public class TransactionController {

    private final TresorerieService tresorerieService;
    private final TransactionRepository transactionRepository;
    private final CompteCaisseRepository compteCaisseRepository;
    private final UtilisateurRepository utilisateurRepository;

    @GetMapping
    public List<Transaction> lister(@RequestParam(required = false) Long agenceId,
                                    @RequestParam(required = false) StatutTransaction statut) {
        if (agenceId != null && statut != null) return transactionRepository.findByAgenceIdAndStatut(agenceId, statut);
        if (agenceId != null) return transactionRepository.findByAgenceId(agenceId);
        if (statut != null) return transactionRepository.findByStatut(statut);
        return transactionRepository.findAll();
    }

    @GetMapping("/caisses")
    public List<CompteCaisse> listerCaisses(@RequestParam(required = false) Long agenceId) {
        if (agenceId != null) {
            return compteCaisseRepository.findByAgenceId(agenceId);
        }
        return compteCaisseRepository.findAll();
    }

    @PostMapping("/caisses")
    public CompteCaisse enregistrerCaisse(@RequestBody CompteCaisse caisse) {
        Utilisateur currentUser = getCurrentUser();
        if (caisse.getAgence() == null && currentUser != null && currentUser.getAgence() != null) {
            caisse.setAgence(currentUser.getAgence());
        }
        return compteCaisseRepository.save(caisse);
    }

    @PostMapping("/demande")
    public Transaction creer(@RequestBody Transaction tx) {
        Utilisateur currentUser = getCurrentUser();
        if (tx.getCreateur() == null && currentUser != null) {
            tx.setCreateur(currentUser);
        }
        if (tx.getAgence() == null && currentUser != null && currentUser.getAgence() != null) {
            tx.setAgence(currentUser.getAgence());
        }
        return tresorerieService.creerDemande(tx);
    }

    @PostMapping("/valider/{id}")
    public Transaction valider(@PathVariable UUID id) {
        Utilisateur chef = getCurrentUser();
        return tresorerieService.validerTransaction(id, chef);
    }

    @PostMapping("/rejeter/{id}")
    public Transaction rejeter(@PathVariable UUID id, @RequestBody(required = false) Map<String, String> body) {
        Utilisateur chef = getCurrentUser();
        String motif = body != null ? body.get("motif") : null;
        return tresorerieService.rejeterTransaction(id, chef, motif);
    }

    private Utilisateur getCurrentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getName() != null && !auth.getName().isBlank() && !"anonymousUser".equals(auth.getName())) {
            return utilisateurRepository.findByEmail(auth.getName()).orElse(null);
        }
        return null;
    }
}
