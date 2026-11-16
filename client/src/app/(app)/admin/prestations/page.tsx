"use client";

import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import { toast } from "sonner";
import { FieldLabel, FormError } from "@/components/auth/auth-card";
import { Card, Empty, NativeInput, Spinner, TextareaField } from "@/components/barber/ui";
import { PageHeader } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { errorMessage } from "@/lib/api/client";
import { barberAdminApi, type Service, type ServiceInput } from "@/lib/api/barber";
import { formatDuration, formatPrice } from "@/lib/barber/format";

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
        if (!window.confirm(`Supprimer « ${s.name} » ? Si elle a déjà été réservée, elle sera seulement désactivée.`)) return;
        try {
            await barberAdminApi.deleteService(s.id);
            toast.success("Prestation supprimée ou désactivée");
            load();
        } catch (err) {
            toast.error(errorMessage(err));
        }
    }

    return (
        <>
            <PageHeader
                title="Prestations"
                description="Vos prestations et leurs tarifs, affichés aux clients. Un changement de prix ne modifie pas les réservations déjà faites."
                action={
                    <Button size="md" onClick={() => { setError(null); setDraft({ ...EMPTY }); }}>
                        Nouvelle prestation
                    </Button>
                }
            />
            {!rows && <Spinner />}
            {rows?.length === 0 && <Empty>Aucune prestation.</Empty>}
            <div className="grid gap-3 md:grid-cols-2">
                {rows?.map(s => (
                    <Card key={s.id}>
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <p className="font-semibold text-primary">{s.name}</p>
                                <p className="text-sm text-tertiary">
                                    {formatDuration(s.duration_minutes)} · ordre {s.sort_order}
                                </p>
                            </div>
                            <div className="text-right">
                                <p className="font-bold text-brand-secondary">{formatPrice(s.price)}</p>
                                <Badge size="sm" color={s.is_active ? "success" : "gray"}>
                                    {s.is_active ? "Active" : "Masquée"}
                                </Badge>
                            </div>
                        </div>
                        {s.description && <p className="mt-2 text-sm text-secondary">{s.description}</p>}
                        <div className="mt-4 flex gap-2">
                            <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => {
                                    setError(null);
                                    setDraft({ ...s, description: s.description ?? "" });
                                }}
                            >
                                Modifier
                            </Button>
                            <Button size="sm" variant="tertiary-destructive" onClick={() => remove(s)}>
                                Supprimer
                            </Button>
                        </div>
                    </Card>
                ))}
            </div>

            <Dialog
                open={draft !== null}
                onOpenChange={open => !open && setDraft(null)}
                title={draft?.id ? "Modifier la prestation" : "Nouvelle prestation"}
                content={
                    draft && (
                        <form onSubmit={save} className="space-y-4">
                            <div>
                                <FieldLabel htmlFor="s-name">Nom</FieldLabel>
                                <NativeInput id="s-name" value={draft.name} onChange={e => setDraft({ ...draft, name: e.target.value })} required minLength={2} maxLength={120} />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <FieldLabel htmlFor="s-price">Prix (FCFA)</FieldLabel>
                                    <NativeInput id="s-price" type="number" inputMode="numeric" min={0} step={500} value={draft.price} onChange={e => setDraft({ ...draft, price: Number(e.target.value) })} required />
                                </div>
                                <div>
                                    <FieldLabel htmlFor="s-duration">Durée (min)</FieldLabel>
                                    <NativeInput id="s-duration" type="number" min={5} max={600} step={5} value={draft.duration_minutes} onChange={e => setDraft({ ...draft, duration_minutes: Number(e.target.value) })} required />
                                </div>
                            </div>
                            <div>
                                <FieldLabel htmlFor="s-desc">Description</FieldLabel>
                                <TextareaField id="s-desc" value={draft.description ?? ""} onChange={e => setDraft({ ...draft, description: e.target.value })} maxLength={500} />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <FieldLabel htmlFor="s-order">Ordre d&apos;affichage</FieldLabel>
                                    <NativeInput id="s-order" type="number" value={draft.sort_order} onChange={e => setDraft({ ...draft, sort_order: Number(e.target.value) })} />
                                </div>
                                <label className="flex items-end gap-2 pb-3 text-sm font-medium text-secondary">
                                    <input type="checkbox" className="size-4" checked={draft.is_active} onChange={e => setDraft({ ...draft, is_active: e.target.checked })} />
                                    Visible par les clients
                                </label>
                            </div>
                            <FormError message={error} />
                            <div className="flex justify-end gap-2">
                                <Button variant="secondary" size="md" onClick={() => setDraft(null)}>
                                    Annuler
                                </Button>
                                <Button type="submit" size="md" isLoading={saving}>
                                    Enregistrer
                                </Button>
                            </div>
                        </form>
                    )
                }
            />
        </>
    );
}
