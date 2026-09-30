package com.getfocused.matabishi.controller;

import com.getfocused.matabishi.model.Client;
import com.getfocused.matabishi.repository.ClientRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/clients")
@RequiredArgsConstructor
public class ClientController {

    private final ClientRepository clientRepository;

    @GetMapping
    public List<Client> lister(@RequestParam(required = false) String search) {
        if (search != null && !search.isBlank()) {
            return clientRepository.findByTelephoneContaining(search.trim());
        }
        return clientRepository.findAll();
    }

    @GetMapping("/endettes")
    public List<Client> listerClientsEndettes() {
        return clientRepository.findClientsEndettes();
    }

    @GetMapping("/{id}")
    public Client getById(@PathVariable Long id) {
        return clientRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Client introuvable avec l'ID " + id));
    }

    @PostMapping
    public Client creerOuModifier(@RequestBody Client client) {
        return clientRepository.save(client);
    }
}
