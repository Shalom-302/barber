"use client";

import Link from "next/link";
import { use, useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { IconArrowLeft, IconClock, IconPin, IconScissors } from "@/components/kx/icons";
import { ErrorBox, InfoRow, Loading, Modal, Spinner, StatusBadge } from "@/components/kx/ui";
import { barberApi, type Booking, type PublicProfile } from "@/lib/api/barber";
import { errorMessage } from "@/lib/api/client";
import { formatDateTime, formatDuration, formatPrice } from "@/lib/barber/format";
import { cn } from "@/lib/utils/cn";

function Timeline({ b }: { b: Booking }) {
    const items: { label: string; at?: string | null; tone: "done" | "bad" | "wait" }[] = [{ label: "Demande envoyée", at: b.created_time, tone: "done" }];
    if (b.confirmed_at) items.push({ label: "Confirmé par le barbier", at: b.confirmed_at, tone: "done" });
    if (b.rejected_at) items.push({ label: "Refusé par le barbier", at: b.rejected_at, tone: "bad" });
    if (b.cancelled_at)
        items.push({
            label: b.cancelled_by === "system" ? "Expiré sans confirmation" : b.cancelled_by === "barber" ? "Annulé par le barbier" : "Annulé par vous",
            at: b.cancelled_at,
            tone: "bad",
        });
    if (b.completed_at) items.push({ label: "Rendez-vous terminé", at: b.completed_at, tone: "done" });
    if (b.status === "PENDING") items.push({ label: "En attente de confirmation", at: b.expires_at, tone: "wait" });
    return (
        <ol className="relative space-y-5 before:absolute before:top-2 before:bottom-2 before:left-[7px] before:w-px before:bg-kx-border">
            {items.map(i => (
                <li key={i.label} className="relative flex items-start gap-4">
                    <span
                        className={cn(
                            "relative z-10 mt-1 h-[15px] w-[15px] shrink-0 rounded-full border-[3px] border-white ring-1",
                            i.tone === "done" ? "bg-brass ring-brass" : i.tone === "bad" ? "bg-red-500 ring-red-500" : "animate-pulse bg-amber-500 ring-amber-500"
                        )}
                    />
                    <div>
                        <p className="text-sm font-semibold">{i.label}</p>
                        <p className="text-xs text-kx-muted">{i.tone === "wait" && i.at ? `Expire ${formatDateTime(i.at).toLowerCase()}` : formatDateTime(i.at)}</p>
                    </div>
                </li>
            ))}
        </ol>
    );
}

export default function BookingDetailPage({ params }: { params: Promise<{ reference: string }> }) {
    const { reference } = use(params);
    const [b, setB] = useState<Booking | null>(null);
    const [profile, setProfile] = useState<PublicProfile | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [cancelOpen, setCancelOpen] = useState(false);
    const [reason, setReason] = useState("");
    const [busy, setBusy] = useState(false);

    const load = useCallback(() => {
        barberApi.myBooking(reference).then(setB).catch(e => setError(errorMessage(e)));
    }, [reference]);

    useEffect(() => {
        load();
        barberApi.profile().then(setProfile).catch(() => setProfile(null));
    }, [load]);

    async function cancel() {
        setBusy(true);
        try {
            setB(await barberApi.cancel(reference, reason.trim()));
            toast.success("Rendez-vous annulé, le barbier est prévenu");
            setCancelOpen(false);
        } catch (e) {
            toast.error(errorMessage(e));
        } finally {
            setBusy(false);
        }
    }

    const back = (
        <Link href="/mes-rendez-vous" className="mb-5 inline-flex items-center gap-1.5 text-sm font-medium text-kx-muted hover:text-brass-dark">
            <IconArrowLeft className="h-4 w-4" /> Mes rendez-vous
        </Link>
    );

    if (error) return <>{back}<ErrorBox message={error} /></>;
    if (!b) return <Loading />;

    return (
        <>
            {back}
            <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                    <p className="text-[11px] font-semibold tracking-[0.28em] text-brass-dark uppercase">Réf. {b.reference}</p>
                    <h1 className="mt-1 font-barber text-3xl text-ink md:text-5xl">{formatDateTime(b.start_at)}</h1>
                </div>
                <StatusBadge status={b.status} className="px-3 py-1.5 text-sm" />
            </div>

            <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
                <div className="space-y-4">
                    <div className="card">
                        <div className="flex items-center justify-between gap-4 border-b border-kx-border pb-4">
                            <div className="flex min-w-0 items-center gap-3">
                                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-ink text-brass">
                                    <IconScissors className="h-5 w-5" />
                                </span>
                                <div className="min-w-0">
                                    <p className="font-display font-semibold">{b.service_name}</p>
                                    <p className="flex items-center gap-1 text-sm text-kx-muted">
                                        <IconClock className="h-4 w-4" /> {formatDuration(b.duration_minutes)}
                                    </p>
                                </div>
                            </div>
                            <p className="font-barber text-3xl whitespace-nowrap text-brass-dark">{formatPrice(b.price)}</p>
                        </div>
                        <dl className="divide-y divide-kx-border">
                            <InfoRow label="Adresse">
                                <span className="inline-flex items-start gap-1.5">
                                    <IconPin className="mt-0.5 h-4 w-4 shrink-0 text-brass-dark" />
                                    <span>
                                        {b.commune}, {b.quartier}
                                        <br />
                                        {b.address}
                                    </span>
                                </span>
                            </InfoRow>
                            {b.landmark && <InfoRow label="Point de repère">{b.landmark}</InfoRow>}
                            {b.note && <InfoRow label="Note">{b.note}</InfoRow>}
                            {b.status_reason && <InfoRow label="Motif">{b.status_reason}</InfoRow>}
                        </dl>
                        {b.can_cancel && (
                            <button type="button" className="btn-danger mt-4" onClick={() => setCancelOpen(true)}>
                                Annuler le rendez-vous
                            </button>
                        )}
                        {!b.can_cancel && b.status === "CONFIRMED" && profile && (
                            <p className="alert-info mt-4">
                                L’annulation en ligne n’est plus possible moins de {profile.cancel_min_hours} h avant le rendez-vous : contactez directement le barbier.
                            </p>
                        )}
                    </div>
                    <div className="card">
                        <p className="card-title">Suivi</p>
                        <Timeline b={b} />
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="rounded-2xl bg-ink p-5 text-cream sm:p-6">
                        <p className="font-barber text-2xl">Contacter <span className="text-brass">le barbier</span></p>
                        {profile && (profile.whatsapp_url || profile.call_url) ? (
                            <>
                                <p className="mt-1 mb-5 text-sm text-white/60">Une question sur ce rendez-vous ? Joignez directement {profile.display_name}.</p>
                                <div className="flex flex-wrap gap-2">
                                    {profile.whatsapp_url && (
                                        <a href={profile.whatsapp_url} target="_blank" rel="noopener noreferrer" className="btn-wa">
                                            WhatsApp
                                        </a>
                                    )}
                                    {profile.call_url && (
                                        <a href={profile.call_url} className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-black hover:bg-zinc-200">
                                            Appeler
                                        </a>
                                    )}
                                </div>
                            </>
                        ) : (
                            <p className="mt-2 text-sm text-white/60">Le barbier n’a pas encore indiqué ses coordonnées.</p>
                        )}
                    </div>
                    <div className="alert-info text-xs">
                        <p className="font-semibold text-kx-text">Notifications automatiques</p>
                        <p className="mt-1">
                            Les notifications WhatsApp automatiques viennent d’un numéro dédié : ne répondez pas à ce numéro, utilisez les boutons ci-dessus pour joindre le barbier.
                        </p>
                    </div>
                </div>
            </div>

            <Modal open={cancelOpen} onClose={() => setCancelOpen(false)} title="Annuler ce rendez-vous ?" description="Le barbier sera prévenu sur WhatsApp.">
                <label className="label" htmlFor="reason">
                    Motif <span className="font-normal text-kx-muted">(facultatif)</span>
                </label>
                <textarea id="reason" className="input min-h-24" value={reason} onChange={e => setReason(e.target.value)} maxLength={300} />
                <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                    <button type="button" className="btn-ghost" onClick={() => setCancelOpen(false)}>
                        Garder
                    </button>
                    <button type="button" className="btn bg-red-600 hover:bg-red-700" disabled={busy} onClick={cancel}>
                        {busy && <Spinner />} Annuler le rendez-vous
                    </button>
                </div>
            </Modal>
        </>
    );
}
