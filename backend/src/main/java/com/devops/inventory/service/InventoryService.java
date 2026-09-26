package com.devops.inventory.service;

import com.devops.inventory.dto.DashboardStatsDto;
import com.devops.inventory.dto.ProductDto;
import com.devops.inventory.dto.StockAdjustmentRequest;
import com.devops.inventory.dto.StockAuditLogDto;
import com.devops.inventory.entity.OrderStatus;
import com.devops.inventory.entity.Product;
import com.devops.inventory.entity.StockAuditLog;
import com.devops.inventory.exception.ResourceNotFoundException;
import com.devops.inventory.repository.OrderRepository;
import com.devops.inventory.repository.ProductRepository;
import com.devops.inventory.repository.StockAuditLogRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class InventoryService {

    private final ProductRepository productRepository;
    private final StockAuditLogRepository auditLogRepository;
    private final OrderRepository orderRepository;

    @Transactional
    public ProductDto adjustStock(StockAdjustmentRequest request, String operator) {
        Product product = productRepository.findByIdWithLock(request.getProductId())
                .orElseThrow(() -> new ResourceNotFoundException("Product not found with id: " + request.getProductId()));

        int currentQty = product.getQuantity() != null ? product.getQuantity() : 0;
        int currentReserved = product.getReservedQuantity() != null ? product.getReservedQuantity() : 0;
        int delta = request.getQuantityDelta() != null ? request.getQuantityDelta() : 0;
        int newQty = currentQty + delta;

        if (newQty < 0) {
            throw new IllegalArgumentException("Cannot reduce physical stock below 0. Resulting quantity: " + newQty);
        }

        if (newQty < currentReserved) {
            throw new IllegalArgumentException(
                    String.format("Cannot reduce stock below active reservations. Resulting: %d, Reserved: %d",
                            newQty, currentReserved)
            );
        }

        product.setQuantity(newQty);
        Product saved = productRepository.save(product);

        StockAuditLog audit = StockAuditLog.builder()
                .product(saved)
                .quantityDelta(delta)
                .reservedQuantityDelta(0)
                .newQuantity(newQty)
                .newReservedQuantity(currentReserved)
                .reason(request.getReason() != null ? request.getReason() : "STOCK_ADJUSTMENT")
                .operator(operator != null ? operator : "SYSTEM")
                .build();
        auditLogRepository.save(audit);

        log.info("Stock adjusted for product {} (ID: {}). Delta: {}, New Qty: {}",
                saved.getSku(), saved.getId(), delta, newQty);

        return ProductDto.fromEntity(saved);
    }

    @Transactional(readOnly = true)
    public List<StockAuditLogDto> getAuditLogsForProduct(Long productId) {
        return auditLogRepository.findByProductIdOrderByCreatedAtDesc(productId)
                .stream()
                .map(StockAuditLogDto::fromEntity)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<StockAuditLogDto> getRecentAuditLogs() {
        return auditLogRepository.findTop20ByOrderByCreatedAtDesc()
                .stream()
                .map(StockAuditLogDto::fromEntity)
                .toList();
    }

    @Transactional(readOnly = true)
    public DashboardStatsDto getDashboardStats() {
        List<Product> products = productRepository.findAll();
        long totalProducts = products.size();
        long lowStockCount = products.stream()
                .filter(p -> p.getAvailableQuantity() <= 5)
                .count();

        long pendingOrdersCount = orderRepository.countByStatus(OrderStatus.PENDING);

        BigDecimal totalValuation = products.stream()
                .map(p -> {
                    BigDecimal price = p.getPrice() != null ? p.getPrice() : BigDecimal.ZERO;
                    int qty = p.getQuantity() != null ? p.getQuantity() : 0;
                    return price.multiply(BigDecimal.valueOf(qty));
                })
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        List<StockAuditLogDto> recentActivity = getRecentAuditLogs();

        return DashboardStatsDto.builder()
                .totalProducts(totalProducts)
                .lowStockCount(lowStockCount)
                .pendingOrdersCount(pendingOrdersCount)
                .totalValuation(totalValuation)
                .recentActivity(recentActivity)
                .build();
    }
}
