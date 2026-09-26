package com.devops.inventory.dto;

import com.devops.inventory.entity.Product;
import lombok.*;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ProductDto {
    private Long id;
    private String sku;
    private String name;
    private String description;
    private BigDecimal price;
    private String currency;
    private Integer quantity;
    private Integer reservedQuantity;
    private Integer availableQuantity;
    private String category;
    private String status;
    private Boolean active;
    private OffsetDateTime createdAt;
    private OffsetDateTime updatedAt;

    public static ProductDto fromEntity(Product product) {
        if (product == null) return null;
        int qty = product.getQuantity() != null ? product.getQuantity() : 0;
        int res = product.getReservedQuantity() != null ? product.getReservedQuantity() : 0;
        int avail = Math.max(0, qty - res);
        return ProductDto.builder()
                .id(product.getId())
                .sku(product.getSku())
                .name(product.getName())
                .description(product.getDescription())
                .price(product.getPrice())
                .currency(product.getCurrency())
                .quantity(qty)
                .reservedQuantity(res)
                .availableQuantity(avail)
                .category(product.getCategory())
                .status(product.getStatus())
                .active(product.isActive())
                .createdAt(product.getCreatedAt())
                .updatedAt(product.getUpdatedAt())
                .build();
    }
}
