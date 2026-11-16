"use client";

import { useCallback, useEffect, useState } from "react";
import { ContactButtons, Empty, NativeInput, Spinner } from "@/components/barber/ui";
import { PageHeader } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { errorMessage, type Page } from "@/lib/api/client";
import { barberAdminApi, type Client } from "@/lib/api/barber";
import { formatDateTime, formatPhone } from "@/lib/barber/format";
import { useDebounce } from "@/lib/hooks/use-debounce";

export default function AdminClientsPage() {
    const [q, setQ] = useState("");
    const query = useDebounce(q, 300);
    const [page, setPage] = useState(1);
    const [data, setData] = useState<Page<Client> | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            setData(await barberAdminApi.clients({ q: query || undefined, page, size: 20 }));
            setError(null);
        } catch (e) {
            setError(errorMessage(e));
        } finally {
            setLoading(false);
        }
    }, [query, page]);

    useEffect(() => {
        void load();
    }, [load]);
    useEffect(() => setPage(1), [query]);

    const totalPages = Math.max(1, data?.total_pages ?? 1);

    return (
        <>
            <PageHeader title="Clients" description="Les clients ayant déjà réservé." />
            <NativeInput
                type="search"
                className="mb-4 sm:max-w-sm"
                value={q}
                onChange={e => setQ(e.target.value)}
                placeholder="Pseudo ou numéro…"
            />
            {error && <p className="text-sm text-error-primary">{error}</p>}
            {loading && !data && <Spinner />}
            {data && data.items.length === 0 && <Empty>Aucun client.</Empty>}
            <div className="grid gap-3 md:grid-cols-2">
                {data?.items.map(c => (
                    <div key={c.id} className="rounded-xl border border-secondary bg-primary p-4 shadow-xs">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                            <div>
                                <p className="font-semibold text-primary">{c.pseudo || "Sans pseudo"}</p>
                                <p className="text-sm text-tertiary">{formatPhone(c.phone)}</p>
                            </div>
                            <p className="text-right text-xs text-tertiary">
                                {c.bookings_total} réservation(s)
                                <br />
                                {c.bookings_completed} terminée(s)
                            </p>
                        </div>
                        {c.last_commune && (
                            <p className="mt-2 text-sm text-secondary">
                                {c.last_commune}, {c.last_quartier} — {c.last_address}
                            </p>
                        )}
                        <p className="mt-1 text-xs text-quaternary">Dernier rendez-vous : {formatDateTime(c.last_booking_at)}</p>
                        <div className="mt-3">
                            <ContactButtons size="sm" whatsappUrl={c.whatsapp_url} callUrl={c.call_url} />
                        </div>
                    </div>
                ))}
            </div>
            {data && data.total > 0 && (
                <div className="mt-6 flex items-center justify-between text-sm text-tertiary">
                    <span>
                        Page {page} / {totalPages} · {data.total} au total
                    </span>
                    <div className="flex gap-2">
                        <Button variant="secondary" size="sm" isDisabled={page <= 1} onClick={() => setPage(page - 1)}>
                            Précédent
                        </Button>
                        <Button variant="secondary" size="sm" isDisabled={page >= totalPages} onClick={() => setPage(page + 1)}>
                            Suivant
                        </Button>
                    </div>
                </div>
            )}
        </>
    );
}
