package com.devops.inventory.unit;

import com.devops.inventory.dto.DashboardStatsDto;
import com.devops.inventory.dto.ProductDto;
import com.devops.inventory.dto.StockAdjustmentRequest;
import com.devops.inventory.entity.OrderStatus;
import com.devops.inventory.entity.Product;
import com.devops.inventory.entity.StockAuditLog;
import com.devops.inventory.repository.OrderRepository;
import com.devops.inventory.repository.ProductRepository;
import com.devops.inventory.repository.StockAuditLogRepository;
import com.devops.inventory.service.InventoryService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class InventoryServiceTest {

    @Mock
    private ProductRepository productRepository;

    @Mock
    private StockAuditLogRepository auditLogRepository;

    @Mock
    private OrderRepository orderRepository;

    @InjectMocks
    private InventoryService inventoryService;

    private Product product;

    @BeforeEach
    void setUp() {
        product = Product.builder()
                .id(1L)
                .sku("PROD-001")
                .name("Item 1")
                .price(new BigDecimal("100.00"))
                .quantity(50)
                .reservedQuantity(10)
                .category("Electronics")
                .status("ACTIVE")
                .build();
    }

    @Test
    @DisplayName("Stock adjustment increases quantity and records audit log")
    void testStockAdjustmentPositive() {
        when(productRepository.findByIdWithLock(1L)).thenReturn(Optional.of(product));
        when(productRepository.save(any(Product.class))).thenAnswer(i -> i.getArgument(0));

        StockAdjustmentRequest request = new StockAdjustmentRequest(1L, 20, "SUPPLIER_RESTOCK");
        ProductDto result = inventoryService.adjustStock(request, "OPERATOR_1");

        assertThat(result.getQuantity()).isEqualTo(70);
        assertThat(result.getAvailableQuantity()).isEqualTo(60); // 70 - 10
        verify(auditLogRepository).save(any(StockAuditLog.class));
    }

    @Test
    @DisplayName("Stock adjustment fails when reducing below active reservations")
    void testStockAdjustmentBelowReservations() {
        when(productRepository.findByIdWithLock(1L)).thenReturn(Optional.of(product));

        // current quantity 50, reserved 10. Delta -45 would reduce to 5 (< 10)
        StockAdjustmentRequest request = new StockAdjustmentRequest(1L, -45, "WRITE_OFF");

        assertThatThrownBy(() -> inventoryService.adjustStock(request, "OPERATOR_1"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Cannot reduce stock below active reservations");
    }

    @Test
    @DisplayName("Dashboard stats computes totals accurately")
    void testDashboardStats() {
        when(productRepository.findAll()).thenReturn(List.of(product));
        when(orderRepository.countByStatus(OrderStatus.PENDING)).thenReturn(3L);
        when(auditLogRepository.findTop20ByOrderByCreatedAtDesc()).thenReturn(Collections.emptyList());

        DashboardStatsDto stats = inventoryService.getDashboardStats();

        assertThat(stats.getTotalProducts()).isEqualTo(1);
        assertThat(stats.getPendingOrdersCount()).isEqualTo(3);
        assertThat(stats.getTotalValuation()).isEqualByComparingTo(new BigDecimal("5000.00")); // 50 * 100
    }
}
