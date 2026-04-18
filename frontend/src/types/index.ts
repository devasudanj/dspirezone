// Shared TypeScript types matching backend schemas

export type UserRole = "user" | "admin";
export type BookingStatus = "draft" | "confirmed" | "cancelled";
export type ItemType = "service_addon" | "favor_essential";
export type PriceType = "fixed" | "per_hour" | "per_unit";
export type TableRateType = "fixed_per_event" | "per_hour";

export interface User {
  id: number;
  name: string;
  email: string;
  role: UserRole;
}

export interface Venue {
  id: number;
  name: string;
  description?: string;
  address?: string;
  base_hourly_rate: number;
  min_hours: number;
  buffer_minutes: number;
  timezone: string;
  included_rooms_count: number;
  extra_room_hourly_rate: number;
  foodcourt_table_rate_type: TableRateType;
  foodcourt_table_rate: number;
}

export interface CatalogItem {
  id: number;
  name: string;
  description?: string;
  type: ItemType;
  price_type: PriceType;
  unit_label: string;
  price: number;
  active: boolean;
  sort_order: number;
}

// Slots are returned as plain "HH:MM" strings from the backend
export type AvailableSlot = string;

export interface AvailableSlotsResponse {
  date: string;
  duration_hours: number;
  slots: string[];
  is_blackout: boolean;
  blackout_reason?: string;
}

export interface BookingLineItem {
  id: number;
  catalog_item_id?: number;
  item_type: string;
  item_name?: string;
  quantity: number;
  unit_price: number;
  price_type?: string;
  unit_label?: string;
  line_total: number;
}

export interface PriceBreakdown {
  venue_subtotal: number;
  addons_subtotal: number;
  foodcourt_subtotal: number;
  extra_rooms_subtotal: number;
  favors_subtotal: number;
  total: number;
  duration_hours: number;
  buffer_minutes: number;
}

export interface Booking {
  id: number;
  venue_id: number;
  venue_name?: string;
  user_id: number;
  date: string;
  start_time: string;
  end_time: string;
  status: BookingStatus;
  total_price: number;
  confirmation_code: string;
  contact_name?: string;
  contact_email?: string;
  contact_phone?: string;
  alt_email?: string;
  alt_phone?: string;
  notes?: string;
  created_at?: string;
  rooms_included_count: number;
  extra_rooms_count: number;
  foodcourt_tables_count: number;
  foodcourt_table_notes?: string;
  line_items: BookingLineItem[];
  price_breakdown?: PriceBreakdown;
  razorpay_invoice_id?: string;
  razorpay_invoice_short_url?: string;
}

export interface BookingLineItemInput {
  catalog_item_id: number;
  quantity: number;
}

export interface CreateBookingPayload {
  venue_id?: number;
  date: string;
  start_time: string;
  duration_hours: number;
  extra_rooms_count: number;
  foodcourt_tables_count: number;
  foodcourt_table_notes?: string;
  notes?: string;
  line_items: BookingLineItemInput[];
}

export interface Payment {
  id: number;
  booking_id: number;
  amount: number;
  status: string;
  payment_ref?: string;
  notes?: string;
  created_at?: string;
}

export interface BookingAuditLog {
  id: number;
  booking_id: number;
  changed_by_name?: string;
  changed_at?: string;
  change_summary?: string;
}

export interface BookingWithPayments extends Booking {
  total_paid: number;
  remaining_due: number;
  audit_logs: BookingAuditLog[];
}

export interface PaymentsSummary {
  payments: Payment[];
  total_paid: number;
  booking_total: number;
  remaining_due: number;
}

export interface RazorpayInvoiceOut {
  invoice_id: string;
  short_url: string;
  status: string;
  amount: number;
  booking_id: number;
}

export interface UpdateBookingPayload {
  confirmation_code: string;
  date?: string;
  start_time?: string;
  duration_hours?: number;
  extra_rooms_count?: number;
  foodcourt_tables_count?: number;
  foodcourt_table_notes?: string;
  notes?: string;
  line_items?: BookingLineItemInput[];
  contact_name?: string;
  contact_email?: string;
  contact_phone?: string;
  alt_email?: string;
  alt_phone?: string;
  changed_by_name?: string;
}

export interface WhatsIncluded {
  included_rooms_count: number;
  items: { label: string }[];
}

export interface AvailabilityRule {
  id: number;
  venue_id: number;
  day_of_week: number;
  start_time: string;
  end_time: string;
}

export interface BlackoutDate {
  id: number;
  venue_id: number;
  date: string;
  reason?: string;
}
