"use client";

// Booking flow: prestation -> date -> créneau -> adresse -> récapitulatif.
// Public until the final step: login (WhatsApp) is asked at submit time and the
// in-progress draft survives the round trip in sessionStorage.
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Check } from "@untitled-ui/icons-react";
import { toast } from "sonner";
import { FieldLabel, FormError } from "@/components/auth/auth-card";
import { Card, NativeInput, SelectField, Spinner, TextareaField } from "@/components/barber/ui";
import { PublicShell } from "@/components/barber/public-shell";
import { Button } from "@/components/ui/button";
import { barberApi, type PublicProfile, type Service, type Slot } from "@/lib/api/barber";
import { ApiError, errorMessage } from "@/lib/api/client";
import { useAuth } from "@/lib/auth/auth-context";
import {
    addDaysISO,
    formatDateTime,
    formatDayShort,
    formatDuration,
    formatPrice,
    formatTime,
    todayISO,
} from "@/lib/barber/format";
import { cn } from "@/lib/utils/cn";

type Draft = {
    serviceId: number | null;
    day: string | null;
    startAt: string | null;
    commune: string;
    quartier: string;
    address: string;
    landmark: string;
    note: string;
};

const EMPTY: Draft = {
    serviceId: null,
    day: null,
    startAt: null,
    commune: "",
    quartier: "",
    address: "",
    landmark: "",
    note: "",
};
const DRAFT_KEY = "barber:booking-draft";
const STEPS = ["Prestation", "Date", "Créneau", "Adresse", "Récapitulatif"];

function loadDraft(): Draft | null {
    try {
        const raw = sessionStorage.getItem(DRAFT_KEY);
        return raw ? { ...EMPTY, ...(JSON.parse(raw) as Partial<Draft>) } : null;
    } catch {
        return null;
    }
}

function saveDraft(d: Draft) {
    try {
        sessionStorage.setItem(DRAFT_KEY, JSON.stringify(d));
    } catch {
        /* private mode: the draft is simply not kept */
    }
}

function clearDraft() {
    try {
        sessionStorage.removeItem(DRAFT_KEY);
    } catch {
        /* ignore */
    }
}

function Stepper({ step, onGo }: { step: number; onGo: (i: number) => void }) {
    return (
        <ol className="mb-6 flex gap-1.5 overflow-x-auto pb-1">
            {STEPS.map((label, i) => (
                <li key={label} className="shrink-0">
                    <button
                        type="button"
                        disabled={i > step}
                        onClick={() => onGo(i)}
                        className={cn(
                            "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold",
                            i === step
                                ? "bg-brand-solid text-white"
                                : i < step
                                  ? "bg-brand-primary text-brand-secondary"
                                  : "bg-primary text-quaternary ring-1 ring-secondary ring-inset"
                        )}
                    >
                        {i < step ? <Check className="size-3.5" /> : <span>{i + 1}</span>}
                        {label}
                    </button>
                </li>
            ))}
        </ol>
    );
}

function BookingFlow() {
    const router = useRouter();
    const params = useSearchParams();
    const { user, isAuthenticated } = useAuth();

    const [services, setServices] = useState<Service[] | null>(null);
    const [profile, setProfile] = useState<PublicProfile | null>(null);
    const [draft, setDraft] = useState<Draft>(EMPTY);
    const [step, setStep] = useState(0);
    const [slots, setSlots] = useState<Slot[] | null>(null);
    const [slotsLoading, setSlotsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [ready, setReady] = useState(false);

    // Load catalogue + profile, restore a draft (or ?service=).
    useEffect(() => {
        Promise.all([barberApi.services(), barberApi.profile()])
            .then(([s, p]) => {
                setServices(s);
                setProfile(p);
                const saved = loadDraft();
                const fromQuery = Number(params.get("service"));
                if (saved && saved.serviceId && s.some(x => x.id === saved.serviceId)) {
                    setDraft(saved);
                    setStep(saved.startAt ? (saved.address ? 4 : 3) : saved.day ? 2 : 1);
                } else if (fromQuery && s.some(x => x.id === fromQuery)) {
                    setDraft({ ...EMPTY, serviceId: fromQuery });
                    setStep(1);
                }
                setReady(true);
            })
            .catch(e => setError(errorMessage(e)));
    }, [params]);

    useEffect(() => {
        if (ready) saveDraft(draft);
    }, [draft, ready]);

    const service = useMemo(
        () => services?.find(s => s.id === draft.serviceId) ?? null,
        [services, draft.serviceId]
    );

    const days = useMemo(() => {
        const today = todayISO();
        const n = profile?.horizon_days ?? 30;
        return Array.from({ length: n + 1 }, (_, i) => addDaysISO(today, i));
    }, [profile]);

    const loadSlots = useCallback(async () => {
        if (!draft.serviceId || !draft.day) return;
        setSlotsLoading(true);
        setSlots(null);
        try {
            const res = await barberApi.availability(draft.serviceId, draft.day);
            setSlots(res.slots);
        } catch (e) {
            setError(errorMessage(e));
            setSlots([]);
        } finally {
            setSlotsLoading(false);
        }
    }, [draft.serviceId, draft.day]);

    useEffect(() => {
        if (step === 2) void loadSlots();
    }, [step, loadSlots]);

    function update(patch: Partial<Draft>) {
        setDraft(d => ({ ...d, ...patch }));
    }

    function go(i: number) {
        setError(null);
        setStep(i);
        window.scrollTo({ top: 0, behavior: "smooth" });
    }

    function submitAddress(e: FormEvent) {
        e.preventDefault();
        if (!draft.commune) {
            setError("Choisissez votre commune.");
            return;
        }
        go(4);
    }

    async function submit() {
        if (!service || !draft.startAt) return;
        if (!isAuthenticated) {
            router.push(`/auth/login?next=${encodeURIComponent("/reserver")}`);
            return;
        }
        if (!user?.pseudo) {
            router.push(`/auth/login?next=${encodeURIComponent("/reserver")}`);
            return;
        }
        setSubmitting(true);
        setError(null);
        try {
            const booking = await barberApi.createBooking({
                service_id: service.id,
                start_at: draft.startAt,
                commune: draft.commune,
                quartier: draft.quartier.trim(),
                address: draft.address.trim(),
                landmark: draft.landmark.trim() || null,
                note: draft.note.trim() || null,
            });
            clearDraft();
            toast.success("Demande envoyée ! Le barbier va la confirmer.");
            router.push(`/mes-rendez-vous/${booking.reference}`);
        } catch (e) {
            if (e instanceof ApiError && e.status === 409) {
                toast.error(e.message);
                update({ startAt: null });
                go(2);
            } else {
                setError(errorMessage(e));
            }
        } finally {
            setSubmitting(false);
        }
    }

    if (!services) {
        return error ? <FormError message={error} /> : <Spinner />;
    }

    const expiryHours = profile ? Math.max(1, Math.round(profile.pending_expiry_minutes / 60)) : 2;

    return (
        <div className="mx-auto max-w-2xl">
            <h1 className="text-display-xs font-semibold text-primary">Réserver</h1>
            <p className="mb-6 mt-1 text-md text-tertiary">Le barbier se déplace à votre adresse.</p>
            <Stepper step={step} onGo={go} />

            {step > 0 && (
                <button
                    type="button"
                    onClick={() => go(step - 1)}
                    className="mb-4 inline-flex items-center gap-1 text-sm font-semibold text-tertiary hover:text-secondary"
                >
                    <ArrowLeft className="size-4" /> Retour
                </button>
            )}

            {step === 0 && (
                <div className="grid gap-3">
                    {services.map(s => (
                        <button
                            key={s.id}
                            type="button"
                            onClick={() => {
                                update({ serviceId: s.id, startAt: null });
                                go(1);
                            }}
                            className={cn(
                                "rounded-xl border bg-primary p-4 text-left shadow-xs transition-colors hover:border-brand",
                                draft.serviceId === s.id ? "border-brand ring-2 ring-brand" : "border-secondary"
                            )}
                        >
                            <div className="flex items-start justify-between gap-3">
                                <span className="font-semibold text-primary">{s.name}</span>
                                <span className="shrink-0 font-bold text-brand-secondary">{formatPrice(s.price)}</span>
                            </div>
                            {s.description && <p className="mt-1 text-sm text-tertiary">{s.description}</p>}
                            <p className="mt-1 text-sm text-quaternary">{formatDuration(s.duration_minutes)}</p>
                        </button>
                    ))}
                    {services.length === 0 && <p className="text-tertiary">Aucune prestation disponible.</p>}
                </div>
            )}

            {step === 1 && (
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                    {days.map(d => (
                        <button
                            key={d}
                            type="button"
                            onClick={() => {
                                update({ day: d, startAt: null });
                                go(2);
                            }}
                            className={cn(
                                "rounded-lg border bg-primary px-2 py-3 text-center text-sm font-semibold capitalize shadow-xs hover:border-brand",
                                draft.day === d ? "border-brand text-brand-secondary ring-2 ring-brand" : "border-secondary text-secondary"
                            )}
                        >
                            {d === days[0] ? "Aujourd'hui" : formatDayShort(d)}
                        </button>
                    ))}
                </div>
            )}

            {step === 2 && (
                <div>
                    <p className="mb-3 text-sm font-medium capitalize text-secondary">
                        {draft.day && formatDayShort(draft.day)} · {service?.name}
                    </p>
                    {slotsLoading && <Spinner />}
                    {slots && slots.length === 0 && (
                        <Card>
                            <p className="text-sm text-tertiary">
                                Aucun créneau libre ce jour-là. Choisissez une autre date.
                            </p>
                            <Button className="mt-4" variant="secondary" size="md" onClick={() => go(1)}>
                                Changer de date
                            </Button>
                        </Card>
                    )}
                    <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                        {slots?.map(s => (
                            <button
                                key={s.start_at}
                                type="button"
                                onClick={() => {
                                    update({ startAt: s.start_at });
                                    go(3);
                                }}
                                className={cn(
                                    "rounded-lg border bg-primary px-2 py-3 text-center text-md font-semibold shadow-xs hover:border-brand",
                                    draft.startAt === s.start_at
                                        ? "border-brand text-brand-secondary ring-2 ring-brand"
                                        : "border-secondary text-secondary"
                                )}
                            >
                                {formatTime(s.start_at)}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {step === 3 && (
                <form onSubmit={submitAddress} className="space-y-4">
                    <Card className="space-y-4">
                        <div>
                            <FieldLabel htmlFor="commune">Commune</FieldLabel>
                            <SelectField
                                id="commune"
                                value={draft.commune}
                                onChange={e => update({ commune: e.target.value })}
                                required
                            >
                                <option value="">Choisir…</option>
                                {profile?.communes.map(c => (
                                    <option key={c} value={c}>
                                        {c}
                                    </option>
                                ))}
                            </SelectField>
                        </div>
                        <div>
                            <FieldLabel htmlFor="quartier">Quartier</FieldLabel>
                            <NativeInput
                                id="quartier"
                                value={draft.quartier}
                                onChange={e => update({ quartier: e.target.value })}
                                placeholder="Ex. Angré 8e tranche"
                                minLength={2}
                                maxLength={80}
                                required
                            />
                        </div>
                        <div>
                            <FieldLabel htmlFor="address">Adresse</FieldLabel>
                            <NativeInput
                                id="address"
                                value={draft.address}
                                onChange={e => update({ address: e.target.value })}
                                placeholder="Rue, immeuble, villa…"
                                minLength={3}
                                maxLength={300}
                                required
                            />
                        </div>
                        <div>
                            <FieldLabel htmlFor="landmark">Point de repère (facultatif)</FieldLabel>
                            <NativeInput
                                id="landmark"
                                value={draft.landmark}
                                onChange={e => update({ landmark: e.target.value })}
                                placeholder="Ex. derrière la pharmacie"
                                maxLength={300}
                            />
                        </div>
                        <div>
                            <FieldLabel htmlFor="note">Note pour le barbier (facultatif)</FieldLabel>
                            <TextareaField
                                id="note"
                                value={draft.note}
                                onChange={e => update({ note: e.target.value })}
                                maxLength={500}
                            />
                        </div>
                    </Card>
                    <FormError message={error} />
                    <Button type="submit" size="lg" className="w-full">
                        Voir le récapitulatif
                    </Button>
                </form>
            )}

            {step === 4 && service && draft.startAt && (
                <div className="space-y-4">
                    <Card>
                        <dl className="divide-y divide-secondary">
                            <div className="flex justify-between gap-4 py-2">
                                <dt className="text-tertiary">Prestation</dt>
                                <dd className="text-right font-medium text-primary">{service.name}</dd>
                            </div>
                            <div className="flex justify-between gap-4 py-2">
                                <dt className="text-tertiary">Prix</dt>
                                <dd className="font-bold text-primary">{formatPrice(service.price)}</dd>
                            </div>
                            <div className="flex justify-between gap-4 py-2">
                                <dt className="text-tertiary">Date</dt>
                                <dd className="text-right font-medium text-primary">{formatDateTime(draft.startAt)}</dd>
                            </div>
                            <div className="flex justify-between gap-4 py-2">
                                <dt className="text-tertiary">Durée</dt>
                                <dd className="font-medium text-primary">{formatDuration(service.duration_minutes)}</dd>
                            </div>
                            <div className="flex justify-between gap-4 py-2">
                                <dt className="text-tertiary">Adresse</dt>
                                <dd className="text-right font-medium text-primary">
                                    {draft.commune}, {draft.quartier}
                                    <br />
                                    {draft.address}
                                    {draft.landmark && (
                                        <>
                                            <br />
                                            <span className="text-tertiary">Repère : {draft.landmark}</span>
                                        </>
                                    )}
                                </dd>
                            </div>
                        </dl>
                    </Card>
                    <p className="rounded-lg bg-warning-primary px-3 py-2 text-sm text-warning-primary">
                        Votre demande sera confirmée par le barbier ; elle expire après {expiryHours} h sans
                        réponse. Vous serez prévenu sur WhatsApp.
                    </p>
                    {!isAuthenticated && (
                        <p className="text-sm text-tertiary">
                            Vous allez vous connecter avec votre numéro WhatsApp : votre réservation est gardée.
                        </p>
                    )}
                    <FormError message={error} />
                    <Button size="xl" className="w-full" isLoading={submitting} onClick={submit}>
                        {isAuthenticated ? "Envoyer ma demande" : "Se connecter et envoyer"}
                    </Button>
                    <p className="text-center text-sm text-tertiary">
                        <Link href="/mes-rendez-vous" className="font-semibold text-brand-secondary">
                            Voir mes rendez-vous
                        </Link>
                    </p>
                </div>
            )}

            {step < 3 && <FormError message={error} />}
        </div>
    );
}

export default function ReserverPage() {
    return (
        <PublicShell>
            <Suspense fallback={<Spinner />}>
                <BookingFlow />
            </Suspense>
        </PublicShell>
    );
}
