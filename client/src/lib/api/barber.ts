// Typed calls to the BARBER API (backend/app/admin/api/v1/barber*.py).
import { api, type Page } from "./client";
import type { BookingStatus } from "@/lib/barber/format";

export type Service = {
    id: number;
    name: string;
    price: number;
    duration_minutes: number;
    description?: string | null;
    is_active: boolean;
    sort_order: number;
};

export type ServiceInput = Omit<Service, "id">;

export type PublicProfile = {
    display_name: string;
    whatsapp_number?: string | null;
    whatsapp_url?: string | null;
    call_number?: string | null;
    call_url?: string | null;
    communes: string[];
    cancel_min_hours: number;
    pending_expiry_minutes: number;
    horizon_days: number;
};

export type OpeningDay = { weekday: number; is_open: boolean; start_time: string; end_time: string };
export type OpeningBreak = { id: number; weekday: number; start_time: string; end_time: string; label?: string | null };
export type OpeningHours = { days: OpeningDay[]; breaks: OpeningBreak[] };

export type Slot = { start_at: string; end_at: string };
export type Availability = { date: string; service_id: number; slots: Slot[] };

export type Booking = {
    id: number;
    reference: string;
    service_id: number | null;
    service_name: string;
    price: number;
    duration_minutes: number;
    start_at: string;
    end_at: string;
    status: BookingStatus;
    commune: string;
    quartier: string;
    address: string;
    landmark?: string | null;
    note?: string | null;
    expires_at?: string | null;
    confirmed_at?: string | null;
    rejected_at?: string | null;
    cancelled_at?: string | null;
    completed_at?: string | null;
    cancelled_by?: "client" | "barber" | "system" | null;
    status_reason?: string | null;
    created_time: string;
    can_cancel: boolean;
};

export type AdminBooking = Booking & {
    user_id?: number | null;
    customer_phone: string;
    customer_pseudo?: string | null;
    customer_whatsapp_url?: string | null;
    customer_call_url?: string | null;
};

export type BookingInput = {
    service_id: number;
    start_at: string;
    commune: string;
    quartier: string;
    address: string;
    landmark?: string | null;
    note?: string | null;
};

export type Client = {
    id: number;
    pseudo?: string | null;
    phone?: string | null;
    whatsapp_url?: string | null;
    call_url?: string | null;
    join_time?: string | null;
    bookings_total: number;
    bookings_completed: number;
    last_booking_at?: string | null;
    last_commune?: string | null;
    last_quartier?: string | null;
    last_address?: string | null;
};

export type Settings = {
    display_name: string;
    whatsapp_number?: string | null;
    call_number?: string | null;
    slot_step_minutes: number;
    travel_buffer_minutes: number;
    pending_expiry_minutes: number;
    cancel_min_hours: number;
    min_lead_minutes: number;
    horizon_days: number;
    communes: string[];
};

export type WorkingDay = { weekday: number; is_open: boolean; start_time: string; end_time: string };
export type BreakPeriod = { id?: number; weekday: number; start_time: string; end_time: string; label?: string | null };
export type Schedule = { days: WorkingDay[]; breaks: BreakPeriod[] };

export type Blocked = { id: number; start_at: string; end_at: string; reason?: string | null };
export type BlockedInput = { start_at: string; end_at: string; reason?: string | null };

export type Notification = {
    id: number;
    booking_id: number | null;
    recipient: "client" | "barber";
    phone: string;
    kind: string;
    message: string;
    status: "pending" | "sent" | "failed";
    attempts: number;
    next_attempt_at?: string | null;
    sent_at?: string | null;
    last_error?: string | null;
    created_time: string;
};

export type Overview = {
    today: AdminBooking[];
    pending: AdminBooking[];
    counts: Partial<Record<BookingStatus, number>>;
    failed_notifications: number;
};

export type BookingAction = "confirm" | "reject" | "cancel" | "complete";

type Query = Record<string, string | number | undefined>;

export const barberApi = {
    services: () => api<Service[]>({ method: "GET", url: "/barber/services" }),
    profile: () => api<PublicProfile>({ method: "GET", url: "/barber/profile" }),
    hours: () => api<OpeningHours>({ method: "GET", url: "/barber/hours" }),
    availability: (serviceId: number, date: string) =>
        api<Availability>({ method: "GET", url: "/barber/availability", params: { service_id: serviceId, date } }),
    createBooking: (data: BookingInput) => api<Booking>({ method: "POST", url: "/barber/bookings", data }),
    myBookings: () => api<Booking[]>({ method: "GET", url: "/barber/bookings" }),
    myBooking: (reference: string) =>
        api<Booking>({ method: "GET", url: `/barber/bookings/${encodeURIComponent(reference)}` }),
    cancel: (reference: string, reason?: string) =>
        api<Booking>({
            method: "POST",
            url: `/barber/bookings/${encodeURIComponent(reference)}/cancel`,
            data: { reason: reason || null },
        }),
};

export const barberAdminApi = {
    overview: () => api<Overview>({ method: "GET", url: "/barber-admin/overview" }),
    bookings: (params: Query) => api<Page<AdminBooking>>({ method: "GET", url: "/barber-admin/bookings", params }),
    action: (id: number, action: BookingAction, reason?: string) =>
        api<AdminBooking>({
            method: "POST",
            url: `/barber-admin/bookings/${id}/${action}`,
            data: { reason: reason || null },
        }),
    clients: (params: Query) => api<Page<Client>>({ method: "GET", url: "/barber-admin/clients", params }),
    services: () => api<Service[]>({ method: "GET", url: "/barber-admin/services" }),
    createService: (data: ServiceInput) => api<Service>({ method: "POST", url: "/barber-admin/services", data }),
    updateService: (id: number, data: ServiceInput) =>
        api<Service>({ method: "PUT", url: `/barber-admin/services/${id}`, data }),
    deleteService: (id: number) => api<null>({ method: "DELETE", url: `/barber-admin/services/${id}` }),
    settings: () => api<Settings>({ method: "GET", url: "/barber-admin/settings" }),
    saveSettings: (data: Settings) => api<Settings>({ method: "PUT", url: "/barber-admin/settings", data }),
    schedule: () => api<Schedule>({ method: "GET", url: "/barber-admin/schedule" }),
    saveSchedule: (data: Schedule) => api<Schedule>({ method: "PUT", url: "/barber-admin/schedule", data }),
    blocked: () => api<Blocked[]>({ method: "GET", url: "/barber-admin/blocked" }),
    createBlocked: (data: BlockedInput) =>
        api<Blocked & { confirmed_bookings_in_period: number }>({ method: "POST", url: "/barber-admin/blocked", data }),
    deleteBlocked: (id: number) => api<null>({ method: "DELETE", url: `/barber-admin/blocked/${id}` }),
    notifications: (params: Query) =>
        api<Page<Notification>>({ method: "GET", url: "/barber-admin/notifications", params }),
    retryNotification: (id: number) =>
        api<Notification>({ method: "POST", url: `/barber-admin/notifications/${id}/retry` }),
};
