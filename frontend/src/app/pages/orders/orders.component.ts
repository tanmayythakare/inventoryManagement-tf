import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../core/api.service';
import { Order } from '../../models/order.model';

@Component({
  selector: 'app-orders',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './orders.component.html',
  styleUrls: ['./orders.component.css']
})
export class OrdersComponent implements OnInit {
  private apiService = inject(ApiService);

  orders: Order[] = [];
  isLoading = true;
  message = '';
  errorMessage = '';
  conflictMessage = '';

  ngOnInit(): void {
    this.loadOrders();
  }

  loadOrders(): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.conflictMessage = '';

    this.apiService.getOrders().subscribe({
      next: (data) => {
        this.orders = data;
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
        this.errorMessage = 'Failed to load orders.';
      }
    });
  }

  confirmOrder(order: Order): void {
    this.message = '';
    this.errorMessage = '';
    this.conflictMessage = '';

    this.apiService.confirmOrder(order.orderId).subscribe({
      next: (confirmed) => {
        this.message = `Order ${confirmed.orderNumber} confirmed successfully! Inventory reserved.`;
        this.loadOrders();
      },
      error: (err) => {
        if (err.status === 409) {
          const detail = err.error?.message || 'Insufficient stock to fulfill order';
          this.conflictMessage = `Stock Conflict (409): ${detail}`;
        } else {
          this.errorMessage = err.error?.message || 'Failed to confirm order.';
        }
      }
    });
  }

  getStatusBadgeClass(status: string): string {
    switch (status) {
      case 'CONFIRMED':
      case 'DELIVERED':
        return 'badge-success';
      case 'PENDING':
        return 'badge-warning';
      case 'FAILED':
        return 'badge-danger';
      default:
        return 'badge-info';
    }
  }
}
