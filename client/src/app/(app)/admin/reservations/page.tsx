"use client";

import { useCallback, useEffect, useState } from "react";
import { AdminBookingCard } from "@/components/kx/admin-booking-card";
import { IconSearch } from "@/components/kx/icons";
import { Empty, ErrorBox, Loading, PageHeader, Pager, Tabs } from "@/components/kx/ui";
import { barberAdminApi, type AdminBooking } from "@/lib/api/barber";
import { errorMessage, type Page } from "@/lib/api/client";
import { STATUS_LABEL, type BookingStatus } from "@/lib/barber/format";
import { useDebounce } from "@/lib/hooks/use-debounce";

type Filter = "" | BookingStatus;
const FILTERS: { value: Filter; label: string }[] = [
    { value: "PENDING", label: STATUS_LABEL.PENDING },
    { value: "CONFIRMED", label: STATUS_LABEL.CONFIRMED },
    { value: "COMPLETED", label: STATUS_LABEL.COMPLETED },
    { value: "CANCELLED", label: STATUS_LABEL.CANCELLED },
    { value: "REJECTED", label: STATUS_LABEL.REJECTED },
    { value: "", label: "Toutes" },
];

export default function AdminBookingsPage() {
    const [status, setStatus] = useState<Filter>("PENDING");
    const [day, setDay] = useState("");
    const [q, setQ] = useState("");
    const query = useDebounce(q, 300);
    const [page, setPage] = useState(1);
    const [data, setData] = useState<Page<AdminBooking> | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            setData(await barberAdminApi.bookings({ status: status || undefined, date: day || undefined, q: query || undefined, page, size: 20 }));
        } catch (e) {
            setError(errorMessage(e));
        } finally {
            setLoading(false);
        }
    }, [status, day, query, page]);

    useEffect(() => {
        void load();
    }, [load]);
    useEffect(() => setPage(1), [status, day, query]);

    function changed(updated: AdminBooking) {
        setData(d => (d ? { ...d, items: d.items.map(b => (b.id === updated.id ? updated : b)) } : d));
    }

    return (
        <>
            <PageHeader title="Réservations" sub="Toutes les demandes et rendez-vous." />
            <div className="mb-5 space-y-3">
                <Tabs value={status} onChange={setStatus} items={FILTERS} />
                <div className="grid gap-2 sm:grid-cols-[200px_1fr]">
                    <input type="date" className="input" value={day} onChange={e => setDay(e.target.value)} aria-label="Date" />
                    <div className="relative">
                        <IconSearch className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-kx-muted" />
                        <input type="search" className="input pl-10" value={q} onChange={e => setQ(e.target.value)} placeholder="Pseudo, numéro, quartier, référence…" />
                    </div>
                </div>
            </div>
            <ErrorBox message={error} onRetry={load} />
            {loading && !data && <Loading />}
            {data && data.items.length === 0 && <Empty title="Aucune réservation">Aucun résultat pour ces filtres.</Empty>}
            <div className={`grid gap-3 lg:grid-cols-2 ${loading ? "opacity-60" : ""}`}>
                {data?.items.map(b => <AdminBookingCard key={b.id} booking={b} onChanged={changed} />)}
            </div>
            {data && data.total > 0 && (
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="mt-4 text-sm text-kx-muted">{data.total} au total</p>
                    <Pager page={page} totalPages={Math.max(1, data.total_pages)} onPage={setPage} />
                </div>
            )}
        </>
    );
}
