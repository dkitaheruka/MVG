package com.getfocused.matabishi.controller;

import com.getfocused.matabishi.model.AppareilAutorise;
import com.getfocused.matabishi.repository.AppareilAutoriseRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin/appareils")
@RequiredArgsConstructor
public class AppareilAutoriseController {

    private final AppareilAutoriseRepository appareilRepository;

    @GetMapping
    public List<AppareilAutorise> lister(@RequestParam(required = false) Long utilisateurId) {
        return utilisateurId == null ? appareilRepository.findAll() : appareilRepository.findByUtilisateurId(utilisateurId);
    }

    @PostMapping
    public AppareilAutorise autoriser(@RequestBody AppareilAutorise appareil) {
        return appareilRepository.save(appareil);
    }

    @PatchMapping("/{id}/actif")
    public AppareilAutorise changerStatut(@PathVariable Long id, @RequestParam boolean actif) {
        AppareilAutorise appareil = appareilRepository.findById(id).orElseThrow();
        appareil.setActif(actif);
        return appareilRepository.save(appareil);
    }
}
