"use client";

// Small building blocks shared by the client and admin BARBER pages.
import type { ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import { MessageChatCircle, Phone } from "@untitled-ui/icons-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils/cn";
import { STATUS_COLOR, STATUS_LABEL, type BookingStatus } from "@/lib/barber/format";

export function Card({ children, className }: { children: ReactNode; className?: string }) {
    return (
        <div className={cn("rounded-xl border border-secondary bg-primary p-4 shadow-xs sm:p-6", className)}>
            {children}
        </div>
    );
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
    return (
        <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-primary">{children}</h2>
            {action}
        </div>
    );
}

export function StatusBadge({ status }: { status: BookingStatus }) {
    return (
        <Badge size="sm" color={STATUS_COLOR[status] ?? "gray"}>
            {STATUS_LABEL[status] ?? status}
        </Badge>
    );
}

const fieldClass =
    "w-full rounded-lg bg-primary px-3 py-2.5 text-md text-primary shadow-xs ring-1 ring-primary ring-inset outline-none placeholder:text-placeholder focus:ring-2 focus:ring-brand disabled:cursor-not-allowed disabled:bg-disabled_subtle disabled:text-disabled";

export function SelectField({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
    return (
        <select className={cn(fieldClass, "appearance-auto", className)} {...props}>
            {children}
        </select>
    );
}

export function TextareaField({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
    return <textarea className={cn(fieldClass, "min-h-20 resize-y", className)} {...props} />;
}

export function NativeInput({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
    return <input className={cn(fieldClass, className)} {...props} />;
}

export function Spinner({ className }: { className?: string }) {
    return (
        <div className={cn("flex justify-center py-10", className)}>
            <div className="size-7 animate-spin rounded-full border-2 border-brand border-t-transparent" />
        </div>
    );
}

export function Empty({ children }: { children: ReactNode }) {
    return (
        <div className="rounded-xl border border-dashed border-secondary bg-primary px-4 py-10 text-center text-sm text-tertiary">
            {children}
        </div>
    );
}

/** WhatsApp + call buttons. Used with the barber's PERSONAL numbers, or a client's number. */
export function ContactButtons({
    whatsappUrl,
    callUrl,
    size = "md",
    whatsappLabel = "WhatsApp",
    callLabel = "Appeler",
}: {
    whatsappUrl?: string | null;
    callUrl?: string | null;
    size?: "sm" | "md";
    whatsappLabel?: string;
    callLabel?: string;
}) {
    if (!whatsappUrl && !callUrl) return null;
    const base =
        "inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-colors " +
        (size === "sm" ? "px-3 py-2 text-sm" : "px-4 py-2.5 text-md");
    return (
        <div className="flex flex-wrap gap-2">
            {whatsappUrl && (
                <a
                    href={whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn(base, "bg-[#25D366] text-white hover:bg-[#1ebe5a]")}
                >
                    <MessageChatCircle className="size-5" />
                    {whatsappLabel}
                </a>
            )}
            {callUrl && (
                <a href={callUrl} className={cn(base, "bg-primary text-secondary ring-1 ring-primary ring-inset hover:bg-primary_hover")}>
                    <Phone className="size-5" />
                    {callLabel}
                </a>
            )}
        </div>
    );
}

export function InfoRow({ label, children }: { label: string; children: ReactNode }) {
    return (
        <div className="flex flex-col gap-0.5 py-2 sm:flex-row sm:gap-4">
            <dt className="w-40 shrink-0 text-sm text-tertiary">{label}</dt>
            <dd className="text-sm font-medium text-primary">{children}</dd>
        </div>
    );
}
