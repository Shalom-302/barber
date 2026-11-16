"use client";

// Public landing page, Kortex Defender style (GSAP animations, monochrome).
// Every price, service, commune and contact link comes from the API.
import Link from "next/link";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { siteConfig } from "@/config/site";
import { barberApi, type PublicProfile, type Service } from "@/lib/api/barber";
import { useAuth } from "@/lib/auth/auth-context";
import { formatDuration, formatPrice } from "@/lib/barber/format";
import { Circuit } from "./circuit";
import { IconArrow, IconCheck, IconClock, IconPin, IconScissors, IconWhatsapp, Logo } from "./icons";
import { ContactButtons } from "./ui";

gsap.registerPlugin(ScrollTrigger);

const HEADLINE = ["Votre", "coupe,", "chez", "vous,", "à", "l’heure."];

const STEPS = [
    { n: "01", title: "Choisissez", text: "La prestation, le jour, l’heure et l’adresse où le barbier vient vous coiffer." },
    { n: "02", title: "Le barbier confirme", text: "Votre demande lui arrive tout de suite. Il l’accepte et vous êtes prévenu sur WhatsApp." },
    { n: "03", title: "Il vient chez vous", text: "À l’heure convenue, à votre adresse. Vous payez sur place, simplement." },
];

const DEMO_SLOTS = ["09:00", "10:30", "14:00", "15:30", "17:00", "18:00"];

export function Landing() {
    const root = useRef<HTMLDivElement>(null);
    const { isAuthenticated, isAdmin } = useAuth();
    const [services, setServices] = useState<Service[] | null>(null);
    const [profile, setProfile] = useState<PublicProfile | null>(null);

    useEffect(() => {
        barberApi.services().then(setServices).catch(() => setServices([]));
        barberApi.profile().then(setProfile).catch(() => setProfile(null));
    }, []);

    // Static animations (hero, demo card, steps, CTA).
    useLayoutEffect(() => {
        const ctx = gsap.context(() => {
            const mm = gsap.matchMedia();
            mm.add("(prefers-reduced-motion: no-preference)", () => {
                gsap.set(".circuit path", { strokeDasharray: 1200, strokeDashoffset: 1200 });
                gsap.timeline({ defaults: { ease: "power3.out" } })
                    .to(".circuit path", { strokeDashoffset: 0, duration: 2.4, stagger: 0.12, ease: "power2.inOut" }, 0)
                    .from(".circuit circle", { scale: 0, transformOrigin: "center", duration: 0.5, stagger: 0.05 }, 0.8)
                    .from(".hero-word", { yPercent: 110, opacity: 0, duration: 0.9, stagger: 0.07 }, 0.1)
                    .from(".hero-fade", { y: 24, opacity: 0, duration: 0.8, stagger: 0.12 }, 0.6)
                    .from(".demo", { y: 60, opacity: 0, rotateX: 12, duration: 1.1 }, 0.5);

                // Demo booking card: a looping, scripted booking.
                const demo = gsap.timeline({ repeat: -1, repeatDelay: 1.8, delay: 1.6 });
                demo.set(".demo-service", { borderColor: "#e4e4e7", backgroundColor: "#ffffff" })
                    .set(".demo-slot", { backgroundColor: "#ffffff", color: "#0a0a0a", borderColor: "#e4e4e7" })
                    .set(".demo-status", { textContent: "Brouillon", backgroundColor: "#f4f4f5", color: "#5f5f66" })
                    .set(".demo-bubble", { opacity: 0, y: 20, scale: 0.96 })
                    .set(".demo-bar", { width: "0%" })
                    .to(".demo-service-1", { borderColor: "#0a0a0a", backgroundColor: "#f7f7f7", duration: 0.3 })
                    .to(".demo-bar", { width: "35%", duration: 0.6, ease: "power1.inOut" }, "<")
                    .to(".demo-slot", { borderColor: "#0a0a0a", duration: 0.15, stagger: 0.08 }, "+=0.3")
                    .to(".demo-slot", { borderColor: "#e4e4e7", duration: 0.15, stagger: 0.08 }, "<0.15")
                    .to(".demo-slot-2", { backgroundColor: "#0a0a0a", color: "#ffffff", borderColor: "#0a0a0a", duration: 0.25 })
                    .to(".demo-bar", { width: "70%", duration: 0.6, ease: "power1.inOut" }, "<")
                    .to(".demo-status", { textContent: "En attente", backgroundColor: "#fffbeb", color: "#92400e", duration: 0.01 }, "+=0.4")
                    .to(".demo-bar", { width: "100%", duration: 0.8, ease: "power1.inOut" })
                    .to(".demo-status", { textContent: "Confirmé", backgroundColor: "#d7f7f1", color: "#134e4a", duration: 0.01 }, "+=0.3")
                    .to(".demo-bubble", { opacity: 1, y: 0, scale: 1, duration: 0.5, ease: "back.out(1.6)" })
                    .to(".demo-bubble", { opacity: 1, duration: 2.4 });

                gsap.to(".glow", { xPercent: 18, yPercent: -12, scale: 1.15, duration: 6, repeat: -1, yoyo: true, ease: "sine.inOut" });

                gsap.utils.toArray<HTMLElement>(".reveal").forEach(el => {
                    gsap.from(el, { y: 40, opacity: 0, duration: 0.9, ease: "power3.out", scrollTrigger: { trigger: el, start: "top 85%" } });
                });
                gsap.from(".steps-line", {
                    scaleX: 0,
                    transformOrigin: "left center",
                    ease: "none",
                    scrollTrigger: { trigger: ".steps", start: "top 75%", end: "bottom 60%", scrub: true },
                });
                gsap.from(".step", { y: 50, opacity: 0, duration: 0.8, stagger: 0.2, ease: "power3.out", scrollTrigger: { trigger: ".steps", start: "top 75%" } });
                gsap.to(".cta-circuit", {
                    yPercent: -20,
                    ease: "none",
                    scrollTrigger: { trigger: ".cta", start: "top bottom", end: "bottom top", scrub: true },
                });
            });
            ScrollTrigger.create({
                start: 40,
                onUpdate: self => root.current?.querySelector(".nav")?.classList.toggle("nav-scrolled", self.scroll() > 40),
            });
        }, root);
        return () => ctx.revert();
    }, []);

    // Data-driven animations once the API answered.
    useEffect(() => {
        if (!services) return;
        const ctx = gsap.context(() => {
            const mm = gsap.matchMedia();
            mm.add("(prefers-reduced-motion: no-preference)", () => {
                gsap.utils.toArray<HTMLElement>(".count").forEach(el => {
                    const end = Number(el.dataset.to || 0);
                    const fmt = el.dataset.fmt === "price";
                    const obj = { v: 0 };
                    gsap.to(obj, {
                        v: end,
                        duration: 1.6,
                        ease: "power2.out",
                        scrollTrigger: { trigger: el, start: "top 90%", once: true },
                        onUpdate: () => {
                            const n = Math.round(obj.v);
                            el.textContent = fmt ? n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ") : String(n);
                        },
                    });
                });
                gsap.from(".service-card", {
                    y: 40,
                    opacity: 0,
                    duration: 0.7,
                    stagger: 0.1,
                    ease: "power3.out",
                    scrollTrigger: { trigger: ".services", start: "top 80%" },
                });
            });
            ScrollTrigger.refresh();
        }, root);
        return () => ctx.revert();
    }, [services, profile]);

    const minPrice = services && services.length ? Math.min(...services.map(s => s.price)) : null;
    const communes = profile?.communes ?? [];
    const accountHref = isAdmin ? "/admin" : "/mes-rendez-vous";
    const hasContact = !!(profile?.whatsapp_url || profile?.call_url);

    return (
        <div ref={root} className="overflow-x-hidden bg-white text-kx-text">
            {/* NAV */}
            <header className="nav fixed inset-x-0 top-0 z-50 border-b border-transparent transition-colors duration-300">
                <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-4 sm:gap-6 sm:px-8">
                    <Link href="/" aria-label={siteConfig.name} className="shrink-0">
                        <Logo />
                    </Link>
                    <nav className="ml-6 hidden gap-6 text-sm text-kx-muted md:flex" aria-label="Sections">
                        <a href="#prestations" className="hover:text-black">Prestations</a>
                        <a href="#fonctionnement" className="hover:text-black">Fonctionnement</a>
                        <a href="#zones" className="hover:text-black">Zones</a>
                        <a href="#contact" className="hover:text-black">Contact</a>
                    </nav>
                    <div className="ml-auto flex items-center gap-2">
                        {isAuthenticated ? (
                            <Link href={accountHref} className="btn whitespace-nowrap">
                                {isAdmin ? "Tableau de bord" : "Mes rendez-vous"} <IconArrow className="h-4 w-4" />
                            </Link>
                        ) : (
                            <>
                                <Link href="/auth/login?next=/mes-rendez-vous" className="hidden rounded-full px-4 py-2 text-sm font-medium hover:bg-kx-panel2 sm:inline-flex">
                                    Connexion
                                </Link>
                                <Link href="/reserver" className="btn whitespace-nowrap">
                                    Réserver
                                </Link>
                            </>
                        )}
                    </div>
                </div>
            </header>

            {/* HERO */}
            <section className="relative isolate pt-28 pb-20 sm:pt-40 sm:pb-24">
                <div className="glow pointer-events-none absolute -top-40 left-1/2 -z-10 h-[520px] w-[720px] -translate-x-1/2 rounded-full bg-gradient-to-br from-zinc-200 via-zinc-100 to-transparent opacity-80 blur-3xl" />
                <Circuit className="circuit pointer-events-none absolute inset-x-0 top-10 -z-10 mx-auto h-[560px] w-full max-w-6xl text-zinc-300" />

                <div className="mx-auto grid max-w-6xl items-center gap-14 px-4 sm:px-8 lg:grid-cols-[1.1fr_1fr]">
                    <div className="min-w-0">
                        <p className="hero-fade mb-5 inline-flex items-center gap-2 rounded-full border border-kx-border bg-white px-3.5 py-1.5 text-xs font-medium">
                            <span className="h-1.5 w-1.5 rounded-full bg-black" /> {siteConfig.tagline}
                        </p>
                        <h1 className="font-display text-[2.4rem] leading-[1.04] font-semibold tracking-tight break-words sm:text-6xl lg:text-7xl">
                            {HEADLINE.map((w, i) => (
                                <span key={i} className="inline-block overflow-hidden pb-1 align-bottom">
                                    <span className={`hero-word inline-block ${i >= 2 ? "text-zinc-400" : ""}`}>{w}&nbsp;</span>
                                </span>
                            ))}
                        </h1>
                        <p className="hero-fade mt-6 max-w-xl text-lg text-kx-muted">
                            Réservez un barbier qui se déplace à votre domicile, au bureau ou à l’hôtel. Vous choisissez le
                            créneau, il confirme, vous êtes prévenu sur WhatsApp.
                        </p>
                        <div className="hero-fade mt-8 flex flex-wrap items-center gap-3">
                            <Link href="/reserver" className="btn btn-lg w-full sm:w-auto">
                                Réserver maintenant <IconArrow className="h-4 w-4" />
                            </Link>
                            <a href="#prestations" className="btn-ghost btn-lg w-full sm:w-auto">
                                Voir les tarifs
                            </a>
                        </div>
                        <p className="hero-fade mt-5 flex items-center gap-2 text-sm text-kx-muted">
                            <IconCheck className="h-4 w-4 text-black" /> Confirmation par WhatsApp · paiement sur place
                        </p>
                    </div>

                    {/* Animated demo booking */}
                    <div className="demo min-w-0 [perspective:1200px]">
                        <div className="relative rounded-3xl border border-kx-border bg-white p-5 shadow-float sm:p-6">
                            <div className="mb-4 flex items-center justify-between">
                                <div className="flex gap-1.5">
                                    <span className="h-3 w-3 rounded-full bg-zinc-200" />
                                    <span className="h-3 w-3 rounded-full bg-zinc-200" />
                                    <span className="h-3 w-3 rounded-full bg-zinc-200" />
                                </div>
                                <span className="demo-status rounded-full bg-kx-panel2 px-2.5 py-0.5 text-xs font-semibold text-kx-muted">Brouillon</span>
                            </div>
                            <div className="h-1.5 overflow-hidden rounded-full bg-kx-panel2">
                                <div className="demo-bar h-full w-0 rounded-full bg-black" />
                            </div>
                            <p className="mt-5 text-xs font-semibold tracking-wide text-kx-muted uppercase">Prestation</p>
                            <div className="mt-2 grid gap-2">
                                {["Coupe simple", "Coupe + barbe"].map((n, i) => (
                                    <div key={n} className={`demo-service demo-service-${i} flex items-center justify-between rounded-xl border border-kx-border px-3.5 py-3 text-sm`}>
                                        <span className="flex items-center gap-2 font-medium">
                                            <IconScissors className="h-4 w-4" /> {n}
                                        </span>
                                        <span className="text-kx-muted">45 min</span>
                                    </div>
                                ))}
                            </div>
                            <p className="mt-5 text-xs font-semibold tracking-wide text-kx-muted uppercase">Samedi · créneaux libres</p>
                            <div className="mt-2 grid grid-cols-3 gap-2">
                                {DEMO_SLOTS.map((s, i) => (
                                    <span key={s} className={`demo-slot demo-slot-${i} rounded-xl border border-kx-border py-2 text-center text-sm font-semibold`}>
                                        {s}
                                    </span>
                                ))}
                            </div>
                            <div className="demo-bubble pointer-events-none mt-5 flex items-start gap-3 rounded-2xl bg-[#e7fbe9] px-4 py-3 text-sm opacity-0 shadow-card">
                                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-wa text-white">
                                    <IconWhatsapp className="h-4 w-4" />
                                </span>
                                <span className="min-w-0">
                                    <b className="block">{siteConfig.name}</b>
                                    Votre rendez-vous de samedi 14:00 est <b>confirmé</b>.
                                </span>
                            </div>
                            <p className="mt-4 text-center text-[11px] text-kx-muted">Démonstration animée · exemple illustratif</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* STATS (real data) */}
            <section className="border-y border-kx-border bg-kx-bg">
                <div className="mx-auto grid max-w-6xl grid-cols-2 divide-kx-border px-4 sm:grid-cols-4 sm:divide-x sm:px-8">
                    {[
                        { to: services?.length ?? 0, label: services?.length === 1 ? "prestation" : "prestations", suffix: "" },
                        { to: communes.length, label: "communes desservies", suffix: "" },
                        { to: minPrice ?? 0, label: "FCFA, prix à partir de", suffix: "", fmt: "price" },
                        { to: profile?.horizon_days ?? 0, label: "jours pour réserver à l’avance", suffix: "" },
                    ].map(s => (
                        <div key={s.label} className="py-8 text-center sm:px-6 sm:py-10">
                            <p className="font-display text-3xl font-semibold sm:text-5xl">
                                <span className="count" data-to={s.to} data-fmt={s.fmt}>
                                    {s.fmt === "price" ? s.to.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ") : s.to}
                                </span>
                                {s.suffix}
                            </p>
                            <p className="mt-2 text-sm text-kx-muted">{s.label}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* HOW IT WORKS */}
            <section id="fonctionnement" className="mx-auto max-w-6xl scroll-mt-24 px-4 py-20 sm:px-8 sm:py-24">
                <div className="reveal max-w-2xl">
                    <p className="eyebrow">Fonctionnement</p>
                    <h2 className="mt-3 font-display text-3xl font-semibold sm:text-5xl">Votre rendez-vous en trois étapes.</h2>
                </div>
                <div className="steps relative mt-14">
                    <div className="steps-line absolute top-7 right-0 left-0 hidden h-px bg-black md:block" />
                    <ol className="grid gap-10 md:grid-cols-3 md:gap-6">
                        {STEPS.map(s => (
                            <li key={s.n} className="step relative">
                                <span className="relative z-10 grid h-14 w-14 place-items-center rounded-full bg-black font-display text-lg font-semibold text-white ring-8 ring-white">
                                    {s.n}
                                </span>
                                <h3 className="mt-6 font-display text-xl font-semibold">{s.title}</h3>
                                <p className="mt-2 text-kx-muted">{s.text}</p>
                            </li>
                        ))}
                    </ol>
                </div>
            </section>

            {/* SERVICES (dark) */}
            <section id="prestations" className="scroll-mt-24 bg-kx-navy py-20 text-white sm:py-24">
                <div className="mx-auto max-w-6xl px-4 sm:px-8">
                    <div className="reveal flex flex-wrap items-end justify-between gap-6">
                        <div className="max-w-2xl">
                            <p className="text-sm font-semibold tracking-widest text-white/50 uppercase">Prestations & tarifs</p>
                            <h2 className="mt-3 font-display text-3xl font-semibold sm:text-5xl">Des prix clairs. Sans surprise.</h2>
                        </div>
                        <p className="max-w-sm text-white/60">Le prix affiché est celui que vous payez, sur place, une fois la coupe terminée.</p>
                    </div>
                    <div className="services mt-12 grid gap-px overflow-hidden rounded-3xl bg-white/10 sm:grid-cols-2">
                        {services === null &&
                            [0, 1].map(i => <div key={i} className="h-56 animate-pulse bg-kx-navy" />)}
                        {services?.map(s => (
                            <div key={s.id} className="service-card group flex flex-col bg-kx-navy p-7 transition-colors duration-300 hover:bg-white/[.04] sm:p-8">
                                <span className="mb-6 block h-px w-10 bg-white/40 transition-all duration-500 group-hover:w-20 group-hover:bg-white" />
                                <h3 className="font-display text-2xl font-semibold">{s.name}</h3>
                                {s.description && <p className="mt-2 text-white/60">{s.description}</p>}
                                <div className="mt-8 flex flex-wrap items-end justify-between gap-4">
                                    <div>
                                        <p className="font-display text-4xl font-semibold">{formatPrice(s.price)}</p>
                                        <p className="mt-1 flex items-center gap-1.5 text-sm text-white/50">
                                            <IconClock className="h-4 w-4" /> {formatDuration(s.duration_minutes)}
                                        </p>
                                    </div>
                                    <Link
                                        href={`/reserver?service=${s.id}`}
                                        className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-black transition hover:bg-zinc-200"
                                    >
                                        Réserver <IconArrow className="h-4 w-4" />
                                    </Link>
                                </div>
                            </div>
                        ))}
                        {services?.length === 0 && <div className="bg-kx-navy p-8 text-white/60">Les prestations seront bientôt disponibles.</div>}
                    </div>
                </div>
            </section>

            {/* ZONES */}
            <section id="zones" className="mx-auto max-w-6xl scroll-mt-24 px-4 py-20 sm:px-8 sm:py-24">
                <div className="grid items-start gap-10 lg:grid-cols-[1fr_1.4fr]">
                    <div className="reveal">
                        <p className="eyebrow">Zones desservies</p>
                        <h2 className="mt-3 font-display text-3xl font-semibold sm:text-5xl">Le barbier vient à vous.</h2>
                        <p className="mt-5 text-lg text-kx-muted">
                            Indiquez votre commune, votre quartier et un point de repère : il trouve facilement.
                        </p>
                    </div>
                    <div className="reveal flex flex-wrap gap-2.5">
                        {communes.map(c => (
                            <span key={c} className="chip px-4 py-2 text-base">
                                <IconPin className="h-4 w-4 text-kx-muted" /> {c}
                            </span>
                        ))}
                        {profile && communes.length === 0 && <p className="text-kx-muted">Toutes les communes.</p>}
                    </div>
                </div>
            </section>

            {/* CONTACT */}
            <section id="contact" className="scroll-mt-24 border-t border-kx-border bg-kx-bg py-20 sm:py-24">
                <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 sm:px-8 lg:grid-cols-2">
                    <div className="reveal">
                        <p className="eyebrow">Contact</p>
                        <h2 className="mt-3 font-display text-3xl font-semibold sm:text-5xl">Une question ? Parlez au barbier.</h2>
                        <p className="mt-5 text-lg text-kx-muted">
                            {profile?.display_name ?? siteConfig.name} répond directement sur son WhatsApp personnel ou par téléphone.
                        </p>
                    </div>
                    <div className="reveal card sm:p-8">
                        <p className="font-display text-xl font-semibold">Contacter le barbier</p>
                        {hasContact ? (
                            <ContactButtons className="mt-5" whatsappUrl={profile?.whatsapp_url} callUrl={profile?.call_url} />
                        ) : (
                            <p className="mt-3 text-kx-muted">Les coordonnées du barbier seront bientôt disponibles.</p>
                        )}
                        <p className="alert-info mt-6 text-xs">
                            Les confirmations et rappels arrivent d’un numéro WhatsApp automatique : ne lui répondez pas, utilisez
                            les boutons ci-dessus pour joindre le barbier.
                        </p>
                    </div>
                </div>
            </section>

            {/* FINAL CTA */}
            <section className="cta relative isolate overflow-hidden bg-kx-navy py-24 text-white sm:py-28">
                <Circuit className="cta-circuit pointer-events-none absolute inset-0 -z-10 h-full w-full text-white/10" />
                <div className="reveal mx-auto max-w-3xl px-4 text-center sm:px-8">
                    <h2 className="font-display text-3xl font-semibold sm:text-6xl">Prêt pour une coupe nette ?</h2>
                    <p className="mx-auto mt-5 max-w-xl text-lg text-white/60">Choisissez votre créneau en une minute. Le barbier s’occupe du reste.</p>
                    <Link href="/reserver" className="mt-9 inline-flex items-center gap-2 rounded-full bg-white px-7 py-3.5 text-base font-semibold text-black transition hover:bg-zinc-200">
                        Réserver maintenant <IconArrow className="h-4 w-4" />
                    </Link>
                </div>
            </section>

            <footer className="border-t border-kx-border bg-white">
                <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-8 text-sm text-kx-muted sm:px-8">
                    <Logo />
                    <nav className="flex gap-5" aria-label="Pied de page">
                        <Link href="/reserver" className="hover:text-black">Réserver</Link>
                        <Link href="/mes-rendez-vous" className="hover:text-black">Mes rendez-vous</Link>
                    </nav>
                    <p>© {new Date().getFullYear()} {siteConfig.name}</p>
                </div>
            </footer>
        </div>
    );
}
