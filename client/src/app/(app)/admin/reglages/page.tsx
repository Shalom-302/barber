"use client";

import { useEffect, useState } from "react";
import type { FormEvent, KeyboardEvent } from "react";
import { toast } from "sonner";
import { IconAlert, IconClose, IconPhone, IconWhatsapp } from "@/components/kx/icons";
import { ErrorBox, Field, Loading, PageHeader, Spinner } from "@/components/kx/ui";
import { barberAdminApi, type Settings } from "@/lib/api/barber";
import { errorMessage } from "@/lib/api/client";
import { formatPhone } from "@/lib/barber/format";

function NumberField({ id, label, hint, value, onChange, min, max, unit }: { id: string; label: string; hint?: string; value: number; onChange: (v: number) => void; min: number; max: number; unit: string }) {
    return (
        <Field label={label} htmlFor={id} hint={hint}>
            <div className="relative">
                <input id={id} className="input pr-14" type="number" min={min} max={max} value={value} onChange={e => onChange(Number(e.target.value))} required />
                <span className="pointer-events-none absolute top-1/2 right-3.5 -translate-y-1/2 text-sm text-kx-muted">{unit}</span>
            </div>
        </Field>
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

    if (!s) return error ? <ErrorBox message={error} /> : <Loading />;

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
            const saved = await barberAdminApi.saveSettings({ ...s, whatsapp_number: s.whatsapp_number?.trim() || null, call_number: s.call_number?.trim() || null });
            setS(saved);
            toast.success("Réglages enregistrés");
        } catch (err) {
            setError(errorMessage(err));
            toast.error(errorMessage(err));
        } finally {
            setSaving(false);
        }
    }

    const saved = (v?: string | null) => (v && /^\d{11,15}$/.test(v) ? `Enregistré : ${formatPhone(v)}` : undefined);

    return (
        <form onSubmit={save}>
            <PageHeader
                title="Réglages"
                sub="Vos coordonnées et les règles de réservation."
                actions={
                    <button type="submit" className="btn" disabled={saving}>
                        {saving && <Spinner />} Enregistrer
                    </button>
                }
            />
            <div className="space-y-6">
                <section className="card">
                    <p className="card-title text-lg">Profil & contact personnel</p>
                    <div className="space-y-5">
                        <Field label="Nom affiché aux clients" htmlFor="display_name">
                            <input id="display_name" className="input" value={s.display_name} onChange={e => set({ display_name: e.target.value })} required minLength={2} maxLength={120} />
                        </Field>
                        <div className="alert-warn flex gap-3">
                            <IconAlert className="mt-0.5 h-5 w-5 shrink-0" />
                            <p>
                                <b>Numéros personnels</b> affichés aux clients pour vous contacter (boutons WhatsApp et Appeler). Ce n’est <b>PAS</b> le numéro des
                                notifications automatiques, qui ne doit jamais être indiqué ici.
                            </p>
                        </div>
                        <div className="grid gap-5 sm:grid-cols-2">
                            <Field label="Votre WhatsApp personnel" htmlFor="whatsapp_number" hint={saved(s.whatsapp_number)}>
                                <div className="relative">
                                    <IconWhatsapp className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-kx-muted" />
                                    <input id="whatsapp_number" className="input pl-10" type="tel" inputMode="tel" value={s.whatsapp_number ?? ""} onChange={e => set({ whatsapp_number: e.target.value })} placeholder="07 01 02 03 04" />
                                </div>
                            </Field>
                            <Field label="Votre numéro d’appel" htmlFor="call_number" hint={saved(s.call_number)}>
                                <div className="relative">
                                    <IconPhone className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-kx-muted" />
                                    <input id="call_number" className="input pl-10" type="tel" inputMode="tel" value={s.call_number ?? ""} onChange={e => set({ call_number: e.target.value })} placeholder="05 01 02 03 04" />
                                </div>
                            </Field>
                        </div>
                    </div>
                </section>

                <section className="card">
                    <p className="card-title text-lg">Règles de réservation</p>
                    <div className="grid gap-5 sm:grid-cols-2">
                        <NumberField id="slot" label="Pas des créneaux" unit="min" hint="Ex. 30 : créneaux à 9:00, 9:30…" value={s.slot_step_minutes} onChange={v => set({ slot_step_minutes: v })} min={5} max={240} />
                        <NumberField id="buffer" label="Trajet entre deux rendez-vous" unit="min" value={s.travel_buffer_minutes} onChange={v => set({ travel_buffer_minutes: v })} min={0} max={240} />
                        <NumberField id="expiry" label="Expiration d’une demande sans réponse" unit="min" hint="Le créneau est libéré après ce délai." value={s.pending_expiry_minutes} onChange={v => set({ pending_expiry_minutes: v })} min={5} max={10080} />
                        <NumberField id="cancel" label="Annulation client possible jusqu’à" unit="h avant" value={s.cancel_min_hours} onChange={v => set({ cancel_min_hours: v })} min={0} max={336} />
                        <NumberField id="lead" label="Délai minimum avant un rendez-vous" unit="min" value={s.min_lead_minutes} onChange={v => set({ min_lead_minutes: v })} min={0} max={10080} />
                        <NumberField id="horizon" label="Réservation possible jusqu’à" unit="jours" value={s.horizon_days} onChange={v => set({ horizon_days: v })} min={1} max={365} />
                    </div>
                </section>

                <section className="card">
                    <p className="card-title text-lg">Communes desservies</p>
                    <div className="flex flex-wrap gap-2">
                        {s.communes.map(c => (
                            <span key={c} className="chip pr-1.5">
                                {c}
                                <button type="button" className="grid h-6 w-6 place-items-center rounded-full text-kx-muted hover:bg-kx-panel2 hover:text-black" aria-label={`Retirer ${c}`} onClick={() => set({ communes: s.communes.filter(x => x !== c) })}>
                                    <IconClose className="h-3.5 w-3.5" />
                                </button>
                            </span>
                        ))}
                        {s.communes.length === 0 && <span className="text-sm text-kx-muted">Toutes les communes sont acceptées.</span>}
                    </div>
                    <div className="mt-4 flex gap-2">
                        <input className="input" value={commune} onChange={e => setCommune(e.target.value)} onKeyDown={addCommune} placeholder="Ajouter une commune" maxLength={60} />
                        <button type="button" className="btn-ghost shrink-0" onClick={() => addCommune()}>
                            Ajouter
                        </button>
                    </div>
                </section>

                <ErrorBox message={error} />
                <button type="submit" className="btn btn-lg w-full sm:w-auto" disabled={saving}>
                    {saving && <Spinner />} Enregistrer les réglages
                </button>
            </div>
        </form>
    );
}
