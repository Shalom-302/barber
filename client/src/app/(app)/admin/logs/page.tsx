"use client";

import { useCallback, useState } from "react";
import { DataTable, formatDate, Pill, usePaged, type Column } from "@/components/admin/data-table";
import { PageHeader, Tabs } from "@/components/kx/ui";
import { adminApi, type LoginLog, type OperaLog } from "@/lib/api/services";

const loginColumns: Column<LoginLog>[] = [
    { header: "Identifiant", cell: l => <span className="font-medium">{l.email}</span> },
    { header: "Résultat", cell: l => <Pill tone={l.status ? "ok" : "bad"}>{l.status ? "Réussie" : "Échec"}</Pill> },
    { header: "Message", cell: l => l.msg },
    { header: "IP", cell: l => <span className="font-mono text-xs">{l.ip}</span> },
    { header: "Navigateur", cell: l => [l.browser, l.os].filter(Boolean).join(" · ") || "—" },
    { header: "Date", cell: l => <span className="whitespace-nowrap text-kx-muted">{formatDate(l.login_time)}</span> },
];

const operaColumns: Column<OperaLog>[] = [
    { header: "Utilisateur", cell: o => o.user_email || "—" },
    {
        header: "Requête",
        cell: o => (
            <span className="font-mono text-xs whitespace-nowrap">
                {o.method} {o.path}
            </span>
        ),
    },
    { header: "Code", cell: o => <Pill tone={o.status ? "ok" : "bad"}>{o.code}</Pill> },
    { header: "Durée", cell: o => `${Math.round(o.cost_time)} ms` },
    { header: "IP", cell: o => <span className="font-mono text-xs">{o.ip}</span> },
    { header: "Date", cell: o => <span className="whitespace-nowrap text-kx-muted">{formatDate(o.opera_time)}</span> },
];

function LoginLogs() {
    const fetcher = useCallback((p: { page: number; size: number }) => adminApi.loginLogs(p), []);
    return <DataTable columns={loginColumns} paged={usePaged(fetcher)} empty="Aucune connexion." />;
}

function OperaLogs() {
    const fetcher = useCallback((p: { page: number; size: number }) => adminApi.operaLogs(p), []);
    return <DataTable columns={operaColumns} paged={usePaged(fetcher)} empty="Aucune opération." />;
}

export default function AdminLogsPage() {
    const [tab, setTab] = useState<"login" | "opera">("login");
    return (
        <>
            <PageHeader title="Journaux" sub="Connexions et opérations sur l’API." />
            <div className="mb-5">
                <Tabs
                    value={tab}
                    onChange={setTab}
                    items={[
                        { value: "login", label: "Connexions" },
                        { value: "opera", label: "Opérations" },
                    ]}
                />
            </div>
            {tab === "login" ? <LoginLogs /> : <OperaLogs />}
        </>
    );
}
