package com.devops.inventory.dto;

import com.devops.inventory.entity.StockAuditLog;
import lombok.*;

import java.time.OffsetDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StockAuditLogDto {
    private Long id;
    private Long productId;
    private String productSku;
    private String productName;
    private Long orderId;
    private Integer quantityDelta;
    private Integer reservedQuantityDelta;
    private Integer newQuantity;
    private Integer newReservedQuantity;
    private String reason;
    private String operator;
    private OffsetDateTime createdAt;

    public static StockAuditLogDto fromEntity(StockAuditLog log) {
        if (log == null) return null;
        return StockAuditLogDto.builder()
                .id(log.getId())
                .productId(log.getProduct() != null ? log.getProduct().getId() : null)
                .productSku(log.getProduct() != null ? log.getProduct().getSku() : null)
                .productName(log.getProduct() != null ? log.getProduct().getName() : null)
                .orderId(log.getOrder() != null ? log.getOrder().getId() : null)
                .quantityDelta(log.getQuantityDelta())
                .reservedQuantityDelta(log.getReservedQuantityDelta())
                .newQuantity(log.getNewQuantity())
                .newReservedQuantity(log.getNewReservedQuantity())
                .reason(log.getReason())
                .operator(log.getOperator())
                .createdAt(log.getCreatedAt())
                .build();
    }
}
