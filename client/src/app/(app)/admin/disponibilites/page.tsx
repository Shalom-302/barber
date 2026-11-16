"use client";

import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import { toast } from "sonner";
import { IconCalendar, IconPlus, IconTrash } from "@/components/kx/icons";
import { Empty, ErrorBox, Field, Loading, PageHeader, Spinner, Toggle } from "@/components/kx/ui";
import { barberAdminApi, type Blocked, type BreakPeriod, type Schedule } from "@/lib/api/barber";
import { errorMessage } from "@/lib/api/client";
import { formatDateTime, WEEKDAYS } from "@/lib/barber/format";
import { cn } from "@/lib/utils/cn";

const hhmm = (t: string) => t.slice(0, 5);
const norm = (s: Schedule): Schedule => ({
    days: s.days.map(d => ({ ...d, start_time: hhmm(d.start_time), end_time: hhmm(d.end_time) })),
    breaks: s.breaks.map(b => ({ ...b, start_time: hhmm(b.start_time), end_time: hhmm(b.end_time) })),
});

function ScheduleEditor() {
    const [schedule, setSchedule] = useState<Schedule | null>(null);
    const [saving, setSaving] = useState(false);
    const [dirty, setDirty] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        barberAdminApi.schedule().then(s => setSchedule(norm(s))).catch(e => setError(errorMessage(e)));
    }, []);

    if (!schedule) return error ? <ErrorBox message={error} /> : <Loading />;

    const edit = (next: Schedule) => {
        setSchedule(next);
        setDirty(true);
    };
    const setDay = (weekday: number, patch: Partial<Schedule["days"][number]>) =>
        edit({ ...schedule, days: schedule.days.map(d => (d.weekday === weekday ? { ...d, ...patch } : d)) });
    const setBreak = (index: number, patch: Partial<BreakPeriod>) =>
        edit({ ...schedule, breaks: schedule.breaks.map((b, i) => (i === index ? { ...b, ...patch } : b)) });

    async function save() {
        if (!schedule) return;
        setSaving(true);
        setError(null);
        try {
            const res = await barberAdminApi.saveSchedule({
                days: schedule.days,
                breaks: schedule.breaks.map(({ weekday, start_time, end_time, label }) => ({ weekday, start_time, end_time, label: label || null })),
            });
            setSchedule(norm(res));
            setDirty(false);
            toast.success("Horaires enregistrés");
        } catch (e) {
            setError(errorMessage(e));
        } finally {
            setSaving(false);
        }
    }

    return (
        <div className="card">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                    <p className="font-display text-lg font-semibold">Semaine type</p>
                    <p className="text-sm text-kx-muted">Horaires d’ouverture et pauses de chaque jour.</p>
                </div>
                <button type="button" className="btn" disabled={saving || !dirty} onClick={save}>
                    {saving && <Spinner />} {dirty ? "Enregistrer" : "Enregistré"}
                </button>
            </div>
            <div className="divide-y divide-kx-border">
                {[...schedule.days]
                    .sort((a, b) => a.weekday - b.weekday)
                    .map(d => {
                        const breaks = schedule.breaks.map((b, i) => ({ b, i })).filter(x => x.b.weekday === d.weekday);
                        return (
                            <div key={d.weekday} className="grid gap-3 py-4 md:grid-cols-[160px_1fr] md:items-start">
                                <div className="flex items-center gap-3">
                                    <Toggle checked={d.is_open} onChange={v => setDay(d.weekday, { is_open: v })} label={`Ouvert le ${WEEKDAYS[d.weekday]}`} />
                                    <span className={cn("font-display font-semibold", !d.is_open && "text-kx-muted")}>{WEEKDAYS[d.weekday]}</span>
                                </div>
                                {d.is_open ? (
                                    <div className="space-y-2.5">
                                        <div className="flex flex-wrap items-center gap-2 text-sm">
                                            <input type="time" className="input w-32" value={d.start_time} onChange={e => setDay(d.weekday, { start_time: e.target.value })} aria-label="Ouverture" />
                                            <span className="text-kx-muted">→</span>
                                            <input type="time" className="input w-32" value={d.end_time} onChange={e => setDay(d.weekday, { end_time: e.target.value })} aria-label="Fermeture" />
                                        </div>
                                        <div className="flex flex-wrap items-center gap-2">
                                            {breaks.map(({ b, i }) => (
                                                <span key={i} className="inline-flex items-center gap-1 rounded-full border border-kx-border bg-kx-bg py-1 pr-1 pl-3 text-sm">
                                                    <span className="text-kx-muted">Pause</span>
                                                    <input type="time" className="w-[5.5rem] bg-transparent px-1 text-sm outline-none" value={b.start_time} onChange={e => setBreak(i, { start_time: e.target.value })} aria-label="Début de pause" />
                                                    <span className="text-kx-muted">–</span>
                                                    <input type="time" className="w-[5.5rem] bg-transparent px-1 text-sm outline-none" value={b.end_time} onChange={e => setBreak(i, { end_time: e.target.value })} aria-label="Fin de pause" />
                                                    <button
                                                        type="button"
                                                        className="grid h-7 w-7 place-items-center rounded-full text-kx-muted hover:bg-red-50 hover:text-red-700"
                                                        aria-label="Supprimer la pause"
                                                        onClick={() => edit({ ...schedule, breaks: schedule.breaks.filter((_, j) => j !== i) })}
                                                    >
                                                        <IconTrash className="h-4 w-4" />
                                                    </button>
                                                </span>
                                            ))}
                                            <button
                                                type="button"
                                                className="inline-flex items-center gap-1 rounded-full border border-dashed border-kx-border px-3 py-1.5 text-sm font-medium text-kx-muted hover:border-black/30 hover:text-black"
                                                onClick={() => edit({ ...schedule, breaks: [...schedule.breaks, { weekday: d.weekday, start_time: "13:00", end_time: "14:00", label: "Pause" }] })}
                                            >
                                                <IconPlus className="h-4 w-4" /> Pause
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <p className="text-sm text-kx-muted md:pt-1">Fermé</p>
                                )}
                            </div>
                        );
                    })}
            </div>
            <ErrorBox message={error} />
        </div>
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
                toast.warning(`Attention : ${res.confirmed_bookings_in_period} rendez-vous confirmé(s) sur cette période. Pensez à les annuler ou à prévenir les clients.`, { duration: 10000 });
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
        <div className="card">
            <p className="font-display text-lg font-semibold">Dates bloquées</p>
            <p className="mb-4 text-sm text-kx-muted">Congés, voyages, demi-journées : aucun créneau n’est proposé sur ces périodes.</p>
            <form onSubmit={add} className="grid gap-3 rounded-2xl bg-kx-bg p-4 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_auto] lg:items-end">
                <Field label="Du" htmlFor="b-start">
                    <input id="b-start" className="input" type="datetime-local" value={start} onChange={e => setStart(e.target.value)} required />
                </Field>
                <Field label="Au" htmlFor="b-end">
                    <input id="b-end" className="input" type="datetime-local" value={end} onChange={e => setEnd(e.target.value)} required />
                </Field>
                <Field label="Motif" htmlFor="b-reason">
                    <input id="b-reason" className="input" value={reason} onChange={e => setReason(e.target.value)} placeholder="Congé, voyage…" maxLength={200} />
                </Field>
                <button type="submit" className="btn" disabled={saving}>
                    {saving && <Spinner />} Bloquer
                </button>
            </form>
            <div className="mt-3">
                <ErrorBox message={error} />
            </div>
            <div className="mt-4 space-y-2">
                {rows === null && <Loading />}
                {rows?.length === 0 && <Empty title="Aucune date bloquée à venir" />}
                {rows?.map(b => (
                    <div key={b.id} className="flex items-center gap-3 rounded-2xl border border-kx-border px-4 py-3">
                        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-kx-panel2">
                            <IconCalendar className="h-4 w-4" />
                        </span>
                        <div className="min-w-0 flex-1 text-sm">
                            <p className="font-medium">
                                {formatDateTime(b.start_at)} → {formatDateTime(b.end_at)}
                            </p>
                            {b.reason && <p className="text-kx-muted">{b.reason}</p>}
                        </div>
                        <button type="button" className="btn-danger btn-sm" onClick={() => remove(b.id)}>
                            Retirer
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default function AvailabilityPage() {
    return (
        <>
            <PageHeader title="Disponibilités" sub="Vos horaires, pauses et jours bloqués. Les clients ne voient que les créneaux libres." />
            <div className="space-y-6">
                <ScheduleEditor />
                <BlockedPeriods />
            </div>
        </>
    );
}
