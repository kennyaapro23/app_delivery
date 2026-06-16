export type UserRole = "admin" | "customer" | "delivery_driver";
export type MembershipLevel = "BRONCE" | "PLATA" | "ORO" | "PLATINO";

export interface User {
  id: number;
  email: string;
  full_name: string;
  phone?: string | null;
  role: UserRole;
  is_active: boolean;
  points: number;
  membership_level: MembershipLevel;
  created_at: string;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  user_id: number;
  role: UserRole;
  full_name: string;
}

export interface Category {
  id: number;
  name: string;
  description?: string | null;
  icon: string;
  is_active: boolean;
  display_order: number;
}

export interface Product {
  id: number;
  name: string;
  description?: string | null;
  price: number;
  category_id: number;
  icon: string;
  image_url?: string | null;
  is_featured: boolean;
  is_available: boolean;
  created_at: string;
  category?: Category | null;
}

export interface ProductListResponse {
  products: Product[];
  total: number;
}

export type OrderStatus =
  | "pending"
  | "accepted"
  | "preparing"
  | "ready"
  | "on_the_way"
  | "delivered"
  | "canceled";

export type PaymentMethod = "efectivo" | "yape" | "tarjeta";

export interface OrderItem {
  id: number;
  product_id: number;
  product_name: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
}

export interface OrderTimelineEvent {
  id: number;
  status: string;
  title: string;
  description?: string | null;
  timestamp: string;
}

export interface Order {
  id: number;
  order_number: string;
  customer_id: number;
  delivery_driver_id?: number | null;
  status: OrderStatus;
  subtotal: number;
  delivery_fee: number;
  tax: number;
  total: number;
  payment_method: PaymentMethod;
  delivery_address: string;
  notes?: string | null;
  created_at: string;
  updated_at: string;
  items: OrderItem[];
  timeline: OrderTimelineEvent[];
  customer_name?: string | null;
  customer_phone?: string | null;
  driver_name?: string | null;
  driver_phone?: string | null;
}

export interface OrderListResponse {
  orders: Order[];
  total: number;
}

export interface Address {
  id: number;
  user_id: number;
  label: string;
  street: string;
  reference?: string | null;
  is_default: boolean;
}

export interface CartItem {
  product: Product;
  quantity: number;
}
