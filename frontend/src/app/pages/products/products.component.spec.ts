import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ProductsComponent } from './products.component';
import { ApiService } from '../../core/api.service';
import { of } from 'rxjs';
import { Product } from '../../models/product.model';
import { FormsModule } from '@angular/forms';

describe('ProductsComponent', () => {
  let component: ProductsComponent;
  let fixture: ComponentFixture<ProductsComponent>;
  let apiServiceSpy: jasmine.SpyObj<ApiService>;

  const mockProducts: Product[] = [
    {
      id: 1,
      sku: 'PROD-SRV-001',
      name: 'Server Blade',
      price: 5000,
      currency: 'USD',
      quantity: 10,
      reservedQuantity: 0,
      availableQuantity: 10,
      category: 'Hardware',
      status: 'ACTIVE'
    },
    {
      id: 2,
      sku: 'PROD-EDGE-003',
      name: 'Edge Gateway',
      price: 350,
      currency: 'USD',
      quantity: 1,
      reservedQuantity: 0,
      availableQuantity: 1,
      category: 'IoT',
      status: 'ACTIVE'
    },
    {
      id: 3,
      sku: 'PROD-OUT-004',
      name: 'Sold Out Node',
      price: 100,
      currency: 'USD',
      quantity: 5,
      reservedQuantity: 5,
      availableQuantity: 0,
      category: 'IoT',
      status: 'ACTIVE'
    }
  ];

  beforeEach(async () => {
    apiServiceSpy = jasmine.createSpyObj('ApiService', ['getProducts', 'createOrder']);

    await TestBed.configureTestingModule({
      imports: [ProductsComponent, FormsModule],
      providers: [
        { provide: ApiService, useValue: apiServiceSpy }
      ]
    }).compileComponents();

    apiServiceSpy.getProducts.and.returnValue(of(mockProducts));
    fixture = TestBed.createComponent(ProductsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create products component and populate catalog', () => {
    expect(component).toBeTruthy();
    expect(apiServiceSpy.getProducts).toHaveBeenCalled();
    expect(component.products.length).toBe(3);
    expect(component.filteredProducts.length).toBe(3);
  });

  it('should filter products by search term', () => {
    component.searchTerm = 'Edge';
    component.applyFilter();
    expect(component.filteredProducts.length).toBe(1);
    expect(component.filteredProducts[0].sku).toBe('PROD-EDGE-003');
  });

  it('should return correct badge classes for inventory levels', () => {
    expect(component.getStockBadgeClass(10)).toBe('badge-success');
    expect(component.getStockBadgeClass(2)).toBe('badge-warning');
    expect(component.getStockBadgeClass(0)).toBe('badge-danger');
  });

  it('should return correct badge text for inventory levels', () => {
    expect(component.getStockBadgeText(10)).toBe('Available: 10');
    expect(component.getStockBadgeText(2)).toBe('Low Stock: 2');
    expect(component.getStockBadgeText(0)).toBe('Out of Stock');
  });
});
