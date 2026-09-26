export interface Product {
  id: number;
  sku: string;
  name: string;
  description?: string;
  price: number;
  currency: string;
  quantity: number;
  reservedQuantity: number;
  availableQuantity: number;
  category: string;
  status: string;
  active?: boolean;
  createdAt?: string;
  updatedAt?: string;
}
