"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Empty, ErrorBox, Loading, PageHeader, Pager, Tabs } from "@/components/kx/ui";
import { barberAdminApi, type Notification } from "@/lib/api/barber";
import { errorMessage, type Page } from "@/lib/api/client";
import { formatDateTime, formatPhone } from "@/lib/barber/format";
import { cn } from "@/lib/utils/cn";

type Filter = "" | Notification["status"];
const STATUS: Record<Notification["status"], { label: string; cls: string }> = {
    pending: { label: "En file", cls: "bg-amber-50 text-amber-800 ring-amber-200" },
    sent: { label: "Envoyée", cls: "bg-kx-teal-soft text-teal-900 ring-teal-200" },
    failed: { label: "Échec", cls: "bg-red-50 text-red-700 ring-red-200" },
};

function NotificationsList() {
    const params = useSearchParams();
    const [status, setStatus] = useState<Filter>((params.get("status") as Filter) ?? "");
    const [page, setPage] = useState(1);
    const [data, setData] = useState<Page<Notification> | null>(null);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(() => {
        barberAdminApi.notifications({ status: status || undefined, page, size: 20 }).then(setData).catch(e => setError(errorMessage(e)));
    }, [status, page]);
    useEffect(() => load(), [load]);
    useEffect(() => setPage(1), [status]);

    async function retry(n: Notification) {
        try {
            await barberAdminApi.retryNotification(n.id);
            toast.success("Notification remise en file d’envoi");
            load();
        } catch (e) {
            toast.error(errorMessage(e));
        }
    }

    return (
        <>
            <div className="mb-5">
                <Tabs
                    value={status}
                    onChange={setStatus}
                    items={[
                        { value: "", label: "Toutes" },
                        { value: "failed", label: "Échecs" },
                        { value: "pending", label: "En file" },
                        { value: "sent", label: "Envoyées" },
                    ]}
                />
            </div>
            <ErrorBox message={error} onRetry={load} />
            {!data && !error && <Loading />}
            {data?.items.length === 0 && <Empty title="Aucune notification" />}
            <div className="space-y-3">
                {data?.items.map(n => (
                    <div key={n.id} className={cn("rounded-2xl border bg-white p-4 shadow-card sm:p-5", n.status === "failed" ? "border-red-200" : "border-kx-border")}>
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex flex-wrap items-center gap-2 text-sm">
                                <span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset", STATUS[n.status].cls)}>{STATUS[n.status].label}</span>
                                <span className="font-medium">
                                    {n.recipient === "barber" ? "Vous" : "Client"} · {formatPhone(n.phone)}
                                </span>
                                <span className="rounded-md bg-kx-panel2 px-2 py-0.5 font-mono text-xs text-kx-muted">{n.kind}</span>
                            </div>
                            <span className="text-xs text-kx-muted">{formatDateTime(n.created_time)}</span>
                        </div>
                        <p className="mt-3 rounded-xl bg-[#e7fbe9] px-4 py-3 text-sm whitespace-pre-line">{n.message}</p>
                        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-kx-muted">
                            <span>
                                {n.attempts} tentative(s)
                                {n.sent_at && ` · envoyée ${formatDateTime(n.sent_at).toLowerCase()}`}
                                {n.status === "pending" && n.next_attempt_at && ` · prochain essai ${formatDateTime(n.next_attempt_at).toLowerCase()}`}
                            </span>
                            {n.last_error && <span className="text-red-700">{n.last_error}</span>}
                        </div>
                        {n.status === "failed" && (
                            <button type="button" className="btn btn-sm mt-3" onClick={() => retry(n)}>
                                Renvoyer
                            </button>
                        )}
                    </div>
                ))}
            </div>
            {data && <Pager page={page} totalPages={Math.max(1, data.total_pages)} onPage={setPage} />}
        </>
    );
}

export default function NotificationsPage() {
    return (
        <>
            <PageHeader
                title="Notifications WhatsApp"
                sub="Messages automatiques envoyés par le numéro système (hors codes de connexion). Les échecs sont réessayés automatiquement, puis peuvent être renvoyés ici."
            />
            <Suspense fallback={<Loading />}>
                <NotificationsList />
            </Suspense>
        </>
    );
}
