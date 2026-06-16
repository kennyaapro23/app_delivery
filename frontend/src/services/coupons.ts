import { api } from "@/lib/api";

export interface Coupon {
  id: number;
  code: string;
  description?: string | null;
  discount_percent?: number | null;
  discount_amount?: number | null;
  min_order_amount: number;
  max_uses: number;
  current_uses: number;
  is_active: boolean;
  expires_at?: string | null;
  created_at: string;
}

export async function listCoupons() {
  const { data } = await api.get<Coupon[]>("/coupons");
  return data;
}

export async function createCoupon(payload: {
  code: string;
  description?: string;
  discount_percent?: number;
  discount_amount?: number;
  min_order_amount?: number;
  max_uses?: number;
  expires_at?: string;
}) {
  const { data } = await api.post<Coupon>("/coupons", payload);
  return data;
}

export interface ApplyCouponResponse {
  valid: boolean;
  discount: number;
  message: string;
}

export async function applyCoupon(code: string, order_subtotal: number) {
  const { data } = await api.post<ApplyCouponResponse>("/coupons/apply", {
    code,
    order_subtotal,
  });
  return data;
}
