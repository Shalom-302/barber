"use client";

// Kortex UI kit (ported from Kortex Defender components/ui.tsx), BARBER flavour.
import { useEffect } from "react";
import type { ReactNode } from "react";
import { STATUS_LABEL, type BookingStatus } from "@/lib/barber/format";
import { cn } from "@/lib/utils/cn";
import { IconClose, IconPhone, IconWhatsapp } from "./icons";

export function Spinner({ className = "" }: { className?: string }) {
    return (
        <span
            role="status"
            aria-label="Chargement"
            className={cn(
                "inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent",
                className
            )}
        />
    );
}

export function Loading({ label = "Chargement…" }: { label?: string }) {
    return (
        <div className="flex items-center gap-3 py-10 text-kx-muted">
            <Spinner /> {label}
        </div>
    );
}

export function ErrorBox({ message, onRetry }: { message?: string | null; onRetry?: () => void }) {
    if (!message) return null;
    return (
        <div className="alert-err flex flex-wrap items-center justify-between gap-3" role="alert">
            <span>{message}</span>
            {onRetry && (
                <button type="button" className="btn-ghost btn-sm" onClick={onRetry}>
                    Réessayer
                </button>
            )}
        </div>
    );
}

export function Empty({ title, children, action }: { title: string; children?: ReactNode; action?: ReactNode }) {
    return (
        <div className="rounded-2xl border border-dashed border-kx-border bg-white px-6 py-12 text-center">
            <p className="font-display text-lg font-semibold">{title}</p>
            {children && <div className="mx-auto mt-1 max-w-md text-sm text-kx-muted">{children}</div>}
            {action && <div className="mt-5">{action}</div>}
        </div>
    );
}

export function PageHeader({ title, sub, actions }: { title: string; sub?: ReactNode; actions?: ReactNode }) {
    return (
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3 sm:mb-8 sm:gap-4">
            <div className="min-w-0">
                <h1 className="font-display text-2xl font-semibold break-words md:text-3xl">{title}</h1>
                {sub && <p className="mt-1.5 text-sm break-words text-kx-muted sm:text-base">{sub}</p>}
            </div>
            {actions && <div className="flex w-full flex-wrap gap-2 sm:w-auto">{actions}</div>}
        </div>
    );
}

const STATUS_CLS: Record<BookingStatus, string> = {
    PENDING: "bg-amber-50 text-amber-800 ring-amber-200",
    CONFIRMED: "bg-kx-teal-soft text-teal-900 ring-teal-200",
    REJECTED: "bg-red-50 text-red-700 ring-red-200",
    CANCELLED: "bg-kx-panel2 text-kx-muted ring-kx-border",
    COMPLETED: "bg-black text-white ring-black",
};
const STATUS_DOT: Record<BookingStatus, string> = {
    PENDING: "bg-amber-500 animate-pulse",
    CONFIRMED: "bg-kx-teal",
    REJECTED: "bg-red-500",
    CANCELLED: "bg-zinc-400",
    COMPLETED: "bg-white",
};

export function StatusBadge({ status, className }: { status: BookingStatus; className?: string }) {
    return (
        <span
            className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap ring-1 ring-inset",
                STATUS_CLS[status] ?? "bg-kx-panel2",
                className
            )}
        >
            <span className={cn("h-1.5 w-1.5 rounded-full", STATUS_DOT[status])} />
            {STATUS_LABEL[status] ?? status}
        </span>
    );
}

export function Pager({ page, totalPages, onPage }: { page: number; totalPages: number; onPage: (p: number) => void }) {
    if (totalPages <= 1) return null;
    return (
        <nav className="mt-4 flex items-center justify-end gap-2 text-sm" aria-label="Pagination">
            <button type="button" className="btn-ghost btn-sm" disabled={page <= 1} onClick={() => onPage(page - 1)}>
                Précédent
            </button>
            <span className="text-kx-muted">
                Page {page} / {totalPages}
            </span>
            <button
                type="button"
                className="btn-ghost btn-sm"
                disabled={page >= totalPages}
                onClick={() => onPage(page + 1)}
            >
                Suivant
            </button>
        </nav>
    );
}

/** Accessible modal without extra dependency. */
export function Modal({
    open,
    onClose,
    title,
    description,
    children,
}: {
    open: boolean;
    onClose: () => void;
    title: string;
    description?: string;
    children: ReactNode;
}) {
    useEffect(() => {
        if (!open) return;
        const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
        document.addEventListener("keydown", onKey);
        const prev = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => {
            document.removeEventListener("keydown", onKey);
            document.body.style.overflow = prev;
        };
    }, [open, onClose]);
    if (!open) return null;
    return (
        <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center" role="dialog" aria-modal="true" aria-label={title}>
            <button type="button" aria-label="Fermer" className="absolute inset-0 bg-kx-navy/50 backdrop-blur-[2px]" onClick={onClose} />
            <div className="relative w-full max-w-md rounded-t-3xl bg-white p-6 shadow-float sm:rounded-3xl">
                <div className="mb-4 flex items-start justify-between gap-4">
                    <div>
                        <h2 className="font-display text-xl font-semibold">{title}</h2>
                        {description && <p className="mt-1 text-sm text-kx-muted">{description}</p>}
                    </div>
                    <button type="button" onClick={onClose} className="-mr-2 -mt-1 rounded-full p-2 text-kx-muted hover:bg-kx-panel2" aria-label="Fermer">
                        <IconClose className="h-5 w-5" />
                    </button>
                </div>
                {children}
            </div>
        </div>
    );
}

export function Field({ label, htmlFor, hint, children }: { label: string; htmlFor?: string; hint?: ReactNode; children: ReactNode }) {
    return (
        <div className="min-w-0">
            <label className="label" htmlFor={htmlFor}>
                {label}
            </label>
            {children}
            {hint && <p className="hint">{hint}</p>}
        </div>
    );
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label?: string }) {
    return (
        <button
            type="button"
            role="switch"
            aria-checked={checked}
            aria-label={label}
            onClick={() => onChange(!checked)}
            className={cn(
                "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition",
                checked ? "bg-black" : "bg-zinc-300"
            )}
        >
            <span className={cn("inline-block h-5 w-5 rounded-full bg-white shadow transition", checked ? "translate-x-5.5" : "translate-x-0.5")} />
        </button>
    );
}

export function InfoRow({ label, children }: { label: string; children: ReactNode }) {
    return (
        <div className="flex flex-col gap-0.5 py-3 sm:flex-row sm:gap-6">
            <dt className="w-36 shrink-0 text-sm text-kx-muted">{label}</dt>
            <dd className="min-w-0 text-sm font-medium break-words">{children}</dd>
        </div>
    );
}

export function Kpi({ label, value, hint, tone = "default" }: { label: string; value: ReactNode; hint?: ReactNode; tone?: "default" | "dark" | "warn" }) {
    return (
        <div
            className={cn(
                "min-w-0 rounded-2xl border p-4 sm:p-5",
                tone === "dark" ? "border-black bg-black text-white" : tone === "warn" ? "border-red-200 bg-red-50" : "border-kx-border bg-white shadow-card"
            )}
        >
            <p className={cn("text-xs font-semibold tracking-wide uppercase", tone === "dark" ? "text-white/60" : tone === "warn" ? "text-red-700" : "text-kx-muted")}>{label}</p>
            <p className="mt-2 font-display text-3xl font-semibold">{value}</p>
            {hint && <p className={cn("mt-1 text-xs", tone === "dark" ? "text-white/60" : "text-kx-muted")}>{hint}</p>}
        </div>
    );
}

/** WhatsApp + call buttons. Barber's PERSONAL numbers, or a client's number in the dashboard. */
export function ContactButtons({
    whatsappUrl,
    callUrl,
    small = false,
    whatsappLabel = "WhatsApp",
    callLabel = "Appeler",
    className,
}: {
    whatsappUrl?: string | null;
    callUrl?: string | null;
    small?: boolean;
    whatsappLabel?: string;
    callLabel?: string;
    className?: string;
}) {
    if (!whatsappUrl && !callUrl) return null;
    return (
        <div className={cn("flex flex-wrap gap-2", className)}>
            {whatsappUrl && (
                <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className={cn("btn-wa", small && "btn-sm")}>
                    <IconWhatsapp className={small ? "h-4 w-4" : "h-5 w-5"} /> {whatsappLabel}
                </a>
            )}
            {callUrl && (
                <a href={callUrl} className={cn("btn-ghost", small && "btn-sm")}>
                    <IconPhone className={small ? "h-4 w-4" : "h-5 w-5"} /> {callLabel}
                </a>
            )}
        </div>
    );
}

export function Tabs<T extends string>({ value, onChange, items }: { value: T; onChange: (v: T) => void; items: { value: T; label: string; count?: number }[] }) {
    return (
        <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
            <div className="flex w-max gap-1.5">
                {items.map(i => (
                    <button
                        key={i.value}
                        type="button"
                        onClick={() => onChange(i.value)}
                        className={cn(
                            "inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-medium whitespace-nowrap transition",
                            value === i.value ? "border-black bg-black text-white" : "border-kx-border bg-white text-kx-muted hover:border-black/30 hover:text-black"
                        )}
                    >
                        {i.label}
                        {i.count !== undefined && (
                            <span className={cn("rounded-full px-1.5 text-xs", value === i.value ? "bg-white/20" : "bg-kx-panel2")}>{i.count}</span>
                        )}
                    </button>
                ))}
            </div>
        </div>
    );
}
