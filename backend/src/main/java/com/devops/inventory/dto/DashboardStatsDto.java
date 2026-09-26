package com.devops.inventory.dto;

import lombok.*;

import java.math.BigDecimal;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DashboardStatsDto {
    private long totalProducts;
    private long lowStockCount;
    private long pendingOrdersCount;
    private BigDecimal totalValuation;
    private List<StockAuditLogDto> recentActivity;
}
