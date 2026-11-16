"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { toast } from "sonner";
import { IconArrow, IconCalendar, IconCalendarCheck, IconWhatsapp } from "@/components/kx/icons";
import { ErrorBox, Field, Spinner } from "@/components/kx/ui";
import { errorMessage } from "@/lib/api/client";
import { authApi, displayName } from "@/lib/api/services";
import { useAuth } from "@/lib/auth/auth-context";
import { formatPhone } from "@/lib/barber/format";

function initials(name: string): string {
    const parts = name.replace(/[^\p{L}\p{N} ]/gu, " ").trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return "?";
    return (parts[0][0] + (parts[1]?.[0] ?? "")).toUpperCase();
}

export default function ProfilePage() {
    const { user, refreshUser } = useAuth();
    const [pseudo, setPseudo] = useState("");
    const [firstname, setFirstname] = useState("");
    const [lastname, setLastname] = useState("");
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        setPseudo(user?.pseudo ?? "");
        setFirstname(user?.firstname ?? "");
        setLastname(user?.lastname ?? "");
    }, [user]);

    async function save(e: FormEvent) {
        e.preventDefault();
        setError(null);
        setSaving(true);
        try {
            const data: { firstname: string; lastname: string; pseudo?: string } = { firstname, lastname };
            if (pseudo.trim() && pseudo.trim() !== user?.pseudo) data.pseudo = pseudo.trim();
            await authApi.updateMe(data);
            await refreshUser();
            toast.success("Profil mis à jour");
        } catch (err) {
            setError(errorMessage(err));
        } finally {
            setSaving(false);
        }
    }

    const name = displayName(user);
    const fullName = [user?.firstname, user?.lastname].filter(Boolean).join(" ");

    return (
        <div className="mx-auto max-w-4xl">
            {/* Hero card */}
            <section className="relative overflow-hidden rounded-3xl bg-ink text-cream shadow-card">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/images/landing/salon-gold.webp" alt="" width={2000} height={1333} className="absolute inset-0 h-full w-full object-cover opacity-25" />
                <div className="absolute inset-0 bg-gradient-to-r from-ink via-ink/85 to-ink/40" />
                <div className="relative flex flex-col gap-6 p-6 sm:flex-row sm:items-center sm:p-10">
                    <span className="grid h-20 w-20 shrink-0 place-items-center rounded-full bg-brass font-barber text-3xl text-ink ring-4 ring-brass/25 sm:h-24 sm:w-24 sm:text-4xl">
                        {initials(name)}
                    </span>
                    <div className="min-w-0 flex-1">
                        <p className="text-[11px] font-semibold tracking-[0.3em] text-brass uppercase">Mon profil</p>
                        <h1 className="mt-2 font-barber text-4xl break-words sm:text-5xl">{name}</h1>
                        {fullName && <p className="mt-1 text-cream/70">{fullName}</p>}
                        {user?.phone && (
                            <p className="mt-3 inline-flex items-center gap-2 rounded-full border border-white/15 px-3 py-1.5 text-sm text-cream/80">
                                <IconWhatsapp className="h-4 w-4 text-brass" /> {formatPhone(user.phone)}
                            </p>
                        )}
                    </div>
                    <div className="flex flex-col gap-2 sm:items-end">
                        <Link href="/reserver" className="btn-brass">
                            <IconCalendar className="h-4 w-4" /> Réserver
                        </Link>
                        <Link href="/mes-rendez-vous" className="btn-line-dark">
                            <IconCalendarCheck className="h-4 w-4" /> Mes rendez-vous
                        </Link>
                    </div>
                </div>
            </section>

            {/* Form */}
            <form onSubmit={save} className="mt-6 grid gap-6 lg:grid-cols-[1fr_18rem]">
                <div className="card space-y-5">
                    <div>
                        <h2 className="font-barber text-2xl text-ink">Mes informations</h2>
                        <p className="mt-1 text-sm text-kx-muted">Le barbier voit votre pseudo sur chaque réservation.</p>
                    </div>
                    <Field label="Pseudo" htmlFor="pseudo" hint="3 à 30 caractères, unique.">
                        <input id="pseudo" className="input" value={pseudo} onChange={e => setPseudo(e.target.value)} minLength={3} maxLength={30} />
                    </Field>
                    <div className="grid gap-5 sm:grid-cols-2">
                        <Field label="Prénom" htmlFor="firstname">
                            <input id="firstname" className="input" value={firstname} onChange={e => setFirstname(e.target.value)} maxLength={80} placeholder="Facultatif" />
                        </Field>
                        <Field label="Nom" htmlFor="lastname">
                            <input id="lastname" className="input" value={lastname} onChange={e => setLastname(e.target.value)} maxLength={80} placeholder="Facultatif" />
                        </Field>
                    </div>
                    <ErrorBox message={error} />
                    <button type="submit" className="btn !bg-ink hover:!bg-ink2" disabled={saving}>
                        {saving && <Spinner />} Enregistrer
                    </button>
                </div>

                <aside className="space-y-4">
                    <div className="card">
                        <p className="text-[11px] font-semibold tracking-[0.25em] text-brass-dark uppercase">Connexion</p>
                        <p className="mt-2 font-display font-semibold">{formatPhone(user?.phone) || "—"}</p>
                        <p className="mt-1 text-sm text-kx-muted">Votre numéro WhatsApp est votre identifiant : il ne peut pas être modifié.</p>
                    </div>
                    <Link href="/mes-rendez-vous" className="card group flex items-center justify-between gap-3 transition hover:border-brass/60">
                        <span>
                            <span className="block font-display font-semibold">Mes rendez-vous</span>
                            <span className="text-sm text-kx-muted">Suivi, annulation, contact</span>
                        </span>
                        <IconArrow className="h-5 w-5 text-brass-dark transition group-hover:translate-x-1" />
                    </Link>
                </aside>
            </form>
        </div>
    );
}
