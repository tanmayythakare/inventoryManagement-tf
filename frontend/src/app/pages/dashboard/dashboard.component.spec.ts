import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DashboardComponent } from './dashboard.component';
import { ApiService } from '../../core/api.service';
import { ActivatedRoute } from '@angular/router';
import { of, throwError } from 'rxjs';
import { DashboardStats } from '../../models/audit.model';

describe('DashboardComponent', () => {
  let component: DashboardComponent;
  let fixture: ComponentFixture<DashboardComponent>;
  let apiServiceSpy: jasmine.SpyObj<ApiService>;

  const mockStats: DashboardStats = {
    totalProducts: 5,
    lowStockCount: 2,
    pendingOrdersCount: 3,
    totalValuation: 25000,
    recentActivity: [
      {
        id: 1,
        productId: 3,
        productSku: 'PROD-EDGE-003',
        quantityDelta: 0,
        reservedQuantityDelta: 1,
        newQuantity: 1,
        newReservedQuantity: 1,
        reason: 'ORDER_RESERVED',
        operator: 'SYSTEM',
        createdAt: '2026-09-25T16:00:00Z'
      }
    ]
  };

  beforeEach(async () => {
    apiServiceSpy = jasmine.createSpyObj('ApiService', ['getDashboardStats']);

    await TestBed.configureTestingModule({
      imports: [DashboardComponent],
      providers: [
        { provide: ApiService, useValue: apiServiceSpy },
        { provide: ActivatedRoute, useValue: { snapshot: { queryParams: {} } } }
      ]
    }).compileComponents();

    apiServiceSpy.getDashboardStats.and.returnValue(of(mockStats));
    fixture = TestBed.createComponent(DashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create dashboard component and load metrics', () => {
    expect(component).toBeTruthy();
    expect(apiServiceSpy.getDashboardStats).toHaveBeenCalled();
    expect(component.stats.totalProducts).toBe(5);
    expect(component.stats.lowStockCount).toBe(2);
    expect(component.stats.pendingOrdersCount).toBe(3);
    expect(component.stats.totalValuation).toBe(25000);
    expect(component.stats.recentActivity.length).toBe(1);
    expect(component.isLoading).toBeFalse();
  });

  it('should handle API error gracefully', () => {
    apiServiceSpy.getDashboardStats.and.returnValue(throwError(() => new Error('Network error')));
    component.loadDashboardData();
    expect(component.isLoading).toBeFalse();
    expect(component.errorMessage).toBe('Failed to load dashboard metrics.');
  });
});
