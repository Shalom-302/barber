"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { AdminBookingCard } from "@/components/kx/admin-booking-card";
import { IconAlert, IconArrow } from "@/components/kx/icons";
import { Empty, ErrorBox, Kpi, Loading, PageHeader, StatusBadge } from "@/components/kx/ui";
import { barberAdminApi, type Overview } from "@/lib/api/barber";
import { errorMessage } from "@/lib/api/client";
import { formatPhone, formatPrice, formatTime } from "@/lib/barber/format";

export default function AdminOverviewPage() {
    const [data, setData] = useState<Overview | null>(null);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(() => {
        barberAdminApi
            .overview()
            .then(d => {
                setData(d);
                setError(null);
            })
            .catch(e => setError(errorMessage(e)));
    }, []);

    useEffect(() => {
        load();
        const t = setInterval(load, 60_000);
        return () => clearInterval(t);
    }, [load]);

    const now = new Date();
    const upcomingToday = data?.today.filter(b => b.status === "CONFIRMED" && new Date(b.start_at) >= now).length ?? 0;
    const todayRevenue = data?.today.filter(b => b.status !== "CANCELLED").reduce((s, b) => s + b.price, 0) ?? 0;

    return (
        <>
            <PageHeader
                title="Tableau de bord"
                sub="Vos rendez-vous du jour et les demandes à traiter."
                actions={
                    <Link href="/admin/reservations" className="btn-ghost">
                        Toutes les réservations <IconArrow className="h-4 w-4" />
                    </Link>
                }
            />
            <ErrorBox message={error} onRetry={load} />
            {!data && !error && <Loading />}
            {data && (
                <div className="space-y-8">
                    {data.failed_notifications > 0 && (
                        <Link href="/admin/notifications?status=failed" className="alert-err flex items-center gap-3 font-medium">
                            <IconAlert className="h-5 w-5 shrink-0" />
                            <span className="flex-1">{data.failed_notifications} notification(s) WhatsApp n’ont pas pu être envoyées.</span>
                            <span className="whitespace-nowrap underline underline-offset-4">Voir et renvoyer</span>
                        </Link>
                    )}

                    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                        <Kpi tone="dark" label="En attente" value={data.pending.length} hint="À accepter ou refuser" />
                        <Kpi label="Aujourd’hui" value={data.today.length} hint={`${upcomingToday} encore à venir`} />
                        <Kpi label="Confirmés" value={data.counts.CONFIRMED ?? 0} hint={`Chiffre du jour : ${formatPrice(todayRevenue)}`} />
                        <Kpi tone={data.failed_notifications ? "warn" : "default"} label="Notifications en échec" value={data.failed_notifications} hint="WhatsApp" />
                    </div>

                    <section>
                        <div className="mb-3 flex items-center gap-3">
                            <h2 className="font-display text-lg font-semibold">Demandes en attente</h2>
                            {data.pending.length > 0 && (
                                <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-sm font-semibold text-amber-800">{data.pending.length}</span>
                            )}
                        </div>
                        {data.pending.length === 0 ? (
                            <Empty title="Rien à traiter">Les nouvelles demandes apparaîtront ici. Vous êtes aussi prévenu sur WhatsApp.</Empty>
                        ) : (
                            <div className="grid gap-3 lg:grid-cols-2">
                                {data.pending.map(b => (
                                    <AdminBookingCard key={b.id} booking={b} onChanged={load} big />
                                ))}
                            </div>
                        )}
                    </section>

                    <section>
                        <h2 className="mb-3 font-display text-lg font-semibold">Aujourd’hui</h2>
                        {data.today.length === 0 ? (
                            <Empty title="Journée libre">Aucun rendez-vous confirmé aujourd’hui.</Empty>
                        ) : (
                            <div className="card p-0 sm:p-0">
                                <ol className="divide-y divide-kx-border">
                                    {data.today.map(b => {
                                        const past = new Date(b.start_at) < now;
                                        return (
                                            <li key={b.id} className="flex items-center gap-3 px-4 py-3.5 sm:gap-4 sm:px-6">
                                                <span className={`w-12 shrink-0 font-display text-lg font-semibold sm:w-14 ${past ? "text-kx-muted" : ""}`}>{formatTime(b.start_at)}</span>
                                                <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${past ? "bg-zinc-300" : "bg-black"}`} />
                                                <div className="min-w-0 flex-1">
                                                    <p className="truncate font-medium">
                                                        {b.customer_pseudo || formatPhone(b.customer_phone)} · <span className="text-kx-muted">{b.service_name}</span>
                                                    </p>
                                                    <p className="truncate text-sm text-kx-muted">
                                                        {b.commune}, {b.quartier} — {b.address}
                                                    </p>
                                                </div>
                                                <StatusBadge status={b.status} className="hidden sm:inline-flex" />
                                                {b.customer_whatsapp_url && (
                                                    <a href={b.customer_whatsapp_url} target="_blank" rel="noopener noreferrer" className="btn-wa btn-sm">
                                                        WhatsApp
                                                    </a>
                                                )}
                                            </li>
                                        );
                                    })}
                                </ol>
                            </div>
                        )}
                    </section>
                </div>
            )}
        </>
    );
}
