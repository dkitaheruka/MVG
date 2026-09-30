package com.getfocused.matabishi.repository;

import com.getfocused.matabishi.model.StatutSyncOperation;
import com.getfocused.matabishi.model.SyncOperation;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface SyncOperationRepository extends JpaRepository<SyncOperation, Long> {
    Optional<SyncOperation> findByClientOperationId(String clientOperationId);
    List<SyncOperation> findByAgenceId(Long agenceId);
    List<SyncOperation> findByStatut(StatutSyncOperation statut);
}
