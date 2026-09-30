package com.getfocused.matabishi.controller;

import com.getfocused.matabishi.model.StatutCredit;
import com.getfocused.matabishi.model.Utilisateur;
import com.getfocused.matabishi.model.Vente;
import com.getfocused.matabishi.repository.UtilisateurRepository;
import com.getfocused.matabishi.repository.VenteRepository;
import com.getfocused.matabishi.service.TicketVentePdfService;
import com.getfocused.matabishi.service.VenteService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/ventes")
@RequiredArgsConstructor
public class VenteController {

    private final VenteService venteService;
    private final VenteRepository venteRepository;
    private final UtilisateurRepository utilisateurRepository;
    private final TicketVentePdfService ticketVentePdfService;

    @GetMapping
    public List<Vente> lister(@RequestParam(required = false) Long agenceId,
                              @RequestParam(required = false) StatutCredit statutCredit) {
        if (agenceId != null && statutCredit != null) {
            return venteRepository.findByAgenceIdAndStatutCredit(agenceId, statutCredit);
        }
        if (agenceId != null) {
            return venteRepository.findByAgenceId(agenceId);
        }
        if (statutCredit != null) {
            return venteRepository.findByStatutCredit(statutCredit);
        }
        return venteRepository.findAll();
    }

    @GetMapping("/{id}")
    public Vente getById(@PathVariable Long id) {
        return venteRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Vente introuvable avec l'ID " + id));
    }

    @PostMapping("/nouvelle")
    public Vente creerVente(@RequestBody Vente vente) {
        Utilisateur currentUser = getCurrentUser();
        if (vente.getVendeur() == null && currentUser != null) {
            vente.setVendeur(currentUser);
        }
        if (vente.getAgence() == null && currentUser != null && currentUser.getAgence() != null) {
            vente.setAgence(currentUser.getAgence());
        }
        return venteService.enregistrerVente(vente);
    }

    @PostMapping("/credits/{id}/valider")
    public Vente validerCredit(@PathVariable Long id) {
        Utilisateur chef = getCurrentUser();
        return venteService.validerCredit(id, chef);
    }

    @PostMapping("/credits/{id}/rejeter")
    public Vente rejeterCredit(@PathVariable Long id, @RequestBody(required = false) Map<String, String> body) {
        Utilisateur chef = getCurrentUser();
        String motif = body != null ? body.get("motif") : null;
        return venteService.rejeterCredit(id, chef, motif);
    }

    @GetMapping("/{id}/recu-pdf")
    public ResponseEntity<byte[]> telechargerRecuPdf(@PathVariable Long id) {
        Vente vente = getById(id);
        byte[] pdf = ticketVentePdfService.genererRecuPdf(vente);

        String filename = "Recu_" + (vente.getReferenceVente() != null ? vente.getReferenceVente() : id) + ".pdf";

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .contentType(MediaType.APPLICATION_PDF)
                .body(pdf);
    }

    private Utilisateur getCurrentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getName() != null && !auth.getName().isBlank() && !"anonymousUser".equals(auth.getName())) {
            return utilisateurRepository.findByEmail(auth.getName()).orElse(null);
        }
        return null;
    }
}
