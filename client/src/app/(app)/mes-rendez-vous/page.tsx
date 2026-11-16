"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ChevronRight } from "@untitled-ui/icons-react";
import { Empty, Spinner, StatusBadge } from "@/components/barber/ui";
import { PageHeader } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { barberApi, type Booking } from "@/lib/api/barber";
import { errorMessage } from "@/lib/api/client";
import { formatDateTime, formatPrice } from "@/lib/barber/format";

export default function MyBookingsPage() {
    const [rows, setRows] = useState<Booking[] | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        barberApi.myBookings().then(setRows).catch(e => setError(errorMessage(e)));
    }, []);

    return (
        <>
            <PageHeader
                title="Mes rendez-vous"
                description="Suivez vos demandes et vos rendez-vous."
                action={
                    <Button asChild size="md">
                        <Link href="/reserver">Nouvelle réservation</Link>
                    </Button>
                }
            />
            {error && <p className="text-sm text-error-primary">{error}</p>}
            {!rows && !error && <Spinner />}
            {rows?.length === 0 && (
                <Empty>
                    Aucun rendez-vous pour l&apos;instant.{" "}
                    <Link href="/reserver" className="font-semibold text-brand-secondary">
                        Réserver
                    </Link>
                </Empty>
            )}
            <ul className="space-y-3">
                {rows?.map(b => (
                    <li key={b.id}>
                        <Link
                            href={`/mes-rendez-vous/${b.reference}`}
                            className="flex items-center gap-3 rounded-xl border border-secondary bg-primary p-4 shadow-xs hover:border-brand"
                        >
                            <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                    <span className="font-semibold text-primary">{b.service_name}</span>
                                    <StatusBadge status={b.status} />
                                </div>
                                <p className="mt-1 text-sm text-secondary">{formatDateTime(b.start_at)}</p>
                                <p className="text-sm text-tertiary">
                                    {b.commune}, {b.quartier} · {formatPrice(b.price)} · {b.reference}
                                </p>
                            </div>
                            <ChevronRight className="size-5 shrink-0 text-fg-quaternary" />
                        </Link>
                    </li>
                ))}
            </ul>
        </>
    );
}
