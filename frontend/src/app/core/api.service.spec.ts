import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ApiService } from './api.service';
import { environment } from '../../environments/environment';

describe('ApiService', () => {
  let service: ApiService;
  let httpMock: HttpTestingController;
  const baseUrl = environment.apiUrl;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        ApiService,
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    });

    service = TestBed.inject(ApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should fetch all products', () => {
    service.getProducts().subscribe((data) => {
      expect(data.length).toBe(1);
    });
    const req = httpMock.expectOne(`${baseUrl}/products`);
    expect(req.request.method).toBe('GET');
    req.flush([{ id: 1, name: 'Item', sku: 'SKU1', price: 10, quantity: 5, reservedQuantity: 0, category: 'Cat', status: 'ACTIVE' }]);
  });

  it('should fetch product by id', () => {
    service.getProductById(1).subscribe((data) => {
      expect(data.id).toBe(1);
    });
    const req = httpMock.expectOne(`${baseUrl}/products/1`);
    expect(req.request.method).toBe('GET');
    req.flush({ id: 1, name: 'Item' });
  });

  it('should fetch all orders', () => {
    service.getOrders().subscribe((data) => {
      expect(data).toBeDefined();
    });
    const req = httpMock.expectOne(`${baseUrl}/orders`);
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  it('should fetch order by id', () => {
    service.getOrderById(99).subscribe((data) => {
      expect(data.id).toBe(99);
    });
    const req = httpMock.expectOne(`${baseUrl}/orders/99`);
    expect(req.request.method).toBe('GET');
    req.flush({ id: 99 });
  });

  it('should create order', () => {
    const payload = { items: [{ productId: 1, quantity: 2 }] };
    service.createOrder(payload).subscribe();
    const req = httpMock.expectOne(`${baseUrl}/orders`);
    expect(req.request.method).toBe('POST');
    req.flush({ id: 10 });
  });

  it('should confirm order', () => {
    service.confirmOrder(10).subscribe();
    const req = httpMock.expectOne(`${baseUrl}/orders/10/confirm`);
    expect(req.request.method).toBe('POST');
    req.flush({ id: 10, status: 'CONFIRMED' });
  });

  it('should adjust stock', () => {
    const payload = { productId: 1, quantityChange: 5, reason: 'Restock' };
    service.adjustStock(payload).subscribe();
    const req = httpMock.expectOne(`${baseUrl}/inventory/adjust`);
    expect(req.request.method).toBe('POST');
    req.flush({ id: 1, quantity: 15 });
  });

  it('should fetch product audit logs', () => {
    service.getProductAuditLogs(1).subscribe();
    const req = httpMock.expectOne(`${baseUrl}/inventory/audit/1`);
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  it('should fetch recent audit logs', () => {
    service.getRecentAuditLogs().subscribe();
    const req = httpMock.expectOne(`${baseUrl}/inventory/audit`);
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  it('should fetch dashboard stats', () => {
    service.getDashboardStats().subscribe();
    const req = httpMock.expectOne(`${baseUrl}/dashboard/stats`);
    expect(req.request.method).toBe('GET');
    req.flush({ totalProducts: 10, lowStockCount: 2, totalOrders: 5, pendingOrders: 1 });
  });
});
