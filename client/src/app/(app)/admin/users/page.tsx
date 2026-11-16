"use client";

import { useCallback, useState } from "react";
import { DataTable, formatDate, Pill, usePaged, type Column } from "@/components/admin/data-table";
import { IconSearch } from "@/components/kx/icons";
import { PageHeader } from "@/components/kx/ui";
import { adminApi, displayName, type User } from "@/lib/api/services";

const columns: Column<User>[] = [
    { header: "Nom", cell: u => <span className="font-medium">{displayName(u)}</span> },
    { header: "WhatsApp", cell: u => (u.phone ? `+${u.phone}` : "—") },
    { header: "Email", cell: u => u.email || "—" },
    {
        header: "Rôles",
        cell: u => (
            <div className="flex flex-wrap gap-1">
                {(u.roles ?? []).map(r => (
                    <Pill key={r.name} tone={r.name === "admin" ? "dark" : "gray"}>
                        {r.name}
                    </Pill>
                ))}
            </div>
        ),
    },
    { header: "Statut", cell: u => <Pill tone={u.status === false ? "bad" : "ok"}>{u.status === false ? "Désactivé" : "Actif"}</Pill> },
    { header: "Inscription", cell: u => <span className="whitespace-nowrap text-kx-muted">{formatDate(u.join_time)}</span> },
];

export default function AdminUsersPage() {
    const [query, setQuery] = useState("");
    const fetcher = useCallback((p: { page: number; size: number }) => adminApi.users({ ...p, query: query || undefined }), [query]);
    const paged = usePaged(fetcher);

    return (
        <>
            <PageHeader
                title="Utilisateurs"
                sub="Tous les comptes (clients et barbier)."
                actions={
                    <div className="relative w-full sm:w-72">
                        <IconSearch className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-kx-muted" />
                        <input
                            className="input pl-10"
                            placeholder="Rechercher…"
                            value={query}
                            onChange={e => {
                                setQuery(e.target.value);
                                paged.setPage(1);
                            }}
                        />
                    </div>
                }
            />
            <DataTable columns={columns} paged={paged} empty="Aucun utilisateur." />
        </>
    );
}
