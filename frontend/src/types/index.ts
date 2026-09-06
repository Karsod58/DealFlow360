// User roles
export type UserRole = 'REP' | 'MANAGER' | 'FINANCE' | 'ADMIN' | 'CUSTOMER';

// Authentication
export interface LoginRequest {
  email: string;
  password: string;
}

export interface SignupRequest extends LoginRequest {
  role?: UserRole;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface User {
  id: number;
  email: string;
  role: UserRole;
  name: string;
  created_at: string;
}

// Quotation statuses
export type QuotationStatus = 
  | 'DRAFT' 
  | 'PENDING_APPROVAL' 
  | 'APPROVED' 
  | 'NEGOTIATION' 
  | 'CONFIRMED';

// Line item status
export type LineItemStatus = 'OK' | 'OVER';

// Quotation
export interface Quotation {
  id: number;
  quotation_number: string;
  customer_id: string | null;
  customer_name: string;
  price_list_id: string;
  status: QuotationStatus;
  total_value: number;
  blended_score: number;
  line_items: LineItem[];
  created_at: string;
  updated_at: string | null;
  created_by_id: number;
}

// Line item in a quotation
export interface LineItem {
  id: number;
  quotation_id: number;
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  discount: number; // percentage
  discount_limit: number; // percentage
  line_total: number;
  status: LineItemStatus;
  overage: number; // points over limit
  created_at: string;
  updated_at: string | null;
}

// Product for upsell/cross-sell
export interface Product {
  id: number;
  product_id: string;
  name: string;
  price: number;
  margin?: number | null;
  promo_discount?: number | null;
  discount_limit: number;
  category?: string | null;
  created_at: string;
}

// Dashboard stats
export interface DashboardStats {
  pending_approvals: number;
  open_quotations: number;
  at_risk_deals: number;
}

// Activity feed item
export interface ActivityItem {
  id: number;
  message: string;
  timestamp: string;
  quotation_id?: number | null;
}

// API error response
export interface ApiError {
  detail: string;
}
