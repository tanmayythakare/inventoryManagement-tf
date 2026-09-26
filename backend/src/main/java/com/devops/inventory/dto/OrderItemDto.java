package com.devops.inventory.dto;

import com.devops.inventory.entity.OrderItem;
import lombok.*;

import java.math.BigDecimal;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OrderItemDto {
    private Long id;
    private Long productId;
    private String sku;
    private String productName;
    private Integer quantity;
    private BigDecimal unitPrice;
    private BigDecimal lineTotal;

    public static OrderItemDto fromEntity(OrderItem item) {
        if (item == null) return null;
        BigDecimal price = item.getUnitPrice() != null ? item.getUnitPrice() : BigDecimal.ZERO;
        int qty = item.getQuantity() != null ? item.getQuantity() : 0;
        BigDecimal lineTotal = price.multiply(BigDecimal.valueOf(qty));

        return OrderItemDto.builder()
                .id(item.getId())
                .productId(item.getProduct() != null ? item.getProduct().getId() : null)
                .sku(item.getProduct() != null ? item.getProduct().getSku() : null)
                .productName(item.getProduct() != null ? item.getProduct().getName() : null)
                .quantity(qty)
                .unitPrice(price)
                .lineTotal(lineTotal)
                .build();
    }
}
