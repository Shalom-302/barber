"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { IconChevron, IconPlus } from "@/components/kx/icons";
import { Empty, ErrorBox, Loading, PageHeader, StatusBadge } from "@/components/kx/ui";
import { barberApi, type Booking } from "@/lib/api/barber";
import { errorMessage } from "@/lib/api/client";
import { formatPrice, formatTime, TIMEZONE } from "@/lib/barber/format";
import { cn } from "@/lib/utils/cn";

const dayNum = new Intl.DateTimeFormat("fr-FR", { timeZone: TIMEZONE, day: "numeric" });
const monthShort = new Intl.DateTimeFormat("fr-FR", { timeZone: TIMEZONE, month: "short" });
const weekday = new Intl.DateTimeFormat("fr-FR", { timeZone: TIMEZONE, weekday: "long" });

function BookingRow({ b }: { b: Booking }) {
    const past = new Date(b.start_at) < new Date();
    const muted = b.status === "CANCELLED" || b.status === "REJECTED";
    return (
        <Link
            href={`/mes-rendez-vous/${b.reference}`}
            className={cn("group flex items-center gap-4 rounded-2xl border border-kx-border bg-white p-4 transition hover:border-black/30 hover:shadow-card sm:p-5", muted && "opacity-70")}
        >
            <div className={cn("grid w-16 shrink-0 place-items-center rounded-xl py-2.5 text-center", past || muted ? "bg-kx-panel2" : "bg-black text-white")}>
                <span className="font-display text-2xl leading-none font-semibold">{dayNum.format(new Date(b.start_at))}</span>
                <span className={cn("mt-1 text-[11px] uppercase", past || muted ? "text-kx-muted" : "text-white/70")}>{monthShort.format(new Date(b.start_at)).replace(".", "")}</span>
            </div>
            <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                    <span className="font-display font-semibold">{b.service_name}</span>
                    <StatusBadge status={b.status} />
                </div>
                <p className="mt-1 text-sm capitalize">
                    {weekday.format(new Date(b.start_at))} · {formatTime(b.start_at)}
                </p>
                <p className="truncate text-sm text-kx-muted">
                    {b.commune}, {b.quartier} · {formatPrice(b.price)}
                </p>
            </div>
            <IconChevron className="h-5 w-5 shrink-0 text-kx-muted transition group-hover:translate-x-0.5 group-hover:text-black" />
        </Link>
    );
}

export default function MyBookingsPage() {
    const [rows, setRows] = useState<Booking[] | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        barberApi.myBookings().then(setRows).catch(e => setError(errorMessage(e)));
    }, []);

    const now = new Date();
    const upcoming = rows?.filter(b => (b.status === "PENDING" || b.status === "CONFIRMED") && new Date(b.start_at) >= now) ?? [];
    const others = rows?.filter(b => !upcoming.includes(b)) ?? [];

    return (
        <>
            <PageHeader
                title="Mes rendez-vous"
                sub="Suivez vos demandes et vos rendez-vous."
                actions={
                    <Link href="/reserver" className="btn">
                        <IconPlus className="h-4 w-4" /> Réserver
                    </Link>
                }
            />
            <ErrorBox message={error} />
            {!rows && !error && <Loading />}
            {rows?.length === 0 && (
                <Empty title="Aucun rendez-vous pour l’instant" action={<Link href="/reserver" className="btn">Réserver ma première coupe</Link>}>
                    Choisissez une prestation et un créneau : le barbier vient chez vous.
                </Empty>
            )}
            {upcoming.length > 0 && (
                <section className="mb-8">
                    <h2 className="mb-3 font-display text-lg font-semibold">À venir</h2>
                    <div className="grid gap-3">{upcoming.map(b => <BookingRow key={b.id} b={b} />)}</div>
                </section>
            )}
            {others.length > 0 && (
                <section>
                    <h2 className="mb-3 font-display text-lg font-semibold">Historique</h2>
                    <div className="grid gap-3">{others.map(b => <BookingRow key={b.id} b={b} />)}</div>
                </section>
            )}
        </>
    );
}
