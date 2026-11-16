"use client";

import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Plus, Trash01 } from "@untitled-ui/icons-react";
import { toast } from "sonner";
import { FieldLabel, FormError } from "@/components/auth/auth-card";
import { Card, Empty, NativeInput, SectionTitle, Spinner } from "@/components/barber/ui";
import { PageHeader } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { errorMessage } from "@/lib/api/client";
import { barberAdminApi, type Blocked, type BreakPeriod, type Schedule } from "@/lib/api/barber";
import { WEEKDAYS, formatDateTime } from "@/lib/barber/format";

const hhmm = (t: string) => t.slice(0, 5);

function ScheduleEditor() {
    const [schedule, setSchedule] = useState<Schedule | null>(null);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        barberAdminApi
            .schedule()
            .then(s =>
                setSchedule({
                    days: s.days.map(d => ({ ...d, start_time: hhmm(d.start_time), end_time: hhmm(d.end_time) })),
                    breaks: s.breaks.map(b => ({ ...b, start_time: hhmm(b.start_time), end_time: hhmm(b.end_time) })),
                })
            )
            .catch(e => setError(errorMessage(e)));
    }, []);

    if (!schedule) return error ? <FormError message={error} /> : <Spinner />;

    const setDay = (weekday: number, patch: Partial<Schedule["days"][number]>) =>
        setSchedule({ ...schedule, days: schedule.days.map(d => (d.weekday === weekday ? { ...d, ...patch } : d)) });
    const setBreak = (index: number, patch: Partial<BreakPeriod>) =>
        setSchedule({ ...schedule, breaks: schedule.breaks.map((b, i) => (i === index ? { ...b, ...patch } : b)) });

    async function save() {
        if (!schedule) return;
        setSaving(true);
        setError(null);
        try {
            const res = await barberAdminApi.saveSchedule({
                days: schedule.days,
                breaks: schedule.breaks.map(({ weekday, start_time, end_time, label }) => ({
                    weekday,
                    start_time,
                    end_time,
                    label: label || null,
                })),
            });
            setSchedule({
                days: res.days.map(d => ({ ...d, start_time: hhmm(d.start_time), end_time: hhmm(d.end_time) })),
                breaks: res.breaks.map(b => ({ ...b, start_time: hhmm(b.start_time), end_time: hhmm(b.end_time) })),
            });
            toast.success("Horaires enregistrés");
        } catch (e) {
            setError(errorMessage(e));
        } finally {
            setSaving(false);
        }
    }

    return (
        <Card>
            <SectionTitle>Horaires de la semaine</SectionTitle>
            <div className="divide-y divide-secondary">
                {[...schedule.days]
                    .sort((a, b) => a.weekday - b.weekday)
                    .map(d => {
                        const breaks = schedule.breaks
                            .map((b, i) => ({ b, i }))
                            .filter(x => x.b.weekday === d.weekday);
                        return (
                            <div key={d.weekday} className="py-3">
                                <div className="flex flex-wrap items-center gap-3">
                                    <label className="flex w-32 items-center gap-2 text-sm font-semibold text-primary">
                                        <input
                                            type="checkbox"
                                            className="size-4"
                                            checked={d.is_open}
                                            onChange={e => setDay(d.weekday, { is_open: e.target.checked })}
                                        />
                                        {WEEKDAYS[d.weekday]}
                                    </label>
                                    {d.is_open ? (
                                        <div className="flex items-center gap-2 text-sm">
                                            <NativeInput type="time" className="w-28" value={d.start_time} onChange={e => setDay(d.weekday, { start_time: e.target.value })} aria-label="Ouverture" />
                                            <span className="text-tertiary">à</span>
                                            <NativeInput type="time" className="w-28" value={d.end_time} onChange={e => setDay(d.weekday, { end_time: e.target.value })} aria-label="Fermeture" />
                                        </div>
                                    ) : (
                                        <span className="text-sm text-tertiary">Fermé</span>
                                    )}
                                </div>
                                {d.is_open && (
                                    <div className="mt-2 space-y-2 sm:pl-32">
                                        {breaks.map(({ b, i }) => (
                                            <div key={i} className="flex flex-wrap items-center gap-2 text-sm">
                                                <span className="text-tertiary">Pause</span>
                                                <NativeInput type="time" className="w-28" value={b.start_time} onChange={e => setBreak(i, { start_time: e.target.value })} aria-label="Début de pause" />
                                                <span className="text-tertiary">à</span>
                                                <NativeInput type="time" className="w-28" value={b.end_time} onChange={e => setBreak(i, { end_time: e.target.value })} aria-label="Fin de pause" />
                                                <button
                                                    type="button"
                                                    className="rounded-md p-2 text-fg-error-secondary hover:bg-error-primary"
                                                    aria-label="Supprimer la pause"
                                                    onClick={() => setSchedule({ ...schedule, breaks: schedule.breaks.filter((_, j) => j !== i) })}
                                                >
                                                    <Trash01 className="size-4" />
                                                </button>
                                            </div>
                                        ))}
                                        <button
                                            type="button"
                                            className="inline-flex items-center gap-1 text-sm font-semibold text-brand-secondary"
                                            onClick={() =>
                                                setSchedule({
                                                    ...schedule,
                                                    breaks: [...schedule.breaks, { weekday: d.weekday, start_time: "13:00", end_time: "14:00", label: "Pause" }],
                                                })
                                            }
                                        >
                                            <Plus className="size-4" /> Ajouter une pause
                                        </button>
                                    </div>
                                )}
                            </div>
                        );
                    })}
            </div>
            <FormError message={error} />
            <Button className="mt-4" size="md" isLoading={saving} onClick={save}>
                Enregistrer les horaires
            </Button>
        </Card>
    );
}

function BlockedPeriods() {
    const [rows, setRows] = useState<Blocked[] | null>(null);
    const [start, setStart] = useState("");
    const [end, setEnd] = useState("");
    const [reason, setReason] = useState("");
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(() => {
        barberAdminApi.blocked().then(setRows).catch(e => setError(errorMessage(e)));
    }, []);
    useEffect(() => load(), [load]);

    // Abidjan is UTC+0 all year: a local "YYYY-MM-DDTHH:mm" is sent with +00:00.
    const toIso = (local: string) => `${local}:00+00:00`;

    async function add(e: FormEvent) {
        e.preventDefault();
        setSaving(true);
        setError(null);
        try {
            const res = await barberAdminApi.createBlocked({ start_at: toIso(start), end_at: toIso(end), reason: reason.trim() || null });
            if (res.confirmed_bookings_in_period > 0) {
                toast.warning(
                    `Attention : ${res.confirmed_bookings_in_period} rendez-vous confirmé(s) sur cette période. Pensez à les annuler ou à prévenir les clients.`,
                    { duration: 10000 }
                );
            } else {
                toast.success("Période bloquée");
            }
            setStart("");
            setEnd("");
            setReason("");
            load();
        } catch (err) {
            setError(errorMessage(err));
        } finally {
            setSaving(false);
        }
    }

    async function remove(id: number) {
        try {
            await barberAdminApi.deleteBlocked(id);
            load();
        } catch (err) {
            toast.error(errorMessage(err));
        }
    }

    return (
        <Card>
            <SectionTitle>Dates bloquées</SectionTitle>
            <form onSubmit={add} className="grid gap-3 sm:grid-cols-4 sm:items-end">
                <div>
                    <FieldLabel htmlFor="b-start">Du</FieldLabel>
                    <NativeInput id="b-start" type="datetime-local" value={start} onChange={e => setStart(e.target.value)} required />
                </div>
                <div>
                    <FieldLabel htmlFor="b-end">Au</FieldLabel>
                    <NativeInput id="b-end" type="datetime-local" value={end} onChange={e => setEnd(e.target.value)} required />
                </div>
                <div>
                    <FieldLabel htmlFor="b-reason">Motif</FieldLabel>
                    <NativeInput id="b-reason" value={reason} onChange={e => setReason(e.target.value)} placeholder="Congé, voyage…" maxLength={200} />
                </div>
                <Button type="submit" size="md" isLoading={saving}>
                    Bloquer
                </Button>
            </form>
            <FormError message={error} />
            <div className="mt-4 space-y-2">
                {rows?.length === 0 && <Empty>Aucune date bloquée à venir.</Empty>}
                {rows?.map(b => (
                    <div key={b.id} className="flex items-center justify-between gap-3 rounded-lg bg-secondary px-3 py-2 text-sm">
                        <div>
                            <p className="font-medium text-primary">
                                {formatDateTime(b.start_at)} → {formatDateTime(b.end_at)}
                            </p>
                            {b.reason && <p className="text-tertiary">{b.reason}</p>}
                        </div>
                        <Button size="sm" variant="tertiary-destructive" onClick={() => remove(b.id)}>
                            Retirer
                        </Button>
                    </div>
                ))}
            </div>
        </Card>
    );
}

export default function AvailabilityPage() {
    return (
        <>
            <PageHeader
                title="Disponibilités"
                description="Vos horaires, pauses et jours bloqués. Les clients ne voient que les créneaux libres."
            />
            <div className="space-y-6">
                <ScheduleEditor />
                <BlockedPeriods />
            </div>
        </>
    );
}
