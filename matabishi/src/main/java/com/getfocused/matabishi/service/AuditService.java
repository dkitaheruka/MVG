package com.getfocused.matabishi.service;

import com.getfocused.matabishi.model.AuditLog;
import com.getfocused.matabishi.repository.AuditLogRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class AuditService {

    private final AuditLogRepository auditLogRepository;

    public AuditLog journaliser(String action, String details, String utilisateurEmail, String adresseIp) {
        return auditLogRepository.save(new AuditLog(action, details, utilisateurEmail, adresseIp));
    }
}
