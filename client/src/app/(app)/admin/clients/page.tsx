"use client";

import { useCallback, useEffect, useState } from "react";
import { IconPin, IconSearch } from "@/components/kx/icons";
import { ContactButtons, Empty, ErrorBox, Loading, PageHeader, Pager } from "@/components/kx/ui";
import { barberAdminApi, type Client } from "@/lib/api/barber";
import { errorMessage, type Page } from "@/lib/api/client";
import { formatDateTime, formatPhone } from "@/lib/barber/format";
import { useDebounce } from "@/lib/hooks/use-debounce";

function initials(name?: string | null) {
    return (name || "?").trim().slice(0, 2).toUpperCase();
}

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

    return (
        <>
            <PageHeader title="Clients" sub="Les clients ayant déjà réservé, avec leur dernière adresse." />
            <div className="relative mb-5 sm:max-w-sm">
                <IconSearch className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-kx-muted" />
                <input type="search" className="input pl-10" value={q} onChange={e => setQ(e.target.value)} placeholder="Pseudo ou numéro…" />
            </div>
            <ErrorBox message={error} onRetry={load} />
            {loading && !data && <Loading />}
            {data && data.items.length === 0 && <Empty title="Aucun client">Les clients apparaissent ici après leur première réservation.</Empty>}

            {/* Desktop table */}
            {data && data.items.length > 0 && (
                <div className="card hidden overflow-hidden p-0 md:block sm:p-0">
                    <table className="kx-table">
                        <thead>
                            <tr>
                                <th>Client</th>
                                <th>Dernière adresse</th>
                                <th>Réservations</th>
                                <th>Dernier rendez-vous</th>
                                <th className="text-right">Contact</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.items.map(c => (
                                <tr key={c.id}>
                                    <td>
                                        <div className="flex items-center gap-3">
                                            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-kx-panel2 text-xs font-semibold">{initials(c.pseudo)}</span>
                                            <div>
                                                <p className="font-medium">{c.pseudo || "Sans pseudo"}</p>
                                                <p className="text-xs text-kx-muted">{formatPhone(c.phone)}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="max-w-64">
                                        {c.last_commune ? (
                                            <>
                                                <p className="font-medium">{c.last_commune}, {c.last_quartier}</p>
                                                <p className="truncate text-xs text-kx-muted">{c.last_address}</p>
                                            </>
                                        ) : "—"}
                                    </td>
                                    <td>
                                        <b>{c.bookings_total}</b> <span className="text-kx-muted">· {c.bookings_completed} terminée(s)</span>
                                    </td>
                                    <td className="text-kx-muted">{formatDateTime(c.last_booking_at)}</td>
                                    <td>
                                        <ContactButtons small className="justify-end" whatsappUrl={c.whatsapp_url} callUrl={c.call_url} />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Mobile cards */}
            <div className="grid gap-3 md:hidden">
                {data?.items.map(c => (
                    <div key={c.id} className="rounded-2xl border border-kx-border bg-white p-4 shadow-card">
                        <div className="flex items-center gap-3">
                            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-kx-panel2 text-sm font-semibold">{initials(c.pseudo)}</span>
                            <div className="min-w-0 flex-1">
                                <p className="font-display font-semibold">{c.pseudo || "Sans pseudo"}</p>
                                <p className="text-sm text-kx-muted">{formatPhone(c.phone)}</p>
                            </div>
                            <p className="text-right text-xs text-kx-muted">
                                <b className="block text-base text-kx-text">{c.bookings_total}</b>résa.
                            </p>
                        </div>
                        {c.last_commune && (
                            <p className="mt-3 flex gap-2 rounded-xl bg-kx-bg px-3 py-2 text-sm">
                                <IconPin className="mt-0.5 h-4 w-4 shrink-0 text-kx-muted" />
                                <span className="min-w-0 break-words">
                                    {c.last_commune}, {c.last_quartier} — {c.last_address}
                                </span>
                            </p>
                        )}
                        <p className="mt-2 text-xs text-kx-muted">Dernier rendez-vous : {formatDateTime(c.last_booking_at)}</p>
                        <ContactButtons small className="mt-3" whatsappUrl={c.whatsapp_url} callUrl={c.call_url} />
                    </div>
                ))}
            </div>
            {data && <Pager page={page} totalPages={Math.max(1, data.total_pages)} onPage={setPage} />}
        </>
    );
}
