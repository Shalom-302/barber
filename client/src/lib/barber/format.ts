// Formatting helpers. All times are shown in the business timezone
// (Africa/Abidjan), whatever the device timezone is.
export const TIMEZONE = "Africa/Abidjan";

export function formatPrice(amount: number): string {
    return `${Math.round(amount)
        .toString()
        .replace(/\B(?=(\d{3})+(?!\d))/g, " ")} FCFA`;
}

export function formatDuration(minutes: number): string {
    if (minutes < 60) return `${minutes} min`;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m ? `${h} h ${m.toString().padStart(2, "0")}` : `${h} h`;
}

const timeFmt = new Intl.DateTimeFormat("fr-FR", {
    timeZone: TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
});
const dayFmt = new Intl.DateTimeFormat("fr-FR", {
    timeZone: TIMEZONE,
    weekday: "long",
    day: "numeric",
    month: "long",
});
const shortDayFmt = new Intl.DateTimeFormat("fr-FR", {
    timeZone: TIMEZONE,
    weekday: "short",
    day: "numeric",
    month: "short",
});

export function formatTime(iso: string): string {
    return timeFmt.format(new Date(iso));
}

export function formatDay(iso: string): string {
    const s = dayFmt.format(new Date(iso));
    return s.charAt(0).toUpperCase() + s.slice(1);
}

export function formatDateTime(iso?: string | null): string {
    if (!iso) return "—";
    return `${formatDay(iso)} à ${formatTime(iso)}`;
}

/** YYYY-MM-DD of "today" in Abidjan. */
export function todayISO(): string {
    const parts = new Intl.DateTimeFormat("en-CA", {
        timeZone: TIMEZONE,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).format(new Date());
    return parts; // en-CA formats as YYYY-MM-DD
}

export function addDaysISO(isoDay: string, days: number): string {
    const [y, m, d] = isoDay.split("-").map(Number);
    const dt = new Date(Date.UTC(y, m - 1, d + days, 12));
    return dt.toISOString().slice(0, 10);
}

/** Label for a YYYY-MM-DD day ("lun. 17 nov."). Noon UTC avoids any day shift. */
export function formatDayShort(isoDay: string): string {
    return shortDayFmt.format(new Date(`${isoDay}T12:00:00Z`));
}

export function weekdayOf(isoDay: string): number {
    // 0 = Monday ... 6 = Sunday (backend convention)
    return (new Date(`${isoDay}T12:00:00Z`).getUTCDay() + 6) % 7;
}

/** 2250701020304 -> +225 07 01 02 03 04 */
export function formatPhone(phone?: string | null): string {
    if (!phone) return "—";
    if (phone.startsWith("225") && phone.length === 13) {
        const rest = phone.slice(3);
        return `+225 ${rest.match(/.{2}/g)?.join(" ")}`;
    }
    return `+${phone}`;
}

export const WEEKDAYS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];

export type BookingStatus = "PENDING" | "CONFIRMED" | "REJECTED" | "CANCELLED" | "COMPLETED";

export const STATUS_LABEL: Record<BookingStatus, string> = {
    PENDING: "En attente",
    CONFIRMED: "Confirmé",
    REJECTED: "Refusé",
    CANCELLED: "Annulé",
    COMPLETED: "Terminé",
};

export const STATUS_COLOR: Record<BookingStatus, "warning" | "success" | "error" | "gray" | "blue"> = {
    PENDING: "warning",
    CONFIRMED: "success",
    REJECTED: "error",
    CANCELLED: "gray",
    COMPLETED: "blue",
};
