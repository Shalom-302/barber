"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Empty, SelectField, Spinner } from "@/components/barber/ui";
import { PageHeader } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { errorMessage, type Page } from "@/lib/api/client";
import { barberAdminApi, type Notification } from "@/lib/api/barber";
import { formatDateTime, formatPhone } from "@/lib/barber/format";

const STATUS: Record<Notification["status"], { label: string; color: "warning" | "success" | "error" }> = {
    pending: { label: "En file", color: "warning" },
    sent: { label: "Envoyée", color: "success" },
    failed: { label: "Échec", color: "error" },
};

function NotificationsList() {
    const params = useSearchParams();
    const [status, setStatus] = useState(params.get("status") ?? "");
    const [page, setPage] = useState(1);
    const [data, setData] = useState<Page<Notification> | null>(null);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(() => {
        barberAdminApi
            .notifications({ status: status || undefined, page, size: 20 })
            .then(setData)
            .catch(e => setError(errorMessage(e)));
    }, [status, page]);
    useEffect(() => load(), [load]);
    useEffect(() => setPage(1), [status]);

    async function retry(n: Notification) {
        try {
            await barberAdminApi.retryNotification(n.id);
            toast.success("Notification remise en file d'envoi");
            load();
        } catch (e) {
            toast.error(errorMessage(e));
        }
    }

    const totalPages = Math.max(1, data?.total_pages ?? 1);

    return (
        <>
            <SelectField className="mb-4 sm:max-w-xs" value={status} onChange={e => setStatus(e.target.value)} aria-label="Statut">
                <option value="">Toutes</option>
                <option value="pending">En file</option>
                <option value="sent">Envoyées</option>
                <option value="failed">Échecs</option>
            </SelectField>
            {error && <p className="text-sm text-error-primary">{error}</p>}
            {!data && !error && <Spinner />}
            {data?.items.length === 0 && <Empty>Aucune notification.</Empty>}
            <div className="space-y-3">
                {data?.items.map(n => (
                    <div key={n.id} className="rounded-xl border border-secondary bg-primary p-4 shadow-xs">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex flex-wrap items-center gap-2 text-sm">
                                <Badge size="sm" color={STATUS[n.status].color}>
                                    {STATUS[n.status].label}
                                </Badge>
                                <span className="font-medium text-primary">
                                    {n.recipient === "barber" ? "Vous" : "Client"} · {formatPhone(n.phone)}
                                </span>
                                <span className="text-tertiary">{n.kind}</span>
                            </div>
                            <span className="text-xs text-tertiary">{formatDateTime(n.created_time)}</span>
                        </div>
                        <p className="mt-2 whitespace-pre-line text-sm text-secondary">{n.message}</p>
                        <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-tertiary">
                            <span>
                                {n.attempts} tentative(s)
                                {n.sent_at && ` · envoyée ${formatDateTime(n.sent_at).toLowerCase()}`}
                                {n.status === "pending" && n.next_attempt_at && ` · prochain essai ${formatDateTime(n.next_attempt_at).toLowerCase()}`}
                            </span>
                            {n.last_error && <span className="text-error-primary">{n.last_error}</span>}
                        </div>
                        {n.status === "failed" && (
                            <Button className="mt-3" size="sm" variant="secondary" onClick={() => retry(n)}>
                                Renvoyer
                            </Button>
                        )}
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

export default function NotificationsPage() {
    return (
        <>
            <PageHeader
                title="Notifications WhatsApp"
                description="Messages automatiques envoyés par le numéro système (OTP exclus). Les échecs sont réessayés automatiquement, puis peuvent être renvoyés ici."
            />
            <Suspense fallback={<Spinner />}>
                <NotificationsList />
            </Suspense>
        </>
    );
}
