"use client";

import { useCallback, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { errorMessage, type Page } from "@/lib/api/client";

export type Column<T> = { header: string; cell: (row: T) => ReactNode; className?: string };

/** Fetches a paginated endpoint. */
export function usePaged<T>(fetcher: (params: { page: number; size: number }) => Promise<Page<T>>, size = 10) {
    const [page, setPage] = useState(1);
    const [data, setData] = useState<Page<T> | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            setData(await fetcher({ page, size }));
        } catch (err) {
            setError(errorMessage(err));
        } finally {
            setLoading(false);
        }
    }, [fetcher, page, size]);

    useEffect(() => {
        void load();
    }, [load]);

    return { page, setPage, data, loading, error, reload: load };
}

/** Kortex table (horizontal scroll on phones) with pagination. */
export function DataTable<T extends { id: number }>({
    columns,
    paged,
    empty = "Rien à afficher.",
}: {
    columns: Column<T>[];
    paged: ReturnType<typeof usePaged<T>>;
    empty?: string;
}) {
    const { data, loading, error, page, setPage } = paged;
    const rows = data?.items ?? [];
    const totalPages = Math.max(1, data?.total_pages ?? 1);
    const message = error ? <span className="text-red-700">{error}</span> : loading && !data ? "Chargement…" : rows.length === 0 ? empty : null;

    return (
        <div className="overflow-hidden rounded-2xl border border-kx-border bg-white shadow-card">
            <div className="overflow-x-auto">
                <table className="kx-table">
                    <thead>
                        <tr>
                            {columns.map(c => (
                                <th key={c.header} className={c.className}>
                                    {c.header}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {message ? (
                            <tr>
                                <td colSpan={columns.length} className="py-10 text-center text-kx-muted">
                                    {message}
                                </td>
                            </tr>
                        ) : (
                            rows.map(row => (
                                <tr key={row.id}>
                                    {columns.map(c => (
                                        <td key={c.header} className={c.className}>
                                            {c.cell(row)}
                                        </td>
                                    ))}
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-kx-border px-4 py-3 text-sm text-kx-muted">
                <span>
                    Page {page} / {totalPages} · {data?.total ?? 0} au total
                </span>
                <div className="flex gap-2">
                    <button type="button" className="btn-ghost btn-sm" disabled={page <= 1 || loading} onClick={() => setPage(page - 1)}>
                        Précédent
                    </button>
                    <button type="button" className="btn-ghost btn-sm" disabled={page >= totalPages || loading} onClick={() => setPage(page + 1)}>
                        Suivant
                    </button>
                </div>
            </div>
        </div>
    );
}

export function Pill({ children, tone = "gray" }: { children: ReactNode; tone?: "gray" | "ok" | "bad" | "dark" }) {
    const cls = {
        gray: "bg-kx-panel2 text-kx-muted ring-kx-border",
        ok: "bg-kx-teal-soft text-teal-900 ring-teal-200",
        bad: "bg-red-50 text-red-700 ring-red-200",
        dark: "bg-black text-white ring-black",
    }[tone];
    return <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap ring-1 ring-inset ${cls}`}>{children}</span>;
}

export function formatDate(value?: string | null): string {
    if (!value) return "—";
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? value : d.toLocaleString("fr-FR", { timeZone: "Africa/Abidjan" });
}
