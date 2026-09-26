package com.devops.inventory.dto;

import com.devops.inventory.entity.Order;
import lombok.*;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.Collections;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OrderResponseDto {
    private Long orderId;
    private String orderNumber;
    private String status;
    private BigDecimal totalAmount;
    private List<OrderItemDto> items;
    private OffsetDateTime confirmedAt;
    private OffsetDateTime createdAt;
    private String message;

    public static OrderResponseDto from(Order order) {
        if (order == null) return null;

        List<OrderItemDto> itemDtos = (order.getItems() != null)
                ? order.getItems().stream().map(OrderItemDto::fromEntity).toList()
                : Collections.emptyList();

        return OrderResponseDto.builder()
                .orderId(order.getId())
                .orderNumber(order.getOrderNumber())
                .status(order.getStatus() != null ? order.getStatus().name() : null)
                .totalAmount(order.getTotalAmount())
                .items(itemDtos)
                .confirmedAt(order.getConfirmedAt())
                .createdAt(order.getCreatedAt())
                .message("Order " + order.getOrderNumber() + " processed successfully")
                .build();
    }
}
