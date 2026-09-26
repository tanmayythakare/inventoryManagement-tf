import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/api.service';
import { Product } from '../../models/product.model';
import { StockAdjustmentRequest, StockAuditLog } from '../../models/audit.model';

@Component({
  selector: 'app-inventory',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './inventory.component.html',
  styleUrls: ['./inventory.component.css']
})
export class InventoryComponent implements OnInit {
  private apiService = inject(ApiService);

  products: Product[] = [];
  selectedProduct: Product | null = null;
  auditLogs: StockAuditLog[] = [];

  // Modal controls
  isAdjustModalOpen = false;
  isAuditDrawerOpen = false;
  adjustmentDelta = 0;
  adjustmentReason = 'STOCK_INTAKE';

  reasons: string[] = ['STOCK_INTAKE', 'STOCK_ADJUSTMENT', 'CYCLE_COUNT', 'DAMAGED_WRITE_OFF'];

  isLoading = true;
  message = '';
  errorMessage = '';

  ngOnInit(): void {
    this.loadInventory();
  }

  loadInventory(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.apiService.getProducts().subscribe({
      next: (data) => {
        this.products = data;
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
        this.errorMessage = 'Failed to load inventory levels.';
      }
    });
  }

  openAdjustModal(product: Product): void {
    this.selectedProduct = product;
    this.adjustmentDelta = 0;
    this.adjustmentReason = 'STOCK_INTAKE';
    this.isAdjustModalOpen = true;
    this.message = '';
    this.errorMessage = '';
  }

  closeAdjustModal(): void {
    this.isAdjustModalOpen = false;
    this.selectedProduct = null;
  }

  submitAdjustment(): void {
    if (!this.selectedProduct || this.adjustmentDelta === 0) {
      return;
    }

    const payload: StockAdjustmentRequest = {
      productId: this.selectedProduct.id,
      quantityDelta: this.adjustmentDelta,
      reason: this.adjustmentReason
    };

    this.apiService.adjustStock(payload).subscribe({
      next: (updated) => {
        this.message = `Successfully adjusted ${updated.sku} by ${this.adjustmentDelta}. New physical: ${updated.quantity}`;
        this.closeAdjustModal();
        this.loadInventory();
      },
      error: (err) => {
        this.errorMessage = err.error?.message || 'Failed to adjust inventory stock.';
      }
    });
  }

  openAuditDrawer(product: Product): void {
    this.selectedProduct = product;
    this.isAuditDrawerOpen = true;
    this.auditLogs = [];

    this.apiService.getProductAuditLogs(product.id).subscribe({
      next: (logs) => {
        this.auditLogs = logs;
      },
      error: () => {
        this.errorMessage = 'Failed to load audit history for product.';
      }
    });
  }

  closeAuditDrawer(): void {
    this.isAuditDrawerOpen = false;
  }
}
