export interface StockAuditLog {
  id: number;
  productId: number;
  productSku?: string;
  productName?: string;
  orderId?: number;
  quantityDelta: number;
  reservedQuantityDelta: number;
  newQuantity: number;
  newReservedQuantity: number;
  reason: string;
  operator: string;
  createdAt: string;
}

export interface StockAdjustmentRequest {
  productId: number;
  quantityDelta: number;
  reason: string;
}

export interface DashboardStats {
  totalProducts: number;
  lowStockCount: number;
  pendingOrdersCount: number;
  totalValuation: number;
  recentActivity: StockAuditLog[];
}
