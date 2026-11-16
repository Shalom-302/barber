"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { CalendarCheck01, CheckCircle, MessageChatCircle, Scissors01 } from "@untitled-ui/icons-react";
import { Card, ContactButtons, Spinner } from "@/components/barber/ui";
import { PublicShell } from "@/components/barber/public-shell";
import { Button } from "@/components/ui/button";
import { barberApi, type PublicProfile, type Service } from "@/lib/api/barber";
import { errorMessage } from "@/lib/api/client";
import { formatDuration, formatPrice } from "@/lib/barber/format";

const steps = [
    {
        icon: Scissors01,
        title: "Vous choisissez",
        text: "La prestation, le jour, l'heure et l'adresse où le barbier vient vous coiffer.",
    },
    {
        icon: CheckCircle,
        title: "Le barbier confirme",
        text: "Votre demande est en attente jusqu'à la confirmation du barbier.",
    },
    {
        icon: MessageChatCircle,
        title: "Vous êtes prévenu",
        text: "Confirmation, refus ou annulation : vous recevez une notification WhatsApp.",
    },
];

export default function Home() {
    const [services, setServices] = useState<Service[] | null>(null);
    const [profile, setProfile] = useState<PublicProfile | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        barberApi.services().then(setServices).catch(e => setError(errorMessage(e)));
        barberApi.profile().then(setProfile).catch(() => setProfile(null));
    }, []);

    const name = profile?.display_name ?? "votre barbier";

    return (
        <PublicShell>
            <motion.section
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="rounded-2xl bg-brand-solid px-6 py-10 text-white sm:px-10 sm:py-14"
            >
                <p className="text-sm font-semibold uppercase tracking-wide opacity-80">Coiffure à domicile · Abidjan</p>
                <h1 className="mt-3 max-w-2xl text-display-sm font-semibold sm:text-display-md">
                    Réservez {name} en quelques secondes.
                </h1>
                <p className="mt-4 max-w-xl text-lg opacity-90">
                    Choisissez votre créneau, indiquez votre quartier : le barbier vient chez vous. Connexion
                    simple avec votre numéro WhatsApp.
                </p>
                <div className="mt-8 flex flex-wrap gap-3">
                    <Button asChild size="xl" variant="secondary">
                        <Link href="/reserver">Réserver maintenant</Link>
                    </Button>
                </div>
            </motion.section>

            <section className="mt-10">
                <h2 className="text-display-xs font-semibold text-primary">Prestations</h2>
                {error && <p className="mt-4 text-sm text-error-primary">{error}</p>}
                {!services && !error && <Spinner />}
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    {services?.map((s, i) => (
                        <motion.div
                            key={s.id}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.05 * i }}
                        >
                            <Card className="flex h-full flex-col">
                                <div className="flex items-start justify-between gap-3">
                                    <h3 className="text-lg font-semibold text-primary">{s.name}</h3>
                                    <span className="shrink-0 text-lg font-bold text-brand-secondary">
                                        {formatPrice(s.price)}
                                    </span>
                                </div>
                                {s.description && <p className="mt-2 text-sm text-tertiary">{s.description}</p>}
                                <p className="mt-2 text-sm text-quaternary">Durée : {formatDuration(s.duration_minutes)}</p>
                                <div className="mt-auto pt-4">
                                    <Button asChild size="md" className="w-full">
                                        <Link href={`/reserver?service=${s.id}`}>Réserver cette prestation</Link>
                                    </Button>
                                </div>
                            </Card>
                        </motion.div>
                    ))}
                </div>
            </section>

            <section className="mt-12">
                <h2 className="text-display-xs font-semibold text-primary">Comment ça marche</h2>
                <ol className="mt-4 grid gap-4 sm:grid-cols-3">
                    {steps.map((s, i) => (
                        <li key={s.title}>
                            <Card className="h-full">
                                <div className="flex items-center gap-3">
                                    <span className="flex size-10 items-center justify-center rounded-full bg-brand-primary text-brand-secondary">
                                        <s.icon className="size-5" />
                                    </span>
                                    <span className="text-sm font-semibold text-quaternary">Étape {i + 1}</span>
                                </div>
                                <h3 className="mt-3 font-semibold text-primary">{s.title}</h3>
                                <p className="mt-1 text-sm text-tertiary">{s.text}</p>
                            </Card>
                        </li>
                    ))}
                </ol>
            </section>

            {profile && (profile.whatsapp_url || profile.call_url) && (
                <section className="mt-12">
                    <Card>
                        <div className="flex items-start gap-3">
                            <CalendarCheck01 className="mt-1 size-6 shrink-0 text-fg-brand-primary" />
                            <div>
                                <h2 className="text-lg font-semibold text-primary">Contacter le barbier</h2>
                                <p className="mt-1 text-sm text-tertiary">
                                    Une question avant de réserver ? Écrivez ou appelez directement {profile.display_name}.
                                </p>
                                <div className="mt-4">
                                    <ContactButtons whatsappUrl={profile.whatsapp_url} callUrl={profile.call_url} />
                                </div>
                            </div>
                        </div>
                    </Card>
                </section>
            )}
        </PublicShell>
    );
}
