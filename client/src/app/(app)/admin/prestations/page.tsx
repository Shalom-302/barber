"use client";

import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import { toast } from "sonner";
import { IconClock, IconPlus, IconScissors } from "@/components/kx/icons";
import { Empty, ErrorBox, Field, Loading, Modal, PageHeader, Spinner, Toggle } from "@/components/kx/ui";
import { barberAdminApi, type Service, type ServiceInput } from "@/lib/api/barber";
import { errorMessage } from "@/lib/api/client";
import { formatDuration, formatPrice } from "@/lib/barber/format";
import { cn } from "@/lib/utils/cn";

type Draft = ServiceInput & { id?: number };
const EMPTY: Draft = { name: "", price: 0, duration_minutes: 45, description: "", is_active: true, sort_order: 0 };

export default function AdminServicesPage() {
    const [rows, setRows] = useState<Service[] | null>(null);
    const [draft, setDraft] = useState<Draft | null>(null);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(() => {
        barberAdminApi.services().then(setRows).catch(e => toast.error(errorMessage(e)));
    }, []);
    useEffect(() => load(), [load]);

    async function save(e: FormEvent) {
        e.preventDefault();
        if (!draft) return;
        setSaving(true);
        setError(null);
        const { id, ...body } = draft;
        const data: ServiceInput = {
            ...body,
            name: body.name.trim(),
            description: body.description?.trim() || null,
            price: Number(body.price),
            duration_minutes: Number(body.duration_minutes),
            sort_order: Number(body.sort_order),
        };
        try {
            if (id) await barberAdminApi.updateService(id, data);
            else await barberAdminApi.createService(data);
            toast.success(id ? "Prestation modifiée" : "Prestation créée");
            setDraft(null);
            load();
        } catch (err) {
            setError(errorMessage(err));
        } finally {
            setSaving(false);
        }
    }

    async function remove(s: Service) {
        if (!window.confirm(`Supprimer « ${s.name} » ? Si elle a déjà été réservée, elle sera seulement masquée.`)) return;
        try {
            await barberAdminApi.deleteService(s.id);
            toast.success("Prestation supprimée ou masquée");
            load();
        } catch (err) {
            toast.error(errorMessage(err));
        }
    }

    async function toggle(s: Service) {
        try {
            const { id, ...rest } = s;
            await barberAdminApi.updateService(id, { ...rest, is_active: !s.is_active });
            load();
        } catch (err) {
            toast.error(errorMessage(err));
        }
    }

    return (
        <>
            <PageHeader
                title="Prestations & tarifs"
                sub="Affichés aux clients. Un changement de prix ne modifie pas les réservations déjà faites."
                actions={
                    <button type="button" className="btn" onClick={() => { setError(null); setDraft({ ...EMPTY }); }}>
                        <IconPlus className="h-4 w-4" /> Nouvelle prestation
                    </button>
                }
            />
            {!rows && <Loading />}
            {rows?.length === 0 && <Empty title="Aucune prestation">Créez votre première prestation pour ouvrir les réservations.</Empty>}
            <div className="grid gap-3 md:grid-cols-2">
                {rows?.map(s => (
                    <div key={s.id} className={cn("flex flex-col rounded-2xl border border-kx-border bg-white p-5 shadow-card", !s.is_active && "opacity-60")}>
                        <div className="flex items-start gap-4">
                            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-kx-panel2">
                                <IconScissors className="h-5 w-5" />
                            </span>
                            <div className="min-w-0 flex-1">
                                <p className="font-display text-lg font-semibold">{s.name}</p>
                                <p className="flex items-center gap-1.5 text-sm text-kx-muted">
                                    <IconClock className="h-4 w-4" /> {formatDuration(s.duration_minutes)} · ordre {s.sort_order}
                                </p>
                            </div>
                            <p className="font-display text-2xl font-semibold whitespace-nowrap">{formatPrice(s.price)}</p>
                        </div>
                        {s.description && <p className="mt-3 text-sm text-kx-muted">{s.description}</p>}
                        <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-kx-border pt-4">
                            <label className="mr-auto flex items-center gap-2 text-sm">
                                <Toggle checked={s.is_active} onChange={() => toggle(s)} label="Visible par les clients" />
                                {s.is_active ? "Visible" : "Masquée"}
                            </label>
                            <button type="button" className="btn-ghost btn-sm" onClick={() => { setError(null); setDraft({ ...s, description: s.description ?? "" }); }}>
                                Modifier
                            </button>
                            <button type="button" className="btn-danger btn-sm" onClick={() => remove(s)}>
                                Supprimer
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            <Modal open={draft !== null} onClose={() => setDraft(null)} title={draft?.id ? "Modifier la prestation" : "Nouvelle prestation"}>
                {draft && (
                    <form onSubmit={save} className="space-y-4">
                        <Field label="Nom" htmlFor="s-name">
                            <input id="s-name" className="input" value={draft.name} onChange={e => setDraft({ ...draft, name: e.target.value })} required minLength={2} maxLength={120} autoFocus />
                        </Field>
                        <div className="grid grid-cols-2 gap-3">
                            <Field label="Prix (FCFA)" htmlFor="s-price">
                                <input id="s-price" className="input" type="number" inputMode="numeric" min={0} step={500} value={draft.price} onChange={e => setDraft({ ...draft, price: Number(e.target.value) })} required />
                            </Field>
                            <Field label="Durée (min)" htmlFor="s-duration">
                                <input id="s-duration" className="input" type="number" min={5} max={600} step={5} value={draft.duration_minutes} onChange={e => setDraft({ ...draft, duration_minutes: Number(e.target.value) })} required />
                            </Field>
                        </div>
                        <Field label="Description" htmlFor="s-desc">
                            <textarea id="s-desc" className="input min-h-20" value={draft.description ?? ""} onChange={e => setDraft({ ...draft, description: e.target.value })} maxLength={500} />
                        </Field>
                        <div className="grid grid-cols-2 items-end gap-3">
                            <Field label="Ordre d’affichage" htmlFor="s-order">
                                <input id="s-order" className="input" type="number" value={draft.sort_order} onChange={e => setDraft({ ...draft, sort_order: Number(e.target.value) })} />
                            </Field>
                            <label className="flex items-center gap-2 pb-2.5 text-sm font-medium">
                                <Toggle checked={draft.is_active} onChange={v => setDraft({ ...draft, is_active: v })} label="Visible par les clients" /> Visible
                            </label>
                        </div>
                        <ErrorBox message={error} />
                        <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
                            <button type="button" className="btn-ghost" onClick={() => setDraft(null)}>
                                Annuler
                            </button>
                            <button type="submit" className="btn" disabled={saving}>
                                {saving && <Spinner />} Enregistrer
                            </button>
                        </div>
                    </form>
                )}
            </Modal>
        </>
    );
}
