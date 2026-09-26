import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Product } from '../models/product.model';
import { Order, CreateOrderRequest } from '../models/order.model';
import { DashboardStats, StockAdjustmentRequest, StockAuditLog } from '../models/audit.model';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private http = inject(HttpClient);
  private baseUrl = environment.apiUrl;

  // Products
  getProducts(): Observable<Product[]> {
    return this.http.get<Product[]>(`${this.baseUrl}/products`);
  }

  getProductById(id: number): Observable<Product> {
    return this.http.get<Product>(`${this.baseUrl}/products/${id}`);
  }

  // Orders
  getOrders(): Observable<Order[]> {
    return this.http.get<Order[]>(`${this.baseUrl}/orders`);
  }

  getOrderById(id: number): Observable<Order> {
    return this.http.get<Order>(`${this.baseUrl}/orders/${id}`);
  }

  createOrder(request: CreateOrderRequest): Observable<Order> {
    return this.http.post<Order>(`${this.baseUrl}/orders`, request);
  }

  confirmOrder(orderId: number): Observable<Order> {
    return this.http.post<Order>(`${this.baseUrl}/orders/${orderId}/confirm`, {});
  }

  // Inventory & Audit
  adjustStock(request: StockAdjustmentRequest): Observable<Product> {
    return this.http.post<Product>(`${this.baseUrl}/inventory/adjust`, request);
  }

  getProductAuditLogs(productId: number): Observable<StockAuditLog[]> {
    return this.http.get<StockAuditLog[]>(`${this.baseUrl}/inventory/audit/${productId}`);
  }

  getRecentAuditLogs(): Observable<StockAuditLog[]> {
    return this.http.get<StockAuditLog[]>(`${this.baseUrl}/inventory/audit`);
  }

  // Dashboard
  getDashboardStats(): Observable<DashboardStats> {
    return this.http.get<DashboardStats>(`${this.baseUrl}/dashboard/stats`);
  }
}
