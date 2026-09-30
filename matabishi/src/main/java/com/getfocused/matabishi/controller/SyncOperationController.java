package com.getfocused.matabishi.controller;

import com.getfocused.matabishi.model.StatutSyncOperation;
import com.getfocused.matabishi.model.SyncOperation;
import com.getfocused.matabishi.model.Utilisateur;
import com.getfocused.matabishi.repository.SyncOperationRepository;
import com.getfocused.matabishi.repository.UtilisateurRepository;
import com.getfocused.matabishi.service.SyncOperationService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/sync")
@RequiredArgsConstructor
public class SyncOperationController {

    private final SyncOperationRepository syncRepository;
    private final SyncOperationService syncOperationService;
    private final UtilisateurRepository utilisateurRepository;

    @GetMapping("/operations")
    public List<SyncOperation> lister(@RequestParam(required = false) Long agenceId,
                                      @RequestParam(required = false) StatutSyncOperation statut) {
        if (agenceId != null) return syncRepository.findByAgenceId(agenceId);
        if (statut != null) return syncRepository.findByStatut(statut);
        return syncRepository.findAll();
    }

    @PostMapping("/operations")
    public SyncOperation recevoir(@RequestBody SyncOperation operation) {
        Utilisateur currentUser = getCurrentUser();
        return syncOperationService.synchroniser(operation, currentUser);
    }

    @PostMapping("/operations/{id}/regulariser")
    public SyncOperation regulariserStock(@PathVariable Long id, @RequestBody(required = false) Map<String, Double> payload) {
        Utilisateur chef = getCurrentUser();
        Double quantite = payload != null ? payload.get("quantite") : 0.0;
        return syncOperationService.regulariserStockNegatif(id, quantite, chef);
    }

    @PatchMapping("/operations/{id}/statut")
    public SyncOperation changerStatut(@PathVariable Long id,
                                       @RequestParam StatutSyncOperation statut,
                                       @RequestParam(required = false) String message) {
        SyncOperation operation = syncRepository.findById(id).orElseThrow();
        operation.setStatut(statut);
        operation.setMessage(message);
        operation.setDateTraitement(LocalDateTime.now());
        return syncRepository.save(operation);
    }

    private Utilisateur getCurrentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getName() != null && !auth.getName().isBlank() && !"anonymousUser".equals(auth.getName())) {
            return utilisateurRepository.findByEmail(auth.getName()).orElse(null);
        }
        return null;
    }
}
