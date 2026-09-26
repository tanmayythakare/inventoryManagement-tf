import { ComponentFixture, TestBed } from '@angular/core/testing';
import { InventoryComponent } from './inventory.component';
import { ApiService } from '../../core/api.service';
import { of } from 'rxjs';
import { Product } from '../../models/product.model';
import { FormsModule } from '@angular/forms';

describe('InventoryComponent', () => {
  let component: InventoryComponent;
  let fixture: ComponentFixture<InventoryComponent>;
  let apiServiceSpy: jasmine.SpyObj<ApiService>;

  const mockProduct: Product = {
    id: 1,
    sku: 'PROD-WIDGET-001',
    name: 'Industrial Widget',
    price: 49.99,
    currency: 'USD',
    quantity: 100,
    reservedQuantity: 15,
    availableQuantity: 85,
    category: 'Hardware',
    status: 'ACTIVE'
  };

  beforeEach(async () => {
    apiServiceSpy = jasmine.createSpyObj('ApiService', ['getProducts', 'adjustStock', 'getProductAuditLogs']);

    await TestBed.configureTestingModule({
      imports: [InventoryComponent, FormsModule],
      providers: [
        { provide: ApiService, useValue: apiServiceSpy }
      ]
    }).compileComponents();

    apiServiceSpy.getProducts.and.returnValue(of([mockProduct]));
    fixture = TestBed.createComponent(InventoryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create inventory component and load products', () => {
    expect(component).toBeTruthy();
    expect(apiServiceSpy.getProducts).toHaveBeenCalled();
    expect(component.products.length).toBe(1);
  });

  it('should open and close stock adjustment modal', () => {
    expect(component.isAdjustModalOpen).toBeFalse();
    component.openAdjustModal(mockProduct);
    expect(component.isAdjustModalOpen).toBeTrue();
    expect(component.selectedProduct).toEqual(mockProduct);

    component.closeAdjustModal();
    expect(component.isAdjustModalOpen).toBeFalse();
    expect(component.selectedProduct).toBeNull();
  });

  it('should open and close audit drawer', () => {
    apiServiceSpy.getProductAuditLogs.and.returnValue(of([]));

    expect(component.isAuditDrawerOpen).toBeFalse();
    component.openAuditDrawer(mockProduct);
    expect(component.isAuditDrawerOpen).toBeTrue();
    expect(apiServiceSpy.getProductAuditLogs).toHaveBeenCalledWith(mockProduct.id);

    component.closeAuditDrawer();
    expect(component.isAuditDrawerOpen).toBeFalse();
  });
});
