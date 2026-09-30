package com.getfocused.matabishi.config;

import com.getfocused.matabishi.model.Permission;
import com.getfocused.matabishi.model.PlanComptable;
import com.getfocused.matabishi.model.RoleUtilisateur;
import com.getfocused.matabishi.model.ServiceEntreprise;
import com.getfocused.matabishi.model.Utilisateur;
import com.getfocused.matabishi.repository.PermissionRepository;
import com.getfocused.matabishi.repository.PlanComptableRepository;
import com.getfocused.matabishi.repository.RoleUtilisateurRepository;
import com.getfocused.matabishi.repository.ServiceEntrepriseRepository;
import com.getfocused.matabishi.repository.UtilisateurRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Component
@RequiredArgsConstructor
public class DataInitializer implements CommandLineRunner {

    private final PermissionRepository permissionRepository;
    private final RoleUtilisateurRepository roleRepository;
    private final UtilisateurRepository utilisateurRepository;
    private final PlanComptableRepository planComptableRepository;
    private final ServiceEntrepriseRepository serviceEntrepriseRepository;

    @Override
    @Transactional
    public void run(String... args) {
        initialiserPermissions();
        initialiserRolesSysteme();
        lierUtilisateursAuxRoles();
        initialiserPlanComptable();
        initialiserServices();
    }

    private void initialiserPermissions() {
        List<PermissionSeed> seeds = List.of(
                new PermissionSeed("dashboard.voir", "Dashboard", "Voir tableau de bord"),
                new PermissionSeed("agences.gerer", "Agences", "Gerer les agences"),
                new PermissionSeed("utilisateurs.gerer", "Administration", "Gerer les utilisateurs"),
                new PermissionSeed("roles.gerer", "Administration", "Gerer roles et permissions"),
                new PermissionSeed("appareils.gerer", "Administration", "Gerer les appareils autorises"),
                new PermissionSeed("audit.voir", "Administration", "Voir le journal d'audit"),
                new PermissionSeed("articles.gerer", "Articles", "Gerer les articles"),
                new PermissionSeed("stocks.voir", "Stock", "Voir les stocks"),
                new PermissionSeed("stocks.corriger", "Stock", "Corriger les stocks"),
                new PermissionSeed("stocks.valider_correction", "Stock", "Valider corrections de stock"),
                new PermissionSeed("ventes.creer", "Ventes", "Creer une vente"),
                new PermissionSeed("ventes.voir", "Ventes", "Voir les ventes"),
                new PermissionSeed("ventes.annuler", "Ventes", "Annuler une vente"),
                new PermissionSeed("credits.valider", "Ventes", "Valider les ventes a credit"),
                new PermissionSeed("clients.gerer", "Clients", "Gerer les clients"),
                new PermissionSeed("clients.credit_gerer", "Clients", "Gerer limites et echeances credit"),
                new PermissionSeed("tresorerie.demande", "Tresorerie", "Creer une demande de caisse"),
                new PermissionSeed("tresorerie.valider", "Tresorerie", "Valider une transaction"),
                new PermissionSeed("tresorerie.voir", "Tresorerie", "Voir la tresorerie"),
                new PermissionSeed("production.gerer", "Production", "Gerer la production"),
                new PermissionSeed("production.qr_generer", "Production", "Generer et imprimer QR lots"),
                new PermissionSeed("comptabilite.plan_gerer", "Comptabilite", "Gerer le plan comptable"),
                new PermissionSeed("comptabilite.ecritures_voir", "Comptabilite", "Voir les ecritures comptables"),
                new PermissionSeed("reporting.voir", "Reporting", "Voir les rapports"),
                new PermissionSeed("reporting.exporter", "Reporting", "Exporter PDF et documents"),
                new PermissionSeed("sync.voir", "Synchronisation", "Voir operations hors ligne"),
                new PermissionSeed("documents.gerer", "Documents", "Gerer factures recus et bons")
        );

        for (PermissionSeed seed : seeds) {
            permissionRepository.findByCode(seed.code())
                    .orElseGet(() -> permissionRepository.save(seed.toPermission()));
        }
    }

    private void initialiserRolesSysteme() {
        Map<String, Set<String>> roles = Map.of(
                "SUPER_ADMIN", codes("all"),
                "ADMIN_SIEGE", codes("all"),
                "ADMIN", codes("dashboard.voir", "agences.gerer", "utilisateurs.gerer", "appareils.gerer", "articles.gerer", "stocks.voir", "ventes.voir", "clients.gerer", "tresorerie.voir", "production.gerer", "reporting.voir", "documents.gerer"),
                "CHEF_AGENCE", codes("dashboard.voir", "stocks.voir", "stocks.corriger", "stocks.valider_correction", "ventes.voir", "credits.valider", "clients.gerer", "clients.credit_gerer", "tresorerie.demande", "tresorerie.valider", "tresorerie.voir", "reporting.voir", "documents.gerer"),
                "VENDEUR", codes("dashboard.voir", "stocks.voir", "ventes.creer", "ventes.voir", "clients.gerer", "documents.gerer"),
                "CAISSIER", codes("dashboard.voir", "tresorerie.demande", "tresorerie.voir", "documents.gerer"),
                "PRODUCTION", codes("dashboard.voir", "stocks.voir", "production.gerer", "production.qr_generer", "documents.gerer")
        );

        Set<Permission> toutesPermissions = Set.copyOf(permissionRepository.findAll());
        Map<String, Permission> permissionsParCode = toutesPermissions.stream()
                .collect(Collectors.toMap(Permission::getCode, permission -> permission));

        for (Map.Entry<String, Set<String>> entry : roles.entrySet()) {
            RoleUtilisateur role = roleRepository.findByCode(entry.getKey()).orElseGet(RoleUtilisateur::new);
            role.setCode(entry.getKey());
            role.setNom(entry.getKey().replace("_", " "));
            role.setSysteme(true);
            role.setActif(true);
            role.setPermissions(new HashSet<>(extrairePermissions(entry.getValue(), toutesPermissions, permissionsParCode)));
            roleRepository.save(role);
        }
    }

    private Set<Permission> extrairePermissions(Set<String> codes, Set<Permission> toutesPermissions, Map<String, Permission> permissionsParCode) {
        if (codes.contains("all")) {
            return toutesPermissions;
        }

        return codes.stream()
                .map(permissionsParCode::get)
                .filter(permission -> permission != null)
                .collect(Collectors.toSet());
    }

    private void lierUtilisateursAuxRoles() {
        List<Utilisateur> utilisateurs = utilisateurRepository.findAll();
        for (Utilisateur utilisateur : utilisateurs) {
            if (utilisateur.getRolePersonnalise() == null && utilisateur.getRole() != null) {
                roleRepository.findByCode(normaliserRole(utilisateur.getRole()))
                        .ifPresent(role -> {
                            utilisateur.setRolePersonnalise(role);
                            utilisateurRepository.save(utilisateur);
                        });
            }
        }
    }

    private String normaliserRole(String role) {
        if ("AGENT_TERRAIN".equals(role)) return "VENDEUR";
        return role;
    }

    private Set<String> codes(String... codes) {
        return Set.of(codes);
    }

    private record PermissionSeed(String code, String module, String libelle) {
        Permission toPermission() {
            Permission permission = new Permission();
            permission.setCode(code);
            permission.setModule(module);
            permission.setLibelle(libelle);
            permission.setDescription(libelle);
            return permission;
        }
    }

    // ─── Plan Comptable OHADA ──────────────────────────────────────────────────
    private record CompteSeed(String numero, String libelle, boolean modifiable) {}

    private void initialiserPlanComptable() {
        List<CompteSeed> comptes = List.of(
            // Classe 1 – Capitaux
            new CompteSeed("1", "Capitaux propres et emprunts", false),
            new CompteSeed("10", "Capital social", false),
            // Classe 4 – Tiers
            new CompteSeed("4", "Comptes de tiers", false),
            new CompteSeed("40", "Fournisseurs et comptes rattachés", false),
            new CompteSeed("401", "Fournisseurs", true),
            new CompteSeed("41", "Clients et comptes rattachés", false),
            new CompteSeed("411", "Clients", true),
            // Classe 5 – Trésorerie
            new CompteSeed("5", "Trésorerie", false),
            new CompteSeed("52", "Banques", false),
            new CompteSeed("521", "Banque locale", true),
            new CompteSeed("57", "Caisse", false),
            new CompteSeed("571", "Caisse principale", true),
            new CompteSeed("572", "Caisse USD", true),
            // Classe 6 – Charges
            new CompteSeed("6", "Charges des activités ordinaires", false),
            new CompteSeed("60", "Achats et variations de stocks", false),
            new CompteSeed("601", "Achats de matières premières", true),
            new CompteSeed("602", "Achats de marchandises", true),
            new CompteSeed("605", "Autres achats", true),
            new CompteSeed("66", "Charges de personnel", false),
            new CompteSeed("661", "Rémunérations directes versées", true),
            new CompteSeed("68", "Dotations aux amortissements", false),
            new CompteSeed("681", "Dotations aux amortissements d'exploitation", true),
            // Classe 7 – Produits
            new CompteSeed("7", "Produits des activités ordinaires", false),
            new CompteSeed("70", "Ventes", false),
            new CompteSeed("701", "Ventes de produits finis", true),
            new CompteSeed("706", "Ventes de services", true),
            new CompteSeed("707", "Ventes de marchandises", true)
        );

        for (CompteSeed seed : comptes) {
            if (!planComptableRepository.existsById(seed.numero())) {
                PlanComptable compte = new PlanComptable();
                compte.setNumero(seed.numero());
                compte.setLibelle(seed.libelle());
                compte.setEstModifiable(seed.modifiable());
                // Détermination du compte parent (ex. "571" → parent "57")
                if (seed.numero().length() > 1) {
                    String parentNum = seed.numero().substring(0, seed.numero().length() - 1);
                    planComptableRepository.findById(parentNum).ifPresent(compte::setParent);
                }
                planComptableRepository.save(compte);
            }
        }
    }

    // ─── Services / Départements de l'entreprise ──────────────────────────────
    private void initialiserServices() {
        List<String> services = List.of(
            "Commercial", "Production", "Logistique", "Administration"
        );
        for (String nom : services) {
            serviceEntrepriseRepository.findByNom(nom).orElseGet(() -> {
                ServiceEntreprise service = new ServiceEntreprise();
                service.setNom(nom);
                return serviceEntrepriseRepository.save(service);
            });
        }
    }
}
