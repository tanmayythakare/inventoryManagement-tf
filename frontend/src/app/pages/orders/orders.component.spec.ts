import { ComponentFixture, TestBed } from '@angular/core/testing';
import { OrdersComponent } from './orders.component';
import { ApiService } from '../../core/api.service';
import { of, throwError } from 'rxjs';
import { Order } from '../../models/order.model';

describe('OrdersComponent', () => {
  let component: OrdersComponent;
  let fixture: ComponentFixture<OrdersComponent>;
  let apiServiceSpy: jasmine.SpyObj<ApiService>;

  const mockPendingOrder: Order = {
    orderId: 101,
    orderNumber: 'ORD-101',
    status: 'PENDING',
    totalAmount: 350.00,
    items: [{ productId: 3, quantity: 1, unitPrice: 350.00 }]
  };

  beforeEach(async () => {
    apiServiceSpy = jasmine.createSpyObj('ApiService', ['getOrders', 'confirmOrder']);

    await TestBed.configureTestingModule({
      imports: [OrdersComponent],
      providers: [
        { provide: ApiService, useValue: apiServiceSpy }
      ]
    }).compileComponents();

    apiServiceSpy.getOrders.and.returnValue(of([mockPendingOrder]));
    fixture = TestBed.createComponent(OrdersComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create orders component and display orders list', () => {
    expect(component).toBeTruthy();
    expect(apiServiceSpy.getOrders).toHaveBeenCalled();
    expect(component.orders.length).toBe(1);
    expect(component.orders[0].orderNumber).toBe('ORD-101');
  });

  it('should trigger confirmOrder and update status on 200 OK', () => {
    const confirmedOrder: Order = { ...mockPendingOrder, status: 'CONFIRMED' };
    apiServiceSpy.confirmOrder.and.returnValue(of(confirmedOrder));

    component.confirmOrder(mockPendingOrder);

    expect(apiServiceSpy.confirmOrder).toHaveBeenCalledWith(101);
    expect(component.message).toContain('confirmed successfully');
  });

  it('should display conflict alert when confirmOrder returns 409 Conflict', () => {
    apiServiceSpy.confirmOrder.and.returnValue(throwError(() => ({
      status: 409,
      error: { message: 'Insufficient stock for product PROD-EDGE-003' }
    })));

    component.confirmOrder(mockPendingOrder);

    expect(apiServiceSpy.confirmOrder).toHaveBeenCalledWith(101);
    expect(component.conflictMessage).toContain('Stock Conflict (409)');
    expect(component.conflictMessage).toContain('Insufficient stock');
  });
});
