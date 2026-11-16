"use client";

import Link from "next/link";
import { use, useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { FieldLabel } from "@/components/auth/auth-card";
import { Card, ContactButtons, InfoRow, SectionTitle, Spinner, StatusBadge, TextareaField } from "@/components/barber/ui";
import { PageHeader } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { barberApi, type Booking, type PublicProfile } from "@/lib/api/barber";
import { errorMessage } from "@/lib/api/client";
import { formatDateTime, formatDuration, formatPrice } from "@/lib/barber/format";
import { cn } from "@/lib/utils/cn";

function Timeline({ b }: { b: Booking }) {
    const items: { label: string; at?: string | null; tone: "done" | "bad" }[] = [
        { label: "Demande envoyée", at: b.created_time, tone: "done" },
    ];
    if (b.confirmed_at) items.push({ label: "Confirmé par le barbier", at: b.confirmed_at, tone: "done" });
    if (b.rejected_at) items.push({ label: "Refusé par le barbier", at: b.rejected_at, tone: "bad" });
    if (b.cancelled_at)
        items.push({
            label:
                b.cancelled_by === "system"
                    ? "Expiré sans confirmation"
                    : b.cancelled_by === "barber"
                      ? "Annulé par le barbier"
                      : "Annulé par vous",
            at: b.cancelled_at,
            tone: "bad",
        });
    if (b.completed_at) items.push({ label: "Rendez-vous terminé", at: b.completed_at, tone: "done" });
    return (
        <ol className="space-y-3">
            {items.map(i => (
                <li key={i.label} className="flex items-start gap-3">
                    <span
                        className={cn(
                            "mt-1.5 size-2.5 shrink-0 rounded-full",
                            i.tone === "done" ? "bg-success-solid" : "bg-error-solid"
                        )}
                    />
                    <div>
                        <p className="text-sm font-medium text-primary">{i.label}</p>
                        <p className="text-xs text-tertiary">{formatDateTime(i.at)}</p>
                    </div>
                </li>
            ))}
            {b.status === "PENDING" && b.expires_at && (
                <li className="flex items-start gap-3">
                    <span className="mt-1.5 size-2.5 shrink-0 rounded-full bg-warning-solid" />
                    <div>
                        <p className="text-sm font-medium text-primary">En attente de confirmation</p>
                        <p className="text-xs text-tertiary">Expire {formatDateTime(b.expires_at).toLowerCase()}</p>
                    </div>
                </li>
            )}
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
            toast.success("Rendez-vous annulé");
            setCancelOpen(false);
        } catch (e) {
            toast.error(errorMessage(e));
        } finally {
            setBusy(false);
        }
    }

    if (error) {
        return (
            <>
                <PageHeader title="Rendez-vous" />
                <p className="text-sm text-error-primary">{error}</p>
                <Link href="/mes-rendez-vous" className="mt-4 inline-block font-semibold text-brand-secondary">
                    ← Mes rendez-vous
                </Link>
            </>
        );
    }
    if (!b) return <Spinner />;

    return (
        <>
            <Link href="/mes-rendez-vous" className="mb-4 inline-block text-sm font-semibold text-tertiary">
                ← Mes rendez-vous
            </Link>
            <PageHeader title={b.service_name} description={`Référence ${b.reference}`} action={<StatusBadge status={b.status} />} />

            <div className="grid gap-4 lg:grid-cols-3">
                <div className="space-y-4 lg:col-span-2">
                    <Card>
                        <dl className="divide-y divide-secondary">
                            <InfoRow label="Date">{formatDateTime(b.start_at)}</InfoRow>
                            <InfoRow label="Durée">{formatDuration(b.duration_minutes)}</InfoRow>
                            <InfoRow label="Prix">{formatPrice(b.price)}</InfoRow>
                            <InfoRow label="Adresse">
                                {b.commune}, {b.quartier}
                                <br />
                                {b.address}
                            </InfoRow>
                            {b.landmark && <InfoRow label="Point de repère">{b.landmark}</InfoRow>}
                            {b.note && <InfoRow label="Note">{b.note}</InfoRow>}
                            {b.status_reason && <InfoRow label="Motif">{b.status_reason}</InfoRow>}
                        </dl>
                        {b.can_cancel && (
                            <Button className="mt-4" variant="secondary-destructive" size="md" onClick={() => setCancelOpen(true)}>
                                Annuler le rendez-vous
                            </Button>
                        )}
                        {!b.can_cancel && b.status === "CONFIRMED" && profile && (
                            <p className="mt-4 text-sm text-tertiary">
                                L&apos;annulation en ligne n&apos;est plus possible moins de {profile.cancel_min_hours} h
                                avant le rendez-vous : contactez directement le barbier.
                            </p>
                        )}
                    </Card>
                    <Card>
                        <SectionTitle>Suivi</SectionTitle>
                        <Timeline b={b} />
                    </Card>
                </div>

                <div className="space-y-4">
                    <Card className="border-brand">
                        <SectionTitle>Contacter le barbier</SectionTitle>
                        {profile && (profile.whatsapp_url || profile.call_url) ? (
                            <>
                                <p className="mb-4 text-sm text-tertiary">
                                    Pour toute question sur ce rendez-vous, joignez directement {profile.display_name}.
                                </p>
                                <ContactButtons whatsappUrl={profile.whatsapp_url} callUrl={profile.call_url} />
                            </>
                        ) : (
                            <p className="text-sm text-tertiary">Le barbier n&apos;a pas encore indiqué ses coordonnées.</p>
                        )}
                    </Card>
                    <div className="rounded-xl bg-secondary p-4 text-xs text-tertiary ring-1 ring-secondary ring-inset">
                        <p className="font-semibold text-secondary">Notifications automatiques</p>
                        <p className="mt-1">
                            Les notifications WhatsApp automatiques viennent d&apos;un numéro dédié : ne répondez pas à
                            ce numéro, utilisez les boutons ci-dessus pour joindre le barbier.
                        </p>
                    </div>
                </div>
            </div>

            <Dialog
                open={cancelOpen}
                onOpenChange={setCancelOpen}
                title="Annuler ce rendez-vous ?"
                description="Le barbier sera prévenu."
                content={
                    <div className="space-y-4">
                        <div>
                            <FieldLabel htmlFor="reason">Motif (facultatif)</FieldLabel>
                            <TextareaField id="reason" value={reason} onChange={e => setReason(e.target.value)} maxLength={300} />
                        </div>
                        <div className="flex justify-end gap-2">
                            <Button variant="secondary" size="md" onClick={() => setCancelOpen(false)}>
                                Garder
                            </Button>
                            <Button variant="primary-destructive" size="md" isLoading={busy} onClick={cancel}>
                                Annuler le rendez-vous
                            </Button>
                        </div>
                    </div>
                }
            />
        </>
    );
}
