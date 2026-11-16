"use client";

// One booking in the barber dashboard: client details, address, contact
// buttons for the CLIENT, and the actions allowed for its status.
import { useState } from "react";
import { toast } from "sonner";
import { FieldLabel } from "@/components/auth/auth-card";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { barberAdminApi, type AdminBooking, type BookingAction } from "@/lib/api/barber";
import { errorMessage } from "@/lib/api/client";
import { formatDateTime, formatPhone, formatPrice } from "@/lib/barber/format";
import { ContactButtons, StatusBadge, TextareaField } from "./ui";

const ACTION_LABEL: Record<BookingAction, string> = {
    confirm: "Accepter",
    reject: "Refuser",
    cancel: "Annuler",
    complete: "Terminer",
};
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

export function AdminBookingCard({
    booking,
    onChanged,
    compact = false,
}: {
    booking: AdminBooking;
    onChanged: (b: AdminBooking) => void;
    compact?: boolean;
}) {
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

    return (
        <div className="rounded-xl border border-secondary bg-primary p-4 shadow-xs">
            <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                    <p className="font-semibold text-primary">{formatDateTime(b.start_at)}</p>
                    <p className="text-sm text-secondary">
                        {b.service_name} · {formatPrice(b.price)}
                    </p>
                </div>
                <StatusBadge status={b.status} />
            </div>
            <div className="mt-3 grid gap-1 text-sm">
                <p className="text-primary">
                    <span className="font-semibold">{b.customer_pseudo || "Client"}</span>{" "}
                    <span className="text-tertiary">{formatPhone(b.customer_phone)}</span>
                </p>
                <p className="text-secondary">
                    {b.commune}, {b.quartier} — {b.address}
                </p>
                {b.landmark && <p className="text-tertiary">Repère : {b.landmark}</p>}
                {!compact && b.note && <p className="text-tertiary">Note : {b.note}</p>}
                {b.status_reason && <p className="text-tertiary">Motif : {b.status_reason}</p>}
                {b.status === "PENDING" && b.expires_at && (
                    <p className="text-xs text-warning-primary">Expire {formatDateTime(b.expires_at).toLowerCase()}</p>
                )}
                <p className="text-xs text-quaternary">Réf. {b.reference}</p>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
                {actionsFor(b).map(a => (
                    <Button
                        key={a}
                        size="sm"
                        variant={a === "confirm" || a === "complete" ? "primary" : "secondary-destructive"}
                        isLoading={busy === a}
                        onClick={() => (NEEDS_REASON.includes(a) ? setAsk(a) : run(a))}
                    >
                        {ACTION_LABEL[a]}
                    </Button>
                ))}
                <div className="ml-auto">
                    <ContactButtons
                        size="sm"
                        whatsappUrl={b.customer_whatsapp_url}
                        callUrl={b.customer_call_url}
                    />
                </div>
            </div>

            <Dialog
                open={ask !== null}
                onOpenChange={open => !open && setAsk(null)}
                title={ask === "reject" ? "Refuser la demande" : "Annuler le rendez-vous"}
                description="Le client reçoit une notification WhatsApp avec ce motif."
                content={
                    <div className="space-y-4">
                        <div>
                            <FieldLabel htmlFor={`reason-${b.id}`}>Motif (facultatif)</FieldLabel>
                            <TextareaField
                                id={`reason-${b.id}`}
                                value={reason}
                                onChange={e => setReason(e.target.value)}
                                maxLength={300}
                                placeholder="Ex. Je ne suis pas disponible à cette heure"
                            />
                        </div>
                        <div className="flex justify-end gap-2">
                            <Button variant="secondary" size="md" onClick={() => setAsk(null)}>
                                Retour
                            </Button>
                            <Button
                                variant="primary-destructive"
                                size="md"
                                isLoading={busy !== null}
                                onClick={() => ask && run(ask, reason.trim())}
                            >
                                {ask ? ACTION_LABEL[ask] : ""}
                            </Button>
                        </div>
                    </div>
                }
            />
        </div>
    );
}
