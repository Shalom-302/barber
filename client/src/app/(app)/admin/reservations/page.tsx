"use client";

import { useCallback, useEffect, useState } from "react";
import { AdminBookingCard } from "@/components/barber/admin-booking-card";
import { Empty, NativeInput, SelectField, Spinner } from "@/components/barber/ui";
import { PageHeader } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import type { Page } from "@/lib/api/client";
import { errorMessage } from "@/lib/api/client";
import { barberAdminApi, type AdminBooking } from "@/lib/api/barber";
import { STATUS_LABEL, type BookingStatus } from "@/lib/barber/format";
import { useDebounce } from "@/lib/hooks/use-debounce";

const STATUSES = Object.keys(STATUS_LABEL) as BookingStatus[];

export default function AdminBookingsPage() {
    const [status, setStatus] = useState<string>("PENDING");
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
            setData(
                await barberAdminApi.bookings({
                    status: status || undefined,
                    date: day || undefined,
                    q: query || undefined,
                    page,
                    size: 20,
                })
            );
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
        setData(d =>
            d ? { ...d, items: d.items.map(b => (b.id === updated.id ? updated : b)) } : d
        );
    }

    const totalPages = Math.max(1, data?.total_pages ?? 1);

    return (
        <>
            <PageHeader title="Réservations" description="Toutes les demandes et rendez-vous." />
            <div className="mb-4 grid gap-2 sm:grid-cols-3">
                <SelectField value={status} onChange={e => setStatus(e.target.value)} aria-label="Statut">
                    <option value="">Tous les statuts</option>
                    {STATUSES.map(s => (
                        <option key={s} value={s}>
                            {STATUS_LABEL[s]}
                        </option>
                    ))}
                </SelectField>
                <NativeInput type="date" value={day} onChange={e => setDay(e.target.value)} aria-label="Date" />
                <NativeInput
                    type="search"
                    value={q}
                    onChange={e => setQ(e.target.value)}
                    placeholder="Pseudo, numéro, quartier, référence…"
                />
            </div>
            {error && <p className="text-sm text-error-primary">{error}</p>}
            {loading && !data && <Spinner />}
            {data && data.items.length === 0 && <Empty>Aucune réservation pour ces filtres.</Empty>}
            <div className="grid gap-3 lg:grid-cols-2">
                {data?.items.map(b => <AdminBookingCard key={b.id} booking={b} onChanged={changed} />)}
            </div>
            {data && data.total > 0 && (
                <div className="mt-6 flex items-center justify-between text-sm text-tertiary">
                    <span>
                        Page {page} / {totalPages} · {data.total} au total
                    </span>
                    <div className="flex gap-2">
                        <Button variant="secondary" size="sm" isDisabled={page <= 1 || loading} onClick={() => setPage(page - 1)}>
                            Précédent
                        </Button>
                        <Button
                            variant="secondary"
                            size="sm"
                            isDisabled={page >= totalPages || loading}
                            onClick={() => setPage(page + 1)}
                        >
                            Suivant
                        </Button>
                    </div>
                </div>
            )}
        </>
    );
}
