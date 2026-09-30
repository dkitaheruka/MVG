package com.getfocused.matabishi.controller;

import com.getfocused.matabishi.model.LigneFinanciere;
import com.getfocused.matabishi.model.RapportPerformance;
import com.getfocused.matabishi.service.EtatsFinanciersService;
import com.getfocused.matabishi.service.ReportingPdfService;
import com.getfocused.matabishi.service.ReportingService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/reporting")
@RequiredArgsConstructor
public class ReportingController {

    private final ReportingService reportingService;
    private final EtatsFinanciersService etatsFinanciersService;
    private final ReportingPdfService reportingPdfService;

    /**
     * Endpoint pour le Siège : Donne la Triple Vue financière de toute l'entreprise.
     */
    @GetMapping("/siege/global")
    public RapportPerformance getRapportSiege() {
        return reportingService.genererRapportGlobal();
    }

    @GetMapping("/export/balance")
    public ResponseEntity<byte[]> exportBalance(
            @RequestParam(required = false) Long agenceId,
            @RequestParam int mois,
            @RequestParam int annee) {

        // 1. Récupérer les données comptables
        List<LigneFinanciere> donnees = etatsFinanciersService.genererBalance(agenceId, mois, annee);
        String nomAgence = (agenceId != null) ? "Agence Goma" : "Consolidation Siège Beni";

        // 2. Générer le PDF
        byte[] pdfBytes = reportingPdfService.genererPdfBalance("BALANCE GÉNÉRALE DES COMPTES", donnees, nomAgence);

        // 3. Retourner le fichier au navigateur
        return ResponseEntity.ok()
                .header("Content-Disposition", "attachment; filename=Balance_" + mois + "_" + annee + ".pdf")
                .contentType(MediaType.APPLICATION_PDF)
                .body(pdfBytes);
    }
}
