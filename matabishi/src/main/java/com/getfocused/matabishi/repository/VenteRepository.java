package com.getfocused.matabishi.repository;

import com.getfocused.matabishi.model.Vente;
import com.getfocused.matabishi.model.StatutCredit;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;

public interface VenteRepository extends JpaRepository<Vente, Long> {

    /**
     * Récupère les ventes d'un vendeur pour un mois et une année spécifiques.
     * Règle Pro : On exclut les ventes à crédit qui ont été REJETÉES par le chef.
     */
    @Query("SELECT v FROM Vente v WHERE v.vendeur.id = :vendeurId " +
            "AND EXTRACT(MONTH FROM v.dateVente) = :mois " +
            "AND EXTRACT(YEAR FROM v.dateVente) = :annee " +
            "AND (v.estCredit = false OR v.statutCredit = 'VALIDE')")
    List<Vente> findByVendeurIdAndDateVenteMonth(
            @Param("vendeurId") Long vendeurId,
            @Param("mois") int mois,
            @Param("annee") int annee
    );

    List<Vente> findByAgenceId(Long agenceId);

    List<Vente> findByStatutCredit(StatutCredit statutCredit);

    List<Vente> findByAgenceIdAndStatutCredit(Long agenceId, StatutCredit statutCredit);
}
