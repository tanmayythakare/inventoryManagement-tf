package com.devops.inventory.repository;

import com.devops.inventory.entity.StockAuditLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface StockAuditLogRepository extends JpaRepository<StockAuditLog, Long> {
    List<StockAuditLog> findByProductId(Long productId);
    List<StockAuditLog> findByProductIdOrderByCreatedAtDesc(Long productId);
    List<StockAuditLog> findTop20ByOrderByCreatedAtDesc();
    List<StockAuditLog> findAllByOrderByCreatedAtDesc();
}
