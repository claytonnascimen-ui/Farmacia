export interface Product {
  id: string;
  barcode: string;
  name: string;
  description: string;
  category: string;
  price: number;
  cost_price: number;
  quantity: number;
  min_quantity: number;
  expiration_date: string; // YYYY-MM-DD
  updated_at?: string;
}

export interface SaleItem {
  product_id: string;
  product_name: string;
  quantity: number;
  price: number;
  total: number;
}

export interface Sale {
  id: string;
  created_at: string;
  customer_name: string;
  customer_cpf?: string;
  discount: number;
  total: number;
  payment_method: 'DINHEIRO' | 'CARTAO_CREDITO' | 'CARTAO_DEBITO' | 'PIX';
  items: SaleItem[];
}

export interface SupabaseConfig {
  url: string;
  key: string;
}
