"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { AlertTriangle } from "@untitled-ui/icons-react";
import { AdminBookingCard } from "@/components/barber/admin-booking-card";
import { Card, Empty, SectionTitle, Spinner } from "@/components/barber/ui";
import { PageHeader } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { barberAdminApi, type Overview } from "@/lib/api/barber";
import { errorMessage } from "@/lib/api/client";
import { STATUS_LABEL, type BookingStatus } from "@/lib/barber/format";

const COUNTERS: BookingStatus[] = ["PENDING", "CONFIRMED", "COMPLETED", "CANCELLED", "REJECTED"];

export default function AdminOverviewPage() {
    const [data, setData] = useState<Overview | null>(null);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(() => {
        barberAdminApi.overview().then(setData).catch(e => setError(errorMessage(e)));
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    const changed = () => load();

    return (
        <>
            <PageHeader
                title="Tableau de bord"
                description="Vos rendez-vous du jour et les demandes à traiter."
                action={
                    <Button asChild size="md" variant="secondary">
                        <Link href="/admin/reservations">Toutes les réservations</Link>
                    </Button>
                }
            />
            {error && <p className="text-sm text-error-primary">{error}</p>}
            {!data && !error && <Spinner />}
            {data && (
                <div className="space-y-8">
                    {data.failed_notifications > 0 && (
                        <Link
                            href="/admin/notifications?status=failed"
                            className="flex items-center gap-3 rounded-xl bg-error-primary p-4 text-sm font-medium text-error-primary"
                        >
                            <AlertTriangle className="size-5 shrink-0" />
                            {data.failed_notifications} notification(s) WhatsApp n&apos;ont pas pu être envoyées.
                            Voir et renvoyer →
                        </Link>
                    )}

                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
                        {COUNTERS.map(s => (
                            <Card key={s} className="p-4!">
                                <p className="text-xs font-medium text-tertiary">{STATUS_LABEL[s]}</p>
                                <p className="mt-1 text-display-xs font-semibold text-primary">{data.counts[s] ?? 0}</p>
                            </Card>
                        ))}
                    </div>

                    <section>
                        <SectionTitle>Demandes en attente ({data.pending.length})</SectionTitle>
                        {data.pending.length === 0 ? (
                            <Empty>Aucune demande en attente.</Empty>
                        ) : (
                            <div className="grid gap-3 lg:grid-cols-2">
                                {data.pending.map(b => (
                                    <AdminBookingCard key={b.id} booking={b} onChanged={changed} compact />
                                ))}
                            </div>
                        )}
                    </section>

                    <section>
                        <SectionTitle>Aujourd&apos;hui ({data.today.length})</SectionTitle>
                        {data.today.length === 0 ? (
                            <Empty>Aucun rendez-vous confirmé aujourd&apos;hui.</Empty>
                        ) : (
                            <div className="grid gap-3 lg:grid-cols-2">
                                {data.today.map(b => (
                                    <AdminBookingCard key={b.id} booking={b} onChanged={changed} compact />
                                ))}
                            </div>
                        )}
                    </section>
                </div>
            )}
        </>
    );
}
