package com.devops.inventory.unit;

import com.devops.inventory.dto.OrderResponseDto;
import com.devops.inventory.entity.*;
import com.devops.inventory.exception.InsufficientStockException;
import com.devops.inventory.exception.InvalidOrderStateException;
import com.devops.inventory.repository.OrderRepository;
import com.devops.inventory.repository.ProductRepository;
import com.devops.inventory.repository.StockAuditLogRepository;
import com.devops.inventory.repository.UserRepository;
import com.devops.inventory.service.OrderService;
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
class OrderServiceTest {

    @Mock
    private OrderRepository orderRepository;

    @Mock
    private ProductRepository productRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private StockAuditLogRepository auditLogRepository;

    @InjectMocks
    private OrderService orderService;

    private Product product;
    private Order order;
    private OrderItem orderItem;

    @BeforeEach
    void setUp() {
        product = Product.builder()
                .id(1L)
                .sku("PROD-TEST-001")
                .name("Test Product")
                .price(new BigDecimal("50.00"))
                .quantity(10)
                .reservedQuantity(2)
                .category("Electronics")
                .status("ACTIVE")
                .build();

        order = Order.builder()
                .id(100L)
                .orderNumber("ORD-100")
                .status(OrderStatus.PENDING)
                .totalAmount(new BigDecimal("100.00"))
                .build();

        orderItem = OrderItem.builder()
                .id(1L)
                .order(order)
                .product(product)
                .quantity(2)
                .unitPrice(new BigDecimal("50.00"))
                .build();

        order.addItem(orderItem);
    }

    @Test
    @DisplayName("Confirm order successfully reserves stock and transitions state")
    void testConfirmOrderSuccess() {
        when(orderRepository.findById(100L)).thenReturn(Optional.of(order));
        when(productRepository.findAllByIdsWithLockSorted(List.of(1L))).thenReturn(List.of(product));
        when(orderRepository.save(any(Order.class))).thenAnswer(i -> i.getArgument(0));

        OrderResponseDto response = orderService.confirmOrder(100L);

        assertThat(response).isNotNull();
        assertThat(response.getStatus()).isEqualTo("CONFIRMED");
        assertThat(product.getReservedQuantity()).isEqualTo(4); // 2 + 2 = 4
        verify(auditLogRepository).save(any(StockAuditLog.class));
        verify(productRepository).save(product);
    }

    @Test
    @DisplayName("Confirm order fails with InsufficientStockException when stock unavailable")
    void testConfirmOrderInsufficientStock() {
        product.setQuantity(2);
        product.setReservedQuantity(2); // available = 0

        when(orderRepository.findById(100L)).thenReturn(Optional.of(order));
        when(productRepository.findAllByIdsWithLockSorted(List.of(1L))).thenReturn(List.of(product));

        assertThatThrownBy(() -> orderService.confirmOrder(100L))
                .isInstanceOf(InsufficientStockException.class)
                .hasMessageContaining("Insufficient stock");

        verify(orderRepository, never()).save(any(Order.class));
    }

    @Test
    @DisplayName("Confirm order fails when order is not in PENDING status")
    void testConfirmOrderNotPending() {
        order.setStatus(OrderStatus.CONFIRMED);
        when(orderRepository.findById(100L)).thenReturn(Optional.of(order));

        assertThatThrownBy(() -> orderService.confirmOrder(100L))
                .isInstanceOf(InvalidOrderStateException.class)
                .hasMessageContaining("cannot be confirmed again");
    }
}
