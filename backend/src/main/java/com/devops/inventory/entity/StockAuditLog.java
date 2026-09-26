package com.devops.inventory.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.OffsetDateTime;

@Entity
@Table(name = "stock_audit_log")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StockAuditLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "product_id", nullable = false)
    private Product product;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "order_id")
    private Order order;

    @Column(name = "quantity_delta", nullable = false)
    @Builder.Default
    private Integer quantityDelta = 0;

    @Column(name = "reserved_quantity_delta", nullable = false)
    @Builder.Default
    private Integer reservedQuantityDelta = 0;

    @Column(name = "new_quantity", nullable = false)
    private Integer newQuantity;

    @Column(name = "new_reserved_quantity", nullable = false)
    private Integer newReservedQuantity;

    @Column(nullable = false, length = 50)
    private String reason;

    @Column(nullable = false, length = 100)
    @Builder.Default
    private String operator = "SYSTEM";

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;
}
