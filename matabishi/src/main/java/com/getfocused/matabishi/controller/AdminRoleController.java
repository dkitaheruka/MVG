package com.getfocused.matabishi.controller;

import com.getfocused.matabishi.model.Permission;
import com.getfocused.matabishi.model.RoleUtilisateur;
import com.getfocused.matabishi.repository.PermissionRepository;
import com.getfocused.matabishi.repository.RoleUtilisateurRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.HashSet;
import java.util.List;
import java.util.Set;

@RestController
@RequestMapping("/api/admin/roles")
@RequiredArgsConstructor
public class AdminRoleController {

    private final RoleUtilisateurRepository roleRepository;
    private final PermissionRepository permissionRepository;

    @GetMapping
    public List<RoleUtilisateur> listerRoles() {
        return roleRepository.findAll();
    }

    @PostMapping
    public RoleUtilisateur creerRole(@RequestBody RoleUtilisateur role) {
        return roleRepository.save(role);
    }

    @GetMapping("/permissions")
    public List<Permission> listerPermissions(@RequestParam(required = false) String module) {
        return module == null ? permissionRepository.findAll() : permissionRepository.findByModule(module);
    }

    @PostMapping("/permissions")
    public Permission creerPermission(@RequestBody Permission permission) {
        return permissionRepository.save(permission);
    }

    @PutMapping("/{roleId}/permissions")
    public RoleUtilisateur definirPermissions(@PathVariable Long roleId, @RequestBody Set<Long> permissionIds) {
        RoleUtilisateur role = roleRepository.findById(roleId).orElseThrow();
        List<Permission> permissions = permissionRepository.findAllById(permissionIds);
        role.setPermissions(new HashSet<>(permissions));
        return roleRepository.save(role);
    }
}
