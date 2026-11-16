"use client";

// Booking flow: prestation -> date & heure -> adresse -> récapitulatif -> envoyé.
// Public until submit: login (WhatsApp) is asked at that moment and the
// in-progress draft survives the round trip in sessionStorage.
import Link from "next/link";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { AppShell } from "@/components/kx/app-shell";
import { IconArrow, IconArrowLeft, IconCheck, IconClock, IconPin, IconWhatsapp } from "@/components/kx/icons";
import { ErrorBox, Loading, Spinner, StatusBadge } from "@/components/kx/ui";
import { barberApi, type Booking, type PublicProfile, type Service, type Slot } from "@/lib/api/barber";
import { ApiError, errorMessage } from "@/lib/api/client";
import { useAuth } from "@/lib/auth/auth-context";
import { addDaysISO, formatDateTime, formatDuration, formatPrice, formatTime, TIMEZONE, todayISO } from "@/lib/barber/format";
import { OTHER_QUARTIER, quartiersFor } from "@/lib/barber/quartiers";
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

const EMPTY: Draft = { serviceId: null, day: null, startAt: null, commune: "", quartier: "", address: "", landmark: "", note: "" };
const DRAFT_KEY = "barber:booking-draft";
const STEPS = ["Prestation", "Date & heure", "Adresse", "Récapitulatif"];
const PREFETCH_DAYS = 14;

// Illustration per service (the barber's own photos can replace these files).
const SERVICE_PHOTOS = [
    "/images/landing/clippers.webp",
    "/images/landing/barber-clipper.webp",
    "/images/landing/beard-razor.webp",
    "/images/landing/barber-waves.webp",
];
function servicePhoto(s: Service, index: number): string {
    const n = s.name.toLowerCase();
    if (n.includes("barbier")) return "/images/landing/barber-clipper.webp";
    if (n.includes("client")) return "/images/landing/clippers.webp";
    if (n.includes("barbe")) return "/images/landing/beard-razor.webp";
    return SERVICE_PHOTOS[index % SERVICE_PHOTOS.length];
}

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

const wdFmt = new Intl.DateTimeFormat("fr-FR", { timeZone: TIMEZONE, weekday: "short" });
const dFmt = new Intl.DateTimeFormat("fr-FR", { timeZone: TIMEZONE, day: "numeric" });
const mFmt = new Intl.DateTimeFormat("fr-FR", { timeZone: TIMEZONE, month: "short" });
const longDay = new Intl.DateTimeFormat("fr-FR", { timeZone: TIMEZONE, weekday: "long", day: "numeric", month: "long" });
const hourFmt = new Intl.DateTimeFormat("fr-FR", { timeZone: TIMEZONE, hour: "2-digit", hourCycle: "h23" });

function dayParts(iso: string) {
    const d = new Date(`${iso}T12:00:00Z`);
    return { wd: wdFmt.format(d).replace(".", ""), day: dFmt.format(d), month: mFmt.format(d).replace(".", "") };
}

function groupSlots(slots: Slot[]) {
    const groups: { label: string; items: Slot[] }[] = [
        { label: "Matin", items: [] },
        { label: "Après-midi", items: [] },
        { label: "Soir", items: [] },
    ];
    for (const s of slots) {
        const h = Number(hourFmt.format(new Date(s.start_at)));
        groups[h < 12 ? 0 : h < 17 ? 1 : 2].items.push(s);
    }
    return groups.filter(g => g.items.length);
}

function Progress({ step, onGo }: { step: number; onGo: (i: number) => void }) {
    return (
        <div className="mb-6 sm:mb-8">
            <div className="h-1 overflow-hidden rounded-full bg-ink/10">
                <div className="h-full rounded-full bg-brass transition-all duration-500" style={{ width: `${((step + 1) / STEPS.length) * 100}%` }} />
            </div>
            <ol className="mt-3 grid grid-cols-4 gap-1 text-[11px] sm:text-xs">
                {STEPS.map((label, i) => (
                    <li key={label}>
                        <button
                            type="button"
                            disabled={i > step}
                            onClick={() => onGo(i)}
                            className={cn(
                                "flex w-full items-center gap-1.5 font-medium",
                                i === step ? "text-ink" : i < step ? "text-kx-muted hover:text-ink" : "text-ink/30"
                            )}
                        >
                            <span
                                className={cn(
                                    "grid h-5 w-5 shrink-0 place-items-center rounded-full text-[10px] font-bold",
                                    i < step ? "bg-brass text-ink" : i === step ? "border-2 border-brass text-ink" : "border border-ink/20"
                                )}
                            >
                                {i < step ? <IconCheck className="h-3 w-3" /> : i + 1}
                            </span>
                            <span className="truncate">{label}</span>
                        </button>
                    </li>
                ))}
            </ol>
        </div>
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
    const [availability, setAvailability] = useState<Record<string, Slot[] | "loading">>({});
    const [error, setError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [ready, setReady] = useState(false);
    const [done, setDone] = useState<Booking | null>(null);
    const daysRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        Promise.all([barberApi.services(), barberApi.profile()])
            .then(([s, p]) => {
                setServices(s);
                setProfile(p);
                const saved = loadDraft();
                const fromQuery = Number(params.get("service"));
                if (saved && saved.serviceId && s.some(x => x.id === saved.serviceId)) {
                    setDraft(saved);
                    setStep(saved.startAt ? (saved.address && saved.commune ? 3 : 2) : 1);
                } else if (fromQuery && s.some(x => x.id === fromQuery)) {
                    setDraft({ ...EMPTY, serviceId: fromQuery });
                    setStep(1);
                }
                setReady(true);
            })
            .catch(e => setError(errorMessage(e)));
    }, [params]);

    useEffect(() => {
        if (ready && !done) saveDraft(draft);
    }, [draft, ready, done]);

    const service = useMemo(() => services?.find(s => s.id === draft.serviceId) ?? null, [services, draft.serviceId]);
    const quartierOptions = useMemo(() => quartiersFor(draft.commune), [draft.commune]);
    // Free-text quartier when "Autre quartier" is chosen, or when a restored
    // draft holds a quartier that is not in the list.
    const [otherQuartier, setOtherQuartier] = useState(false);
    useEffect(() => {
        if (draft.quartier && quartierOptions.length && !quartierOptions.includes(draft.quartier)) setOtherQuartier(true);
    }, [draft.quartier, quartierOptions]);
    const days = useMemo(() => {
        const today = todayISO();
        const n = profile?.horizon_days ?? 30;
        return Array.from({ length: n + 1 }, (_, i) => addDaysISO(today, i));
    }, [profile]);

    const fetchDay = useCallback(
        async (serviceId: number, day: string, force = false) => {
            setAvailability(a => (a[day] && a[day] !== "loading" && !force ? a : { ...a, [day]: "loading" }));
            try {
                const res = await barberApi.availability(serviceId, day);
                setAvailability(a => ({ ...a, [day]: res.slots }));
            } catch {
                setAvailability(a => ({ ...a, [day]: [] }));
            }
        },
        []
    );

    // New service: reset availability and prefetch the next two weeks (4 at a time).
    useEffect(() => {
        if (!draft.serviceId || !profile) return;
        setAvailability({});
        let cancelled = false;
        const serviceId = draft.serviceId;
        const queue = days.slice(0, PREFETCH_DAYS);
        const worker = async () => {
            while (queue.length && !cancelled) {
                const d = queue.shift()!;
                await fetchDay(serviceId, d, true);
            }
        };
        void Promise.all([worker(), worker(), worker(), worker()]);
        return () => {
            cancelled = true;
        };
    }, [draft.serviceId, profile, days, fetchDay]);

    // Pick a default day: the saved one, else the first day with slots.
    useEffect(() => {
        if (step !== 1 || draft.day) return;
        const first = days.find(d => Array.isArray(availability[d]) && (availability[d] as Slot[]).length);
        if (first) setDraft(d => ({ ...d, day: first }));
    }, [step, draft.day, days, availability]);

    useEffect(() => {
        if (draft.serviceId && draft.day && availability[draft.day] === undefined) void fetchDay(draft.serviceId, draft.day);
    }, [draft.serviceId, draft.day, availability, fetchDay]);

    function update(patch: Partial<Draft>) {
        setDraft(d => ({ ...d, ...patch }));
    }
    function go(i: number) {
        setError(null);
        setStep(i);
        window.scrollTo({ top: 0, behavior: "smooth" });
    }

    const canContinue =
        step === 0 ? !!draft.serviceId : step === 1 ? !!draft.startAt : step === 2 ? !!(draft.commune && draft.quartier.trim().length >= 2 && draft.address.trim().length >= 3) : true;

    function next() {
        if (step === 2 && !draft.commune) {
            setError("Choisissez votre commune.");
            return;
        }
        if (step < 3) go(step + 1);
        else void submit();
    }

    async function submit() {
        if (!service || !draft.startAt) return;
        if (!isAuthenticated || !user?.pseudo) {
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
            setDone(booking);
            window.scrollTo({ top: 0, behavior: "smooth" });
        } catch (e) {
            if (e instanceof ApiError && e.status === 409) {
                toast.error(e.message);
                update({ startAt: null });
                if (draft.day) void fetchDay(service.id, draft.day, true);
                go(1);
            } else {
                setError(errorMessage(e));
            }
        } finally {
            setSubmitting(false);
        }
    }

    if (!services) {
        return <div className="mx-auto max-w-2xl px-4 py-10 sm:px-8">{error ? <ErrorBox message={error} /> : <Loading />}</div>;
    }

    const expiryHours = profile ? Math.max(1, Math.round(profile.pending_expiry_minutes / 60)) : 2;

    // ---- Success -----------------------------------------------------------
    if (done) {
        return (
            <div className="mx-auto max-w-xl px-4 py-10 sm:px-8 sm:py-16">
                <div className="card text-center sm:p-10">
                    <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-brass text-ink">
                        <IconCheck className="h-8 w-8" />
                    </span>
                    <h1 className="mt-6 font-barber text-5xl text-ink">Demande envoyée !</h1>
                    <p className="mt-2 text-kx-muted">Le barbier va confirmer votre rendez-vous. Vous serez prévenu sur WhatsApp.</p>
                    <div className="mt-6 flex justify-center">
                        <StatusBadge status={done.status} />
                    </div>
                    <dl className="mt-6 divide-y divide-kx-border rounded-2xl border border-kx-border text-left text-sm">
                        <div className="flex justify-between gap-4 px-4 py-3">
                            <dt className="text-kx-muted">Référence</dt>
                            <dd className="font-mono font-semibold">{done.reference}</dd>
                        </div>
                        <div className="flex justify-between gap-4 px-4 py-3">
                            <dt className="text-kx-muted">Rendez-vous</dt>
                            <dd className="text-right font-medium">{formatDateTime(done.start_at)}</dd>
                        </div>
                        <div className="flex justify-between gap-4 px-4 py-3">
                            <dt className="text-kx-muted">Prix</dt>
                            <dd className="font-semibold">{formatPrice(done.price)}</dd>
                        </div>
                    </dl>
                    <p className="alert-warn mt-5 text-left">
                        Sans réponse du barbier, la demande expire {done.expires_at ? formatDateTime(done.expires_at).toLowerCase() : `après ${expiryHours} h`}.
                    </p>
                    <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
                        <Link href={`/mes-rendez-vous/${done.reference}`} className="btn btn-lg">
                            Suivre ma demande <IconArrow className="h-4 w-4" />
                        </Link>
                        <Link href="/" className="btn-ghost btn-lg">
                            Accueil
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    const daySlots = draft.day ? availability[draft.day] : undefined;

    return (
        <div className="mx-auto max-w-2xl px-4 pt-6 pb-6 sm:px-8 sm:pt-10 sm:pb-10">
            <div className="mb-6 flex items-center gap-3">
                {step > 0 && (
                    <button type="button" onClick={() => go(step - 1)} className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-kx-border bg-white transition hover:border-brass" aria-label="Étape précédente">
                        <IconArrowLeft className="h-5 w-5" />
                    </button>
                )}
                <div className="min-w-0">
                    <p className="text-[11px] font-semibold tracking-[0.28em] text-brass-dark uppercase">
                        Réservation · étape {step + 1} / {STEPS.length}
                    </p>
                    <h1 className="mt-1 font-barber text-4xl text-ink sm:text-5xl">
                        {["Quelle prestation ?", "Quel jour, quelle heure ?", "Où vous trouver ?", "On récapitule"][step]}
                    </h1>
                </div>
            </div>
            <Progress step={step} onGo={go} />

            {/* STEP 0: service */}
            {step === 0 && (
                <div className="grid gap-3">
                    {services.map((s, idx) => {
                        const on = draft.serviceId === s.id;
                        return (
                            <button
                                key={s.id}
                                type="button"
                                onClick={() => update({ serviceId: s.id, startAt: null, day: null })}
                                aria-pressed={on}
                                className={cn(
                                    "group relative flex items-stretch gap-4 overflow-hidden rounded-2xl border bg-white p-3 text-left transition sm:gap-5 sm:p-4",
                                    on ? "border-brass shadow-card ring-4 ring-brass/20" : "border-kx-border hover:border-brass/60 hover:shadow-card"
                                )}
                            >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                    src={servicePhoto(s, idx)}
                                    alt=""
                                    width={240}
                                    height={240}
                                    loading="lazy"
                                    className="h-24 w-24 shrink-0 rounded-xl object-cover transition duration-500 group-hover:scale-[1.03] sm:h-28 sm:w-32"
                                />
                                <span className="flex min-w-0 flex-1 flex-col justify-center py-1">
                                    <span className="block font-display text-base leading-snug font-semibold text-ink sm:text-lg">{s.name}</span>
                                    {s.description && <span className="mt-1 line-clamp-2 block text-sm text-kx-muted">{s.description}</span>}
                                    <span className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
                                        <span className="font-barber text-2xl text-brass-dark">{formatPrice(s.price)}</span>
                                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-kx-muted">
                                            <IconClock className="h-4 w-4" /> {formatDuration(s.duration_minutes)}
                                        </span>
                                    </span>
                                </span>
                                <span
                                    className={cn(
                                        "mt-1 grid h-6 w-6 shrink-0 place-items-center self-start rounded-full border-2 transition",
                                        on ? "border-brass bg-brass text-ink" : "border-kx-border"
                                    )}
                                    aria-hidden="true"
                                >
                                    {on && <IconCheck className="h-3.5 w-3.5" />}
                                </span>
                            </button>
                        );
                    })}
                    {services.length === 0 && <p className="text-kx-muted">Aucune prestation disponible pour le moment.</p>}
                </div>
            )}

            {/* STEP 1: day + slot */}
            {step === 1 && (
                <div>
                    <div ref={daysRef} className="-mx-4 overflow-x-auto px-4 pb-2 sm:-mx-8 sm:px-8">
                        <div className="flex w-max gap-2">
                            {days.map(d => {
                                const p = dayParts(d);
                                const a = availability[d];
                                const empty = Array.isArray(a) && a.length === 0;
                                const on = draft.day === d;
                                return (
                                    <button
                                        key={d}
                                        type="button"
                                        onClick={() => update({ day: d, startAt: null })}
                                        className={cn(
                                            "flex w-[4.25rem] shrink-0 flex-col items-center rounded-2xl border py-3 transition",
                                            on ? "border-ink bg-ink text-cream shadow-card" : empty ? "border-dashed border-ink/15 bg-transparent text-ink/30" : "border-kx-border bg-white hover:border-brass/60"
                                        )}
                                    >
                                        <span className={cn("text-[11px] font-medium capitalize", on ? "text-cream/70" : "")}>{d === days[0] ? "Auj." : p.wd}</span>
                                        <span className="font-barber text-2xl">{p.day}</span>
                                        <span className={cn("text-[11px] capitalize", on ? "text-cream/70" : "text-kx-muted")}>{p.month}</span>
                                        <span className={cn("mt-1 h-1.5 w-1.5 rounded-full", a === "loading" || a === undefined ? "bg-ink/10" : empty ? "bg-transparent" : "bg-brass")} />
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div className="mt-6">
                        {draft.day && (
                            <p className="mb-4 font-medium capitalize">
                                {longDay.format(new Date(`${draft.day}T12:00:00Z`))} · <span className="text-kx-muted normal-case">{service?.name}</span>
                            </p>
                        )}
                        {(daySlots === "loading" || (draft.day && daySlots === undefined)) && <Loading label="Recherche des créneaux…" />}
                        {!draft.day && <Loading label="Recherche du prochain jour disponible…" />}
                        {Array.isArray(daySlots) && daySlots.length === 0 && (
                            <div className="rounded-2xl border border-dashed border-kx-border bg-white px-6 py-10 text-center">
                                <p className="font-display text-lg font-semibold">Complet ou fermé ce jour-là</p>
                                <p className="mt-1 text-sm text-kx-muted">Choisissez un autre jour ci-dessus.</p>
                            </div>
                        )}
                        {Array.isArray(daySlots) &&
                            groupSlots(daySlots).map(g => (
                                <div key={g.label} className="mb-5">
                                    <p className="mb-2 text-[11px] font-semibold tracking-[0.25em] text-brass-dark uppercase">{g.label}</p>
                                    <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                                        {g.items.map(s => {
                                            const on = draft.startAt === s.start_at;
                                            return (
                                                <button
                                                    key={s.start_at}
                                                    type="button"
                                                    onClick={() => update({ startAt: s.start_at })}
                                                    className={cn(
                                                        "rounded-xl border py-3 text-center font-barber text-xl transition",
                                                        on ? "border-brass bg-brass text-ink shadow-card" : "border-kx-border bg-white text-ink hover:border-brass/60"
                                                    )}
                                                >
                                                    {formatTime(s.start_at)}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                    </div>
                </div>
            )}

            {/* STEP 2: address */}
            {step === 2 && (
                <form
                    onSubmit={e => {
                        e.preventDefault();
                        next();
                    }}
                    className="card space-y-5"
                    id="address-form"
                >
                    <div className="grid gap-5 sm:grid-cols-2">
                        <div>
                            <label className="label" htmlFor="commune">Commune</label>
                            <select
                                id="commune"
                                className="input select-input"
                                value={draft.commune}
                                onChange={e => {
                                    setOtherQuartier(false);
                                    update({ commune: e.target.value, quartier: "" });
                                }}
                                required
                            >
                                <option value="" disabled>
                                    Choisissez votre commune
                                </option>
                                {profile?.communes.map(c => (
                                    <option key={c} value={c}>
                                        {c}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="label" htmlFor="quartier">Quartier</label>
                            {quartierOptions.length > 0 && !otherQuartier ? (
                                <select
                                    id="quartier"
                                    className="input select-input"
                                    value={quartierOptions.includes(draft.quartier) ? draft.quartier : ""}
                                    onChange={e => {
                                        if (e.target.value === OTHER_QUARTIER) {
                                            setOtherQuartier(true);
                                            update({ quartier: "" });
                                        } else update({ quartier: e.target.value });
                                    }}
                                    disabled={!draft.commune}
                                    required
                                >
                                    <option value="" disabled>
                                        Choisissez votre quartier
                                    </option>
                                    {quartierOptions.map(q => (
                                        <option key={q} value={q}>
                                            {q}
                                        </option>
                                    ))}
                                    <option value={OTHER_QUARTIER}>Autre quartier…</option>
                                </select>
                            ) : (
                                <>
                                    <input
                                        id="quartier"
                                        className="input"
                                        value={draft.quartier}
                                        onChange={e => update({ quartier: e.target.value })}
                                        placeholder={draft.commune ? "Nom de votre quartier" : "Choisissez d'abord la commune"}
                                        disabled={!draft.commune}
                                        minLength={2}
                                        maxLength={80}
                                        required
                                    />
                                    {quartierOptions.length > 0 && (
                                        <button type="button" className="hint underline underline-offset-2" onClick={() => { setOtherQuartier(false); update({ quartier: "" }); }}>
                                            Revenir à la liste des quartiers
                                        </button>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                    <div>
                        <label className="label" htmlFor="address">Adresse</label>
                        <input id="address" className="input" value={draft.address} onChange={e => update({ address: e.target.value })} placeholder="Rue, immeuble, villa…" minLength={3} maxLength={300} required />
                    </div>
                    <div>
                        <label className="label" htmlFor="landmark">Point de repère <span className="font-normal text-kx-muted">(facultatif)</span></label>
                        <input id="landmark" className="input" value={draft.landmark} onChange={e => update({ landmark: e.target.value })} placeholder="Ex. derrière la pharmacie" maxLength={300} />
                    </div>
                    <div>
                        <label className="label" htmlFor="note">Note pour le barbier <span className="font-normal text-kx-muted">(facultatif)</span></label>
                        <textarea id="note" className="input min-h-24 resize-y" value={draft.note} onChange={e => update({ note: e.target.value })} maxLength={500} placeholder="Ex. 2e étage, sonnez deux fois" />
                    </div>
                    <button type="submit" className="hidden" />
                </form>
            )}

            {/* STEP 3: summary */}
            {step === 3 && service && draft.startAt && (
                <div className="space-y-4">
                    <div className="card p-0 sm:p-0">
                        <div className="flex items-center justify-between gap-4 rounded-t-xl bg-ink p-5 text-cream sm:rounded-t-2xl sm:p-6">
                            <div className="min-w-0">
                                <p className="text-[11px] font-semibold tracking-[0.25em] text-brass uppercase">Prestation</p>
                                <p className="mt-1 font-display text-lg font-semibold">{service.name}</p>
                                <p className="text-sm text-cream/60">{formatDuration(service.duration_minutes)}</p>
                            </div>
                            <p className="font-barber text-3xl whitespace-nowrap text-brass">{formatPrice(service.price)}</p>
                        </div>
                        <div className="grid gap-4 p-5 text-sm sm:grid-cols-2 sm:p-6">
                            <div className="flex gap-3">
                                <IconClock className="mt-0.5 h-5 w-5 shrink-0 text-brass-dark" />
                                <div>
                                    <p className="text-kx-muted">Rendez-vous</p>
                                    <p className="font-medium">{formatDateTime(draft.startAt)}</p>
                                </div>
                            </div>
                            <div className="flex gap-3">
                                <IconPin className="mt-0.5 h-5 w-5 shrink-0 text-brass-dark" />
                                <div className="min-w-0">
                                    <p className="text-kx-muted">Adresse</p>
                                    <p className="font-medium break-words">
                                        {draft.commune}, {draft.quartier}
                                        <br />
                                        {draft.address}
                                    </p>
                                    {draft.landmark && <p className="text-kx-muted">Repère : {draft.landmark}</p>}
                                </div>
                            </div>
                        </div>
                        <button type="button" onClick={() => go(1)} className="w-full border-t border-kx-border py-3 text-sm font-medium text-kx-muted hover:text-black">
                            Modifier
                        </button>
                    </div>
                    <p className="alert-warn">
                        Le barbier confirme votre demande ; sans réponse, elle expire après {expiryHours} h. Vous êtes prévenu sur WhatsApp. Paiement sur place.
                    </p>
                    {!isAuthenticated && (
                        <p className="alert-info flex items-start gap-2">
                            <IconWhatsapp className="mt-0.5 h-4 w-4 shrink-0" /> Vous allez vous connecter avec votre numéro WhatsApp : votre réservation est gardée.
                        </p>
                    )}
                </div>
            )}

            <div className="mt-5">
                <ErrorBox message={error} />
            </div>

            {/* Sticky action bar */}
            <div className="sticky bottom-0 z-30 -mx-4 mt-8 border-t border-kx-border bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur sm:bottom-4 sm:mx-0 sm:rounded-2xl sm:border sm:shadow-card">
                <div className="flex items-center gap-4 px-4 py-3 sm:px-5">
                    <div className="min-w-0 flex-1">
                        {service ? (
                            <>
                                <p className="truncate text-xs text-kx-muted">{draft.startAt ? `${service.name} · ${formatTime(draft.startAt)}` : service.name}</p>
                                <p className="font-barber text-2xl text-brass-dark">{formatPrice(service.price)}</p>
                            </>
                        ) : (
                            <p className="text-sm text-kx-muted">Choisissez une prestation</p>
                        )}
                    </div>
                    <button type="button" onClick={next} disabled={!canContinue || submitting} className="btn btn-lg shrink-0 !bg-ink hover:!bg-ink2">
                        {submitting ? <Spinner /> : null}
                        {step < 3 ? "Continuer" : isAuthenticated ? "Envoyer ma demande" : "Se connecter et envoyer"}
                        {!submitting && <IconArrow className="h-4 w-4" />}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default function ReserverPage() {
    return (
        <AppShell bare>
            <Suspense fallback={<Loading />}>
                <BookingFlow />
            </Suspense>
        </AppShell>
    );
}
