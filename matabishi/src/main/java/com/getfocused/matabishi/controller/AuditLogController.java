package com.getfocused.matabishi.controller;

import com.getfocused.matabishi.model.AuditLog;
import com.getfocused.matabishi.repository.AuditLogRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/admin/audit")
@RequiredArgsConstructor
public class AuditLogController {

    private final AuditLogRepository auditLogRepository;

    @GetMapping
    public List<AuditLog> lister(@RequestParam(required = false) String utilisateurEmail) {
        return utilisateurEmail == null
                ? auditLogRepository.findAll()
                : auditLogRepository.findByUtilisateurEmailOrderByDateActionDesc(utilisateurEmail);
    }
}
