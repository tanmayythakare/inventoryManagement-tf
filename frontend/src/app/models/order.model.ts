export interface OrderItem {
  id?: number;
  productId: number;
  sku?: string;
  productName?: string;
  quantity: number;
  unitPrice: number;
  lineTotal?: number;
}

export interface Order {
  orderId: number;
  orderNumber: string;
  status: 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'SHIPPED' | 'DELIVERED' | 'FAILED';
  totalAmount: number;
  items: OrderItem[];
  confirmedAt?: string;
  createdAt?: string;
  message?: string;
}

export interface CreateOrderRequest {
  items: {
    productId: number;
    quantity: number;
  }[];
}
