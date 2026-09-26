package com.devops.inventory.exception;

import lombok.Getter;

@Getter
public class InsufficientStockException extends RuntimeException {
    private final Long productId;
    private final String sku;
    private final int requested;
    private final int available;

    public InsufficientStockException(Long productId, String sku, int requested, int available) {
        super(String.format("Insufficient stock for product %s (Requested: %d, Available: %d)",
                sku != null ? sku : ("ID " + productId), requested, available));
        this.productId = productId;
        this.sku = sku;
        this.requested = requested;
        this.available = available;
    }
}
