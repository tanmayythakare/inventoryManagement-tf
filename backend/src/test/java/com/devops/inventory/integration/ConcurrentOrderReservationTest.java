package com.devops.inventory.integration;

import com.devops.inventory.dto.OrderResponseDto;
import com.devops.inventory.entity.*;
import com.devops.inventory.exception.InsufficientStockException;
import com.devops.inventory.repository.OrderRepository;
import com.devops.inventory.repository.ProductRepository;
import com.devops.inventory.repository.StockAuditLogRepository;
import com.devops.inventory.repository.UserRepository;
import com.devops.inventory.service.OrderService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.math.BigDecimal;
import java.util.List;
import java.util.concurrent.*;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.fail;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Testcontainers
class ConcurrentOrderReservationTest {

    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine")
            .withDatabaseName("testdb")
            .withUsername("testuser")
            .withPassword("testpass");

    @DynamicPropertySource
    static void configureProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
        registry.add("spring.flyway.enabled", () -> "true");
    }

    @Autowired
    private OrderService orderService;

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private OrderRepository orderRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private StockAuditLogRepository auditLogRepository;

    private Long testProductId;
    private Long orderIdA;
    private Long orderIdB;

    @BeforeEach
    void setupTestData() {
        User user = userRepository.findAll().stream().findFirst().orElseGet(() ->
                userRepository.save(User.builder()
                        .username("concur-user@example.com")
                        .passwordHash("hashed")
                        .fullName("Concurrent Test User")
                        .role("ROLE_USER")
                        .build())
        );

        // Create product with strictly 1 available unit
        Product product = productRepository.save(Product.builder()
                .sku("CONCUR-SKU-" + System.currentTimeMillis())
                .name("Single Limited Item")
                .price(new BigDecimal("100.00"))
                .currency("USD")
                .quantity(1)
                .reservedQuantity(0)
                .category("Special")
                .status("ACTIVE")
                .build());
        testProductId = product.getId();

        // Create Order A demanding 1 unit
        Order orderA = Order.builder()
                .orderNumber("ORD-CONCUR-A-" + System.currentTimeMillis())
                .user(user)
                .status(OrderStatus.PENDING)
                .totalAmount(new BigDecimal("100.00"))
                .build();
        orderA.addItem(OrderItem.builder()
                .product(product)
                .quantity(1)
                .unitPrice(new BigDecimal("100.00"))
                .build());
        orderA = orderRepository.save(orderA);
        orderIdA = orderA.getId();

        // Create Order B demanding 1 unit
        Order orderB = Order.builder()
                .orderNumber("ORD-CONCUR-B-" + System.currentTimeMillis())
                .user(user)
                .status(OrderStatus.PENDING)
                .totalAmount(new BigDecimal("100.00"))
                .build();
        orderB.addItem(OrderItem.builder()
                .product(product)
                .quantity(1)
                .unitPrice(new BigDecimal("100.00"))
                .build());
        orderB = orderRepository.save(orderB);
        orderIdB = orderB.getId();
    }

    @Test
    @DisplayName("Two simultaneous threads competing for 1 unit results in exactly 1 success and 1 stock conflict")
    void testConcurrentOrderReservation() throws InterruptedException {
        int numberOfThreads = 2;
        ExecutorService executor = Executors.newFixedThreadPool(numberOfThreads);
        CountDownLatch readyLatch = new CountDownLatch(numberOfThreads);
        CountDownLatch startLatch = new CountDownLatch(1);

        Callable<OrderResponseDto> taskA = () -> {
            readyLatch.countDown();
            startLatch.await();
            return orderService.confirmOrder(orderIdA);
        };

        Callable<OrderResponseDto> taskB = () -> {
            readyLatch.countDown();
            startLatch.await();
            return orderService.confirmOrder(orderIdB);
        };

        Future<OrderResponseDto> futureA = executor.submit(taskA);
        Future<OrderResponseDto> futureB = executor.submit(taskB);

        boolean ready = readyLatch.await(5, TimeUnit.SECONDS);
        assertThat(ready).isTrue();
        startLatch.countDown(); // Fire both threads at the exact same instant

        int successCount = 0;
        int conflictCount = 0;

        // Collect Task A result
        try {
            OrderResponseDto resA = futureA.get(10, TimeUnit.SECONDS);
            if ("CONFIRMED".equals(resA.getStatus())) {
                successCount++;
            }
        } catch (ExecutionException e) {
            if (e.getCause() instanceof InsufficientStockException) {
                conflictCount++;
            } else {
                fail("Unexpected exception in Task A: " + e.getCause());
            }
        } catch (TimeoutException e) {
            fail("Task A timed out");
        }

        // Collect Task B result
        try {
            OrderResponseDto resB = futureB.get(10, TimeUnit.SECONDS);
            if ("CONFIRMED".equals(resB.getStatus())) {
                successCount++;
            }
        } catch (ExecutionException e) {
            if (e.getCause() instanceof InsufficientStockException) {
                conflictCount++;
            } else {
                fail("Unexpected exception in Task B: " + e.getCause());
            }
        } catch (TimeoutException e) {
            fail("Task B timed out");
        }

        executor.shutdown();

        // 1. Concurrency Assertions
        assertThat(successCount).as("Exactly one order must succeed").isEqualTo(1);
        assertThat(conflictCount).as("Exactly one order must conflict due to insufficient stock").isEqualTo(1);

        // 2. Database State Assertions
        Product updatedProduct = productRepository.findById(testProductId).orElseThrow();
        assertThat(updatedProduct.getQuantity()).as("Total quantity remains 1").isEqualTo(1);
        assertThat(updatedProduct.getReservedQuantity()).as("Reserved quantity must equal 1").isEqualTo(1);

        int available = updatedProduct.getAvailableQuantity();
        assertThat(available).as("Available stock must be 0").isEqualTo(0);

        // 3. Stock Audit Log Assertions
        List<StockAuditLog> auditEntries = auditLogRepository.findByProductId(testProductId);
        List<StockAuditLog> reservationLogs = auditEntries.stream()
                .filter(log -> "ORDER_RESERVED".equals(log.getReason()))
                .toList();

        assertThat(reservationLogs).as("Audit log must contain exactly 1 reservation entry").hasSize(1);
        assertThat(reservationLogs.get(0).getReservedQuantityDelta()).isEqualTo(1);
        assertThat(reservationLogs.get(0).getNewReservedQuantity()).isEqualTo(1);
    }
}
