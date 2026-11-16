"use client";

import { useEffect, useState } from "react";
import type { FormEvent, KeyboardEvent } from "react";
import { XClose } from "@untitled-ui/icons-react";
import { toast } from "sonner";
import { FieldLabel, FormError } from "@/components/auth/auth-card";
import { Card, NativeInput, SectionTitle, Spinner } from "@/components/barber/ui";
import { PageHeader } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { errorMessage } from "@/lib/api/client";
import { barberAdminApi, type Settings } from "@/lib/api/barber";
import { formatPhone } from "@/lib/barber/format";

function NumberField({
    id,
    label,
    hint,
    value,
    onChange,
    min,
    max,
}: {
    id: string;
    label: string;
    hint?: string;
    value: number;
    onChange: (v: number) => void;
    min: number;
    max: number;
}) {
    return (
        <div>
            <FieldLabel htmlFor={id}>{label}</FieldLabel>
            <NativeInput id={id} type="number" min={min} max={max} value={value} onChange={e => onChange(Number(e.target.value))} required />
            {hint && <p className="mt-1 text-xs text-tertiary">{hint}</p>}
        </div>
    );
}

export default function SettingsAdminPage() {
    const [s, setS] = useState<Settings | null>(null);
    const [commune, setCommune] = useState("");
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        barberAdminApi.settings().then(setS).catch(e => setError(errorMessage(e)));
    }, []);

    if (!s) return error ? <FormError message={error} /> : <Spinner />;

    const set = (patch: Partial<Settings>) => setS({ ...s, ...patch });

    function addCommune(e?: KeyboardEvent) {
        if (e && e.key !== "Enter") return;
        e?.preventDefault();
        const c = commune.trim();
        if (!c || !s) return;
        if (!s.communes.includes(c)) set({ communes: [...s.communes, c] });
        setCommune("");
    }

    async function save(e: FormEvent) {
        e.preventDefault();
        if (!s) return;
        setSaving(true);
        setError(null);
        try {
            const saved = await barberAdminApi.saveSettings({
                ...s,
                whatsapp_number: s.whatsapp_number?.trim() || null,
                call_number: s.call_number?.trim() || null,
            });
            setS(saved);
            toast.success("Réglages enregistrés");
        } catch (err) {
            setError(errorMessage(err));
            toast.error(errorMessage(err));
        } finally {
            setSaving(false);
        }
    }

    return (
        <>
            <PageHeader title="Réglages" description="Vos coordonnées et les règles de réservation." />
            <form onSubmit={save} className="space-y-6">
                <Card className="space-y-4">
                    <SectionTitle>Vos coordonnées</SectionTitle>
                    <div>
                        <FieldLabel htmlFor="display_name">Nom affiché</FieldLabel>
                        <NativeInput id="display_name" value={s.display_name} onChange={e => set({ display_name: e.target.value })} required minLength={2} maxLength={120} />
                    </div>
                    <p className="rounded-lg bg-brand-primary px-3 py-2 text-sm text-brand-secondary">
                        Numéros personnels affichés aux clients pour vous contacter. Ce n&apos;est PAS le numéro des
                        notifications automatiques.
                    </p>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                            <FieldLabel htmlFor="whatsapp_number">Votre WhatsApp personnel</FieldLabel>
                            <NativeInput id="whatsapp_number" type="tel" inputMode="tel" value={s.whatsapp_number ?? ""} onChange={e => set({ whatsapp_number: e.target.value })} placeholder="07 01 02 03 04" />
                            {s.whatsapp_number && /^\d{11,15}$/.test(s.whatsapp_number) && (
                                <p className="mt-1 text-xs text-tertiary">Enregistré : {formatPhone(s.whatsapp_number)}</p>
                            )}
                        </div>
                        <div>
                            <FieldLabel htmlFor="call_number">Votre numéro d&apos;appel</FieldLabel>
                            <NativeInput id="call_number" type="tel" inputMode="tel" value={s.call_number ?? ""} onChange={e => set({ call_number: e.target.value })} placeholder="05 01 02 03 04" />
                            {s.call_number && /^\d{11,15}$/.test(s.call_number) && (
                                <p className="mt-1 text-xs text-tertiary">Enregistré : {formatPhone(s.call_number)}</p>
                            )}
                        </div>
                    </div>
                </Card>

                <Card className="space-y-4">
                    <SectionTitle>Règles de réservation</SectionTitle>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <NumberField id="slot" label="Pas des créneaux (min)" hint="Ex. 30 : créneaux à 9:00, 9:30…" value={s.slot_step_minutes} onChange={v => set({ slot_step_minutes: v })} min={5} max={240} />
                        <NumberField id="buffer" label="Temps de trajet entre deux rendez-vous (min)" value={s.travel_buffer_minutes} onChange={v => set({ travel_buffer_minutes: v })} min={0} max={240} />
                        <NumberField id="expiry" label="Expiration d'une demande sans réponse (min)" hint="Le créneau est libéré après ce délai." value={s.pending_expiry_minutes} onChange={v => set({ pending_expiry_minutes: v })} min={5} max={10080} />
                        <NumberField id="cancel" label="Annulation client possible jusqu'à (h avant)" value={s.cancel_min_hours} onChange={v => set({ cancel_min_hours: v })} min={0} max={336} />
                        <NumberField id="lead" label="Délai minimum avant un rendez-vous (min)" value={s.min_lead_minutes} onChange={v => set({ min_lead_minutes: v })} min={0} max={10080} />
                        <NumberField id="horizon" label="Réservation possible jusqu'à (jours)" value={s.horizon_days} onChange={v => set({ horizon_days: v })} min={1} max={365} />
                    </div>
                </Card>

                <Card className="space-y-3">
                    <SectionTitle>Communes desservies</SectionTitle>
                    <div className="flex flex-wrap gap-2">
                        {s.communes.map(c => (
                            <span key={c} className="inline-flex items-center gap-1 rounded-full bg-secondary px-3 py-1 text-sm text-secondary">
                                {c}
                                <button type="button" aria-label={`Retirer ${c}`} onClick={() => set({ communes: s.communes.filter(x => x !== c) })}>
                                    <XClose className="size-3.5" />
                                </button>
                            </span>
                        ))}
                        {s.communes.length === 0 && <span className="text-sm text-tertiary">Toutes les communes sont acceptées.</span>}
                    </div>
                    <div className="flex gap-2">
                        <NativeInput value={commune} onChange={e => setCommune(e.target.value)} onKeyDown={addCommune} placeholder="Ajouter une commune" maxLength={60} />
                        <Button size="md" variant="secondary" onClick={() => addCommune()}>
                            Ajouter
                        </Button>
                    </div>
                </Card>

                <FormError message={error} />
                <Button type="submit" size="lg" isLoading={saving}>
                    Enregistrer les réglages
                </Button>
            </form>
        </>
    );
}
