export type Role = 'customer' | 'driver' | 'merchant' | 'admin';

export type OrderStatus =
  | 'pending_payment' | 'pending_merchant' | 'accepted' | 'preparing' | 'ready_for_pickup'
  | 'assigned_to_driver' | 'driver_to_merchant' | 'picked_up' | 'delivering'
  | 'completed' | 'rejected' | 'cancelled' | 'failed';

export interface Profile { id: string; full_name: string; phone: string | null; avatar_url: string | null; is_active: boolean }
export interface Category { id: string; name: string; icon: string | null }
export interface Address {
  id: string; label: string; recipient_name: string; recipient_phone: string; address_text: string;
  latitude: number; longitude: number; delivery_note: string | null; is_default: boolean;
}
export interface Merchant {
  id: string; owner_user_id: string; category_id: string | null; name: string; description: string | null; phone: string;
  address_text: string; latitude: number; longitude: number; photo_url: string | null;
  open_time: string; close_time: string; is_open: boolean; is_approved: boolean;
}
export interface Product {
  id: string; merchant_id: string; category_id: string | null; name: string; description: string | null;
  price: number; photo_path: string | null; stock: number; is_available: boolean; is_archived: boolean;
  merchants?: { name: string } | null;
}
export interface OrderItem { id: string; product_name_snapshot: string; unit_price_snapshot: number; quantity: number; line_total: number }
export interface Order {
  id: string; order_number: string; customer_id: string; merchant_id: string; driver_id: string | null;
  status: OrderStatus; payment_method: 'cod' | 'qris'; payment_status: string;
  subtotal: number; delivery_fee: number; discount_total: number; grand_total: number;
  merchant_commission: number; driver_share: number; admin_delivery_share: number;
  dest_label: string | null; dest_recipient: string | null; dest_phone: string | null; dest_address: string | null;
  dest_note: string | null; dest_lat: number | null; dest_lng: number | null;
  customer_note: string | null; cancel_reason: string | null; created_at: string; completed_at: string | null;
  merchants?: { name: string; address_text: string; latitude: number; longitude: number; phone: string } | null;
  order_items?: OrderItem[];
}
export interface HistoryRow { id: string; old_status: string | null; new_status: string; note: string | null; created_at: string }
export interface AppNotification { id: string; title: string; body: string; data: Record<string, string>; read_at: string | null; created_at: string }
