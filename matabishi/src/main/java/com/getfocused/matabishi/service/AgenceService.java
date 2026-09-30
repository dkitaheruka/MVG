package com.getfocused.matabishi.service;

import com.getfocused.matabishi.model.Agence;
import com.getfocused.matabishi.repository.AgenceRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import java.util.List;

@Service
@RequiredArgsConstructor
public class AgenceService {
    private final AgenceRepository agenceRepository;

    public Agence creerAgence(Agence agence) {
        return agenceRepository.save(agence);
    }

    public List<Agence> listerToutesLesAgences() {
        return agenceRepository.findAll();
    }

    public Agence recupererParId(Long id) {
        return agenceRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Agence non trouvée"));
    }
}