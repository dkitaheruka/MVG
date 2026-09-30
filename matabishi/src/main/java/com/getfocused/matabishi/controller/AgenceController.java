package com.getfocused.matabishi.controller;

import com.getfocused.matabishi.model.Agence;
import com.getfocused.matabishi.service.AgenceService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/agences")
@RequiredArgsConstructor
public class AgenceController {
    private final AgenceService agenceService;

    @PostMapping
    public Agence create(@RequestBody Agence agence) {
        return agenceService.creerAgence(agence);
    }

    @GetMapping
    public List<Agence> getAll() {
        return agenceService.listerToutesLesAgences();
    }
}