package com.devops.inventory.service;

import com.devops.inventory.dto.CreateOrderRequest;
import com.devops.inventory.dto.OrderResponseDto;
import com.devops.inventory.entity.*;
import com.devops.inventory.exception.InsufficientStockException;
import com.devops.inventory.exception.InvalidOrderStateException;
import com.devops.inventory.exception.ResourceNotFoundException;
import com.devops.inventory.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class OrderService {

    private final OrderRepository orderRepository;
    private final ProductRepository productRepository;
    private final UserRepository userRepository;
    private final StockAuditLogRepository auditLogRepository;

    @Transactional(readOnly = true)
    public List<OrderResponseDto> getAllOrders() {
        return orderRepository.findAllByOrderByCreatedAtDesc()
                .stream()
                .map(OrderResponseDto::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public OrderResponseDto getOrderById(Long id) {
        Order order = orderRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found with id: " + id));
        return OrderResponseDto.from(order);
    }

    @Transactional
    public OrderResponseDto createOrder(CreateOrderRequest request, String username) {
        User user = (username != null)
                ? userRepository.findByUsername(username).orElse(null)
                : null;
        if (user == null) {
            user = userRepository.findAll().stream().findFirst()
                    .orElseThrow(() -> new ResourceNotFoundException("No valid user found to associate with order"));
        }

        String orderNumber = "ORD-" + System.currentTimeMillis();
        BigDecimal totalAmount = BigDecimal.ZERO;

        Order order = Order.builder()
                .orderNumber(orderNumber)
                .user(user)
                .status(OrderStatus.PENDING)
                .totalAmount(BigDecimal.ZERO)
                .build();

        for (CreateOrderRequest.ItemRequest itemReq : request.getItems()) {
            Product product = productRepository.findById(itemReq.getProductId())
                    .orElseThrow(() -> new ResourceNotFoundException("Product not found with id: " + itemReq.getProductId()));

            BigDecimal lineTotal = product.getPrice().multiply(BigDecimal.valueOf(itemReq.getQuantity()));
            totalAmount = totalAmount.add(lineTotal);

            OrderItem orderItem = OrderItem.builder()
                    .product(product)
                    .quantity(itemReq.getQuantity())
                    .unitPrice(product.getPrice())
                    .build();
            order.addItem(orderItem);
        }

        order.setTotalAmount(totalAmount);
        Order savedOrder = orderRepository.save(order);
        return OrderResponseDto.from(savedOrder);
    }

    @Transactional(isolation = Isolation.READ_COMMITTED)
    public OrderResponseDto confirmOrder(Long orderId) {
        // 1. Fetch Order and validate status
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found with id: " + orderId));

        if (order.getStatus() != OrderStatus.PENDING) {
            throw new InvalidOrderStateException("Order " + orderId + " is already " + order.getStatus() + " and cannot be confirmed again.");
        }

        // 2. Deadlock Prevention: Sort required product IDs in ascending numerical order
        List<Long> productIds = order.getItems().stream()
                .map(OrderItem::getProductId)
                .filter(Objects::nonNull)
                .distinct()
                .sorted()
                .toList();

        // 3. Acquire pessimistic locks on all involved products
        Map<Long, Product> lockedProducts = productRepository.findAllByIdsWithLockSorted(productIds)
                .stream()
                .collect(Collectors.toMap(Product::getId, Function.identity()));

        // Ensure all products were acquired
        for (OrderItem item : order.getItems()) {
            Long pid = item.getProductId();
            if (!lockedProducts.containsKey(pid)) {
                Product p = productRepository.findByIdWithLock(pid)
                        .orElseThrow(() -> new ResourceNotFoundException("Product not found with id: " + pid));
                lockedProducts.put(pid, p);
            }
        }

        // 4. Verify stock availability for ALL order items
        for (OrderItem item : order.getItems()) {
            Product product = lockedProducts.get(item.getProductId());
            int availableStock = product.getAvailableQuantity();

            if (availableStock < item.getQuantity()) {
                log.warn("Insufficient stock for product SKU {} (ID: {}). Requested: {}, Available: {}",
                        product.getSku(), product.getId(), item.getQuantity(), availableStock);
                throw new InsufficientStockException(
                        product.getId(),
                        product.getSku(),
                        item.getQuantity(),
                        availableStock
                );
            }
        }

        // 5. Reserve stock and write mathematical audit log entries
        for (OrderItem item : order.getItems()) {
            Product product = lockedProducts.get(item.getProductId());
            int prevReserved = product.getReservedQuantity() != null ? product.getReservedQuantity() : 0;
            int newReserved = prevReserved + item.getQuantity();

            product.setReservedQuantity(newReserved);
            productRepository.save(product);

            StockAuditLog audit = StockAuditLog.builder()
                    .product(product)
                    .order(order)
                    .quantityDelta(0)
                    .reservedQuantityDelta(item.getQuantity())
                    .newQuantity(product.getQuantity())
                    .newReservedQuantity(newReserved)
                    .reason("ORDER_RESERVED")
                    .operator("SYSTEM")
                    .build();
            auditLogRepository.save(audit);
        }

        // 6. Transition order to CONFIRMED
        order.setStatus(OrderStatus.CONFIRMED);
        order.setConfirmedAt(OffsetDateTime.now());
        Order confirmedOrder = orderRepository.save(order);

        log.info("Order {} confirmed successfully. Order total: {}", confirmedOrder.getOrderNumber(), confirmedOrder.getTotalAmount());
        return OrderResponseDto.from(confirmedOrder);
    }
}
