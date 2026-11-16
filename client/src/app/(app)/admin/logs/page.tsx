"use client";

import { useCallback } from "react";
import { DataTable, formatDate, usePaged, type Column } from "@/components/admin/data-table";
import { PageHeader } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Tabs } from "@/components/ui/tabs";
import { adminApi, type LoginLog, type OperaLog } from "@/lib/api/services";

const loginColumns: Column<LoginLog>[] = [
    { header: "Identifiant", cell: l => <span className="font-medium text-primary">{l.email}</span> },
    {
        header: "Résultat",
        cell: l => (
            <Badge size="sm" color={l.status ? "success" : "error"}>
                {l.status ? "Réussie" : "Échec"}
            </Badge>
        ),
    },
    { header: "Message", cell: l => l.msg },
    { header: "IP", cell: l => l.ip },
    { header: "Navigateur", cell: l => [l.browser, l.os].filter(Boolean).join(" · ") || "—" },
    { header: "Date", cell: l => formatDate(l.login_time) },
];

const operaColumns: Column<OperaLog>[] = [
    { header: "Utilisateur", cell: o => o.user_email || "—" },
    {
        header: "Requête",
        cell: o => (
            <span className="font-mono text-xs">
                {o.method} {o.path}
            </span>
        ),
    },
    {
        header: "Code",
        cell: o => (
            <Badge size="sm" color={o.status ? "success" : "error"}>
                {o.code}
            </Badge>
        ),
    },
    { header: "Durée", cell: o => `${Math.round(o.cost_time)} ms` },
    { header: "IP", cell: o => o.ip },
    { header: "Date", cell: o => formatDate(o.opera_time) },
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
    return (
        <>
            <PageHeader title="Journaux" description="Connexions et opérations sur l'API." />
            <Tabs
                defaultValue="login"
                type="button-border"
                items={[
                    { value: "login", label: "Connexions", content: <LoginLogs /> },
                    { value: "opera", label: "Opérations", content: <OperaLogs /> },
                ]}
                contentClassName="mt-6"
            />
        </>
    );
}
