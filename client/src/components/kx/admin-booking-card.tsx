"use client";

// One booking in the barber dashboard: when, what, who, where, contact buttons
// for the CLIENT, and the actions allowed for its status.
import { useState } from "react";
import { toast } from "sonner";
import { barberAdminApi, type AdminBooking, type BookingAction } from "@/lib/api/barber";
import { errorMessage } from "@/lib/api/client";
import { formatDateTime, formatPhone, formatPrice, formatTime, TIMEZONE } from "@/lib/barber/format";
import { cn } from "@/lib/utils/cn";
import { IconCheck, IconClose, IconPin } from "./icons";
import { ContactButtons, Modal, Spinner, StatusBadge } from "./ui";

const ACTION_LABEL: Record<BookingAction, string> = { confirm: "Accepter", reject: "Refuser", cancel: "Annuler", complete: "Terminer" };
const DONE_LABEL: Record<BookingAction, string> = {
    confirm: "Rendez-vous confirmé, le client est prévenu",
    reject: "Demande refusée, le client est prévenu",
    cancel: "Rendez-vous annulé, le client est prévenu",
    complete: "Rendez-vous terminé",
};
const NEEDS_REASON: BookingAction[] = ["reject", "cancel"];

export function actionsFor(b: AdminBooking): BookingAction[] {
    if (b.status === "PENDING") return ["confirm", "reject"];
    if (b.status === "CONFIRMED") return new Date(b.start_at) <= new Date() ? ["complete", "cancel"] : ["cancel", "complete"];
    return [];
}

const dayShort = new Intl.DateTimeFormat("fr-FR", { timeZone: TIMEZONE, weekday: "short", day: "numeric", month: "short" });

export function AdminBookingCard({ booking, onChanged, big = false }: { booking: AdminBooking; onChanged: (b: AdminBooking) => void; big?: boolean }) {
    const [busy, setBusy] = useState<BookingAction | null>(null);
    const [ask, setAsk] = useState<BookingAction | null>(null);
    const [reason, setReason] = useState("");
    const b = booking;

    async function run(action: BookingAction, why?: string) {
        setBusy(action);
        try {
            const updated = await barberAdminApi.action(b.id, action, why);
            toast.success(DONE_LABEL[action]);
            onChanged(updated);
            setAsk(null);
            setReason("");
        } catch (e) {
            toast.error(errorMessage(e));
        } finally {
            setBusy(null);
        }
    }

    const actions = actionsFor(b);

    return (
        <div className="flex min-w-0 flex-col rounded-2xl border border-kx-border bg-white p-4 shadow-card sm:p-5">
            <div className="flex items-start gap-4">
                <div className="grid w-16 shrink-0 place-items-center rounded-xl bg-kx-panel2 py-2 text-center">
                    <span className="font-display text-lg leading-none font-semibold">{formatTime(b.start_at)}</span>
                    <span className="mt-1 text-[11px] text-kx-muted capitalize">{dayShort.format(new Date(b.start_at)).replace(/\./g, "")}</span>
                </div>
                <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                        <p className="font-display font-semibold">{b.customer_pseudo || "Client"}</p>
                        <StatusBadge status={b.status} />
                    </div>
                    <p className="text-sm text-kx-muted">{formatPhone(b.customer_phone)}</p>
                    <p className="mt-1 text-sm">
                        {b.service_name} · <b>{formatPrice(b.price)}</b>
                    </p>
                </div>
            </div>
            <div className="mt-3 flex gap-2 rounded-xl bg-kx-bg px-3 py-2.5 text-sm">
                <IconPin className="mt-0.5 h-4 w-4 shrink-0 text-kx-muted" />
                <div className="min-w-0">
                    <p className="font-medium break-words">
                        {b.commune}, {b.quartier}
                    </p>
                    <p className="break-words text-kx-muted">{b.address}</p>
                    {b.landmark && <p className="break-words text-kx-muted">Repère : {b.landmark}</p>}
                </div>
            </div>
            {b.note && <p className="mt-2 text-sm text-kx-muted">« {b.note} »</p>}
            {b.status_reason && <p className="mt-2 text-sm text-kx-muted">Motif : {b.status_reason}</p>}
            <div className="mt-2 flex flex-wrap justify-between gap-x-3 text-xs text-kx-muted">
                <span>Réf. {b.reference}</span>
                {b.status === "PENDING" && b.expires_at && <span className="text-amber-700">Expire {formatDateTime(b.expires_at).toLowerCase()}</span>}
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-kx-border pt-4">
                {actions.map(a => {
                    const primary = a === "confirm" || a === "complete";
                    return (
                        <button
                            key={a}
                            type="button"
                            disabled={busy !== null}
                            onClick={() => (NEEDS_REASON.includes(a) ? setAsk(a) : run(a))}
                            className={cn(primary ? "btn" : "btn-danger", big && "flex-1 py-3 sm:flex-none", !big && "btn-sm")}
                        >
                            {busy === a ? <Spinner /> : a === "confirm" ? <IconCheck className="h-4 w-4" /> : a === "reject" ? <IconClose className="h-4 w-4" /> : null}
                            {ACTION_LABEL[a]}
                        </button>
                    );
                })}
                <ContactButtons small className="ml-auto" whatsappUrl={b.customer_whatsapp_url} callUrl={b.customer_call_url} />
            </div>

            <Modal
                open={ask !== null}
                onClose={() => setAsk(null)}
                title={ask === "reject" ? "Refuser la demande" : "Annuler le rendez-vous"}
                description="Le client reçoit une notification WhatsApp avec ce motif."
            >
                <label className="label" htmlFor={`reason-${b.id}`}>
                    Motif <span className="font-normal text-kx-muted">(facultatif)</span>
                </label>
                <textarea
                    id={`reason-${b.id}`}
                    className="input min-h-24"
                    value={reason}
                    onChange={e => setReason(e.target.value)}
                    maxLength={300}
                    placeholder="Ex. Je ne suis pas disponible à cette heure"
                />
                <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                    <button type="button" className="btn-ghost" onClick={() => setAsk(null)}>
                        Retour
                    </button>
                    <button type="button" className="btn bg-red-600 hover:bg-red-700" disabled={busy !== null} onClick={() => ask && run(ask, reason.trim())}>
                        {busy && <Spinner />} {ask ? ACTION_LABEL[ask] : ""}
                    </button>
                </div>
            </Modal>
        </div>
    );
}
