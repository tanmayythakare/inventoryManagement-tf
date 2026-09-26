package com.devops.inventory.controller;

import com.devops.inventory.dto.ProductDto;
import com.devops.inventory.dto.StockAdjustmentRequest;
import com.devops.inventory.dto.StockAuditLogDto;
import com.devops.inventory.service.InventoryService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/inventory")
@RequiredArgsConstructor
public class InventoryController {

    private final InventoryService inventoryService;

    @PostMapping("/adjust")
    public ResponseEntity<ProductDto> adjustStock(
            @Valid @RequestBody StockAdjustmentRequest request,
            Authentication authentication
    ) {
        String operator = authentication != null ? authentication.getName() : "ADMIN";
        ProductDto updated = inventoryService.adjustStock(request, operator);
        return ResponseEntity.ok(updated);
    }

    @GetMapping("/audit/{productId}")
    public ResponseEntity<List<StockAuditLogDto>> getAuditLogsForProduct(@PathVariable Long productId) {
        return ResponseEntity.ok(inventoryService.getAuditLogsForProduct(productId));
    }

    @GetMapping("/audit")
    public ResponseEntity<List<StockAuditLogDto>> getRecentAuditLogs() {
        return ResponseEntity.ok(inventoryService.getRecentAuditLogs());
    }
}
