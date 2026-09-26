import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/api.service';
import { Product } from '../../models/product.model';

@Component({
  selector: 'app-products',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './products.component.html',
  styleUrls: ['./products.component.css']
})
export class ProductsComponent implements OnInit {
  private apiService = inject(ApiService);

  products: Product[] = [];
  filteredProducts: Product[] = [];
  searchTerm = '';
  selectedCategory = 'ALL';
  categories: string[] = ['ALL'];

  isLoading = true;
  message = '';
  errorMessage = '';

  ngOnInit(): void {
    this.loadProducts();
  }

  loadProducts(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.apiService.getProducts().subscribe({
      next: (data) => {
        this.products = data;
        const cats = new Set<string>();
        data.forEach(p => {
          if (p.category) cats.add(p.category);
        });
        this.categories = ['ALL', ...Array.from(cats)];
        this.applyFilter();
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
        this.errorMessage = 'Failed to load catalog products.';
      }
    });
  }

  applyFilter(): void {
    let result = this.products;

    if (this.selectedCategory !== 'ALL') {
      result = result.filter(p => p.category === this.selectedCategory);
    }

    if (this.searchTerm.trim() !== '') {
      const term = this.searchTerm.toLowerCase();
      result = result.filter(p =>
        p.name.toLowerCase().includes(term) ||
        p.sku.toLowerCase().includes(term) ||
        (p.description && p.description.toLowerCase().includes(term))
      );
    }

    this.filteredProducts = result;
  }

  getStockBadgeClass(available: number): string {
    if (available > 5) return 'badge-success';
    if (available > 0) return 'badge-warning';
    return 'badge-danger';
  }

  getStockBadgeText(available: number): string {
    if (available > 5) return `Available: ${available}`;
    if (available > 0) return `Low Stock: ${available}`;
    return 'Out of Stock';
  }

  createQuickOrder(product: Product): void {
    if (product.availableQuantity <= 0) {
      this.errorMessage = `Cannot order ${product.sku}: Out of stock`;
      return;
    }

    this.message = '';
    this.errorMessage = '';

    this.apiService.createOrder({
      items: [{ productId: product.id, quantity: 1 }]
    }).subscribe({
      next: (order) => {
        this.message = `Order ${order.orderNumber} placed for ${product.name}! Confirm it on the Orders page.`;
      },
      error: (err) => {
        this.errorMessage = err.error?.message || 'Failed to place order.';
      }
    });
  }
}
