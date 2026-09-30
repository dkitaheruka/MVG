package com.getfocused.matabishi.controller;

import com.getfocused.matabishi.model.DocumentCommercial;
import com.getfocused.matabishi.model.TypeDocument;
import com.getfocused.matabishi.repository.DocumentCommercialRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/documents")
@RequiredArgsConstructor
public class DocumentCommercialController {

    private final DocumentCommercialRepository documentRepository;

    @GetMapping
    public List<DocumentCommercial> lister(@RequestParam(required = false) Long agenceId,
                                           @RequestParam(required = false) TypeDocument type) {
        if (agenceId != null) return documentRepository.findByAgenceId(agenceId);
        if (type != null) return documentRepository.findByType(type);
        return documentRepository.findAll();
    }

    @PostMapping
    public DocumentCommercial enregistrer(@RequestBody DocumentCommercial document) {
        return documentRepository.save(document);
    }
}
