"use client";
/* eslint-disable @next/next/no-img-element -- pre-optimised WebP photos with explicit sizes */

// Public landing: premium barbershop art direction (dark, cream, brass),
// animated with GSAP + ScrollTrigger. Every price, service, commune, opening
// hour and contact link comes from the API: nothing business-related is
// hardcoded here.
import Link from "next/link";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { barberApi, type OpeningHours, type PublicProfile, type Service } from "@/lib/api/barber";
import { useAuth } from "@/lib/auth/auth-context";
import { TIMEZONE, formatDuration, formatPrice } from "@/lib/barber/format";
import { IconArrow, IconClose, IconMenu, IconPhone, IconPin, IconWhatsapp, Logo } from "./icons";

gsap.registerPlugin(ScrollTrigger);

const IMG = (name: string) => `/images/landing/${name}.webp`;

const NAV = [
    { href: "#prestations", label: "Prestations" },
    { href: "#galerie", label: "Galerie" },
    { href: "#horaires", label: "Horaires" },
    { href: "#zones", label: "Zones" },
    { href: "#contact", label: "Contact" },
];

const MARQUEE = ["Dégradé", "Taper", "Contours", "Barbe", "À domicile", "Coupe classique", "Finitions"];

const EXPERIENCE = [
    {
        n: "01",
        title: "La précision",
        text: "Dégradés nets, contours tracés au millimètre, finitions soignées. Une coupe qui tient, semaine après semaine.",
        img: { src: IMG("salon-gold"), alt: "Fauteuils de barbier noir et or dans un salon élégant", w: 2000, h: 1333 },
    },
    {
        n: "02",
        title: "La ponctualité",
        text: "Vous choisissez le créneau, le barbier le confirme et arrive à l’heure convenue. Votre temps est respecté.",
        img: { src: IMG("barber-clipper"), alt: "Barbier réalisant une coupe à la tondeuse", w: 1400, h: 2100 },
    },
    {
        n: "03",
        title: "Votre matériel ou le sien",
        text: "Le barbier vient avec son équipement professionnel, ou travaille avec votre tondeuse : vous choisissez à la réservation.",
        img: { src: IMG("beard-razor"), alt: "Taille de barbe au rasoir, gants de protection", w: 1400, h: 2100 },
    },
];

const GALLERY = [
    { src: IMG("barber-waves"), alt: "Barbier travaillant une coupe à vagues", caption: "Waves & contours", w: 1400, h: 1960 },
    { src: IMG("barber-clipper"), alt: "Coupe à la tondeuse dans un salon moderne", caption: "Dégradé net", w: 1400, h: 2100 },
    { src: IMG("beard-razor"), alt: "Finition de barbe au rasoir", caption: "Barbe au rasoir", w: 1400, h: 2100 },
    { src: IMG("street-barber"), alt: "Barbier de rue en noir et blanc", caption: "Le geste, partout", w: 1400, h: 2100 },
    { src: IMG("razors"), alt: "Rasoirs de sûreté alignés", caption: "Le matériel", w: 1400, h: 2100 },
];

const STEPS = [
    { n: "1", title: "Choisissez", text: "La prestation, le jour et l’heure qui vous arrangent, puis l’adresse où vous êtes." },
    { n: "2", title: "Le barbier confirme", text: "Il valide votre demande et vous êtes prévenu automatiquement sur WhatsApp." },
    { n: "3", title: "Il vient chez vous", text: "À l’heure convenue, à votre porte. Vous réglez sur place, simplement." },
];

const WEEKDAYS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];

function hm(t: string): string {
    return t.slice(0, 5);
}

function todayWeekday(): number {
    const name = new Intl.DateTimeFormat("en-US", { timeZone: TIMEZONE, weekday: "short" }).format(new Date());
    return ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].indexOf(name);
}

/** Headline made of masked lines that rise into view (class "rl"). */
function MaskedLines({ lines, accentLast = false }: { lines: string[]; accentLast?: boolean }) {
    return (
        <>
            {lines.map((l, i) => (
                <span key={l} className="mask">
                    <span className={`rl block ${accentLast && i === lines.length - 1 ? "brass" : ""}`}>{l}</span>
                </span>
            ))}
        </>
    );
}

export function Landing() {
    const root = useRef<HTMLDivElement>(null);
    const { isAuthenticated, isAdmin } = useAuth();
    const [services, setServices] = useState<Service[] | null>(null);
    const [profile, setProfile] = useState<PublicProfile | null>(null);
    const [hours, setHours] = useState<OpeningHours | null>(null);
    const [menuOpen, setMenuOpen] = useState(false);
    const [today, setToday] = useState(-1);

    useEffect(() => {
        barberApi.services().then(setServices).catch(() => setServices([]));
        barberApi.profile().then(setProfile).catch(() => setProfile(null));
        barberApi.hours().then(setHours).catch(() => setHours(null));
        setToday(todayWeekday());
    }, []);

    useEffect(() => {
        document.body.style.overflow = menuOpen ? "hidden" : "";
        return () => {
            document.body.style.overflow = "";
        };
    }, [menuOpen]);

    const cta = isAdmin
        ? { href: "/admin", label: "Tableau de bord" }
        : isAuthenticated
          ? { href: "/mes-rendez-vous", label: "Mes rendez-vous" }
          : { href: "/reserver", label: "Réserver" };

    // Layout animations (independent from API data).
    useLayoutEffect(() => {
        const ctx = gsap.context(() => {
            const nav = root.current?.querySelector(".bl-nav");
            ScrollTrigger.create({
                start: 0,
                end: "max",
                onUpdate: (self) => nav?.classList.toggle("bl-nav-solid", self.scroll() > 60),
            });

            const mm = gsap.matchMedia();
            mm.add("(prefers-reduced-motion: no-preference)", () => {
                // Hero: Ken Burns, parallax, headline lines rising out of masks.
                gsap.fromTo(".hero-img", { scale: 1.18 }, { scale: 1.04, duration: 9, ease: "power1.out" });
                gsap.to(".hero-media", {
                    yPercent: 16,
                    ease: "none",
                    scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true },
                });
                gsap.timeline({ defaults: { ease: "power4.out" } })
                    .from(".hero .rl", { yPercent: 110, duration: 1.15, stagger: 0.12 }, 0.2)
                    .from(".hero-rule", { scaleX: 0, transformOrigin: "left center", duration: 1 }, 0.55)
                    .from(".hero-fade", { y: 24, opacity: 0, duration: 0.9, stagger: 0.1 }, 0.75);
                gsap.to(".scroll-dot", { y: 14, repeat: -1, yoyo: true, duration: 0.9, ease: "sine.inOut" });

                // Marquee: infinite ticker (content duplicated in the DOM).
                gsap.to(".marquee-track", { xPercent: -50, duration: 32, ease: "none", repeat: -1 });

                // Generic reveals.
                gsap.utils.toArray<HTMLElement>(".reveal").forEach((el) => {
                    gsap.from(el, { y: 50, opacity: 0, duration: 1, ease: "power3.out", scrollTrigger: { trigger: el, start: "top 88%" } });
                });
                gsap.utils.toArray<HTMLElement>(".reveal-line").forEach((el) => {
                    gsap.from(el.querySelectorAll(".rl"), {
                        yPercent: 110,
                        duration: 1,
                        stagger: 0.1,
                        ease: "power4.out",
                        scrollTrigger: { trigger: el, start: "top 88%" },
                    });
                });
                gsap.utils.toArray<HTMLElement>(".draw-rule").forEach((el) => {
                    gsap.from(el, {
                        scaleX: 0,
                        transformOrigin: "left center",
                        duration: 1.2,
                        ease: "power3.inOut",
                        scrollTrigger: { trigger: el, start: "top 92%" },
                    });
                });

                // Experience: each image is revealed (clip-path) when its text is reached.
                const imgs = gsap.utils.toArray<HTMLElement>(".exp-img");
                gsap.set(imgs.slice(1), { clipPath: "inset(100% 0% 0% 0%)" });
                const show = (i: number) =>
                    imgs.forEach((img, k) =>
                        gsap.to(img, {
                            clipPath: k <= i ? "inset(0% 0% 0% 0%)" : "inset(100% 0% 0% 0%)",
                            duration: 1,
                            ease: "power3.inOut",
                            overwrite: true,
                        }),
                    );
                gsap.utils.toArray<HTMLElement>(".exp-text").forEach((el, i) => {
                    ScrollTrigger.create({ trigger: el, start: "top 65%", end: "bottom 35%", onEnter: () => show(i), onEnterBack: () => show(i) });
                    gsap.from(el, { opacity: 0.2, ease: "none", scrollTrigger: { trigger: el, start: "top 80%", end: "top 50%", scrub: true } });
                });
                gsap.to(".exp-img img", {
                    scale: 1.08,
                    ease: "none",
                    scrollTrigger: { trigger: ".experience", start: "top bottom", end: "bottom top", scrub: true },
                });

                // Steps: brass rings draw in, cards rise.
                gsap.from(".step-ring circle", {
                    strokeDashoffset: 189,
                    duration: 1.4,
                    stagger: 0.25,
                    ease: "power3.out",
                    scrollTrigger: { trigger: ".steps", start: "top 78%" },
                });
                gsap.from(".step", {
                    y: 40,
                    opacity: 0,
                    duration: 0.9,
                    stagger: 0.2,
                    ease: "power3.out",
                    scrollTrigger: { trigger: ".steps", start: "top 78%" },
                });
                gsap.to(".domicile-bg", {
                    yPercent: 12,
                    ease: "none",
                    scrollTrigger: { trigger: ".domicile", start: "top bottom", end: "bottom top", scrub: true },
                });

                // Final CTA parallax.
                gsap.fromTo(
                    ".cta-bg",
                    { yPercent: -10 },
                    { yPercent: 10, ease: "none", scrollTrigger: { trigger: ".final-cta", start: "top bottom", end: "bottom top", scrub: true } },
                );
            });

            // Desktop only: pinned horizontal gallery.
            mm.add("(min-width: 1024px) and (prefers-reduced-motion: no-preference)", () => {
                const track = root.current?.querySelector<HTMLElement>(".gallery-track");
                if (!track) return;
                const distance = () => Math.max(0, track.scrollWidth - window.innerWidth + 64);
                gsap.to(track, {
                    x: () => -distance(),
                    ease: "none",
                    scrollTrigger: {
                        trigger: ".gallery",
                        start: "top top",
                        end: () => `+=${distance()}`,
                        pin: true,
                        scrub: 1,
                        invalidateOnRefresh: true,
                    },
                });
            });
        }, root);
        return () => ctx.revert();
    }, []);

    // Data-driven reveals, once the API answered (page height changes too).
    useLayoutEffect(() => {
        if (!services && !hours && !profile) return;
        const ctx = gsap.context(() => {
            const mm = gsap.matchMedia();
            mm.add("(prefers-reduced-motion: no-preference)", () => {
                if (services?.length) {
                    gsap.from(".menu-row", {
                        y: 30,
                        opacity: 0,
                        duration: 0.8,
                        stagger: 0.12,
                        ease: "power3.out",
                        scrollTrigger: { trigger: ".menu-list", start: "top 85%" },
                    });
                }
                if (hours) {
                    gsap.from(".hours-row", {
                        x: -20,
                        opacity: 0,
                        duration: 0.6,
                        stagger: 0.06,
                        ease: "power2.out",
                        scrollTrigger: { trigger: ".hours-list", start: "top 85%" },
                    });
                }
                if (profile?.communes.length) {
                    gsap.from(".zone", {
                        y: 24,
                        opacity: 0,
                        duration: 0.6,
                        stagger: 0.04,
                        ease: "power2.out",
                        scrollTrigger: { trigger: ".zones-list", start: "top 88%" },
                    });
                }
            });
            ScrollTrigger.refresh();
        }, root);
        return () => ctx.revert();
    }, [services, hours, profile]);

    const breaksFor = (weekday: number) => hours?.breaks.filter((b) => b.weekday === weekday) ?? [];
    const minPrice = services && services.length ? Math.min(...services.map((s) => s.price)) : null;
    const brand = profile?.display_name ?? "Barber";

    return (
        <div ref={root} className="bl min-h-screen font-sans">
            {/* NAV */}
            <header className="bl-nav fixed inset-x-0 top-0 z-50 border-b border-transparent transition-colors duration-300">
                <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-4 sm:px-8">
                    <Link href="/" aria-label="Accueil" className="shrink-0">
                        <Logo inverted />
                    </Link>
                    <nav className="ml-8 hidden gap-7 text-sm text-cream-muted lg:flex" aria-label="Sections">
                        {NAV.map((n) => (
                            <a key={n.href} href={n.href} className="transition hover:text-[#f4efe7]">
                                {n.label}
                            </a>
                        ))}
                    </nav>
                    <div className="ml-auto flex items-center gap-1 sm:gap-2">
                        {!isAuthenticated && (
                            <Link href="/auth/login" className="hidden rounded-full px-4 py-2 text-sm text-cream-muted transition hover:text-[#f4efe7] sm:inline-flex">
                                Connexion
                            </Link>
                        )}
                        <Link href={cta.href} className="bl-btn bl-btn-brass !px-4 !py-2.5 !text-sm sm:!px-5">
                            {cta.label}
                        </Link>
                        <button className="rounded-full p-2 text-[#f4efe7] lg:hidden" onClick={() => setMenuOpen(true)} aria-label="Ouvrir le menu">
                            <IconMenu className="h-6 w-6" />
                        </button>
                    </div>
                </div>
            </header>

            {menuOpen && (
                <div className="fixed inset-0 z-[60] flex flex-col bg-[#0b0b0c] px-6 py-5 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
                    <div className="flex items-center justify-between">
                        <Logo inverted />
                        <button className="rounded-full p-2 text-[#f4efe7]" onClick={() => setMenuOpen(false)} aria-label="Fermer le menu">
                            <IconClose className="h-6 w-6" />
                        </button>
                    </div>
                    <nav className="mt-10 flex flex-col" aria-label="Sections">
                        {NAV.map((n, i) => (
                            <a
                                key={n.href}
                                href={n.href}
                                onClick={() => setMenuOpen(false)}
                                className="font-barber flex items-baseline gap-4 border-b border-white/10 py-4 text-4xl"
                            >
                                <span className="brass font-sans text-xs tracking-widest">0{i + 1}</span>
                                {n.label}
                            </a>
                        ))}
                    </nav>
                    <div className="mt-auto flex flex-col gap-3 pb-4">
                        <Link href={cta.href} className="bl-btn bl-btn-brass w-full" onClick={() => setMenuOpen(false)}>
                            {cta.label}
                        </Link>
                        {!isAuthenticated && (
                            <Link href="/auth/login" className="bl-btn-line w-full" onClick={() => setMenuOpen(false)}>
                                Connexion
                            </Link>
                        )}
                    </div>
                </div>
            )}

            {/* HERO */}
            <section className="hero relative isolate flex min-h-[100svh] items-end overflow-hidden pb-14 pt-28 sm:items-center sm:pb-24">
                <div className="hero-media absolute inset-0 -z-20 will-change-transform">
                    <div className="photo grain h-[116%] w-full">
                        <img
                            src={IMG("hero-fade")}
                            alt="Barbier réalisant un dégradé sur un client"
                            width={2000}
                            height={2660}
                            fetchPriority="high"
                            decoding="async"
                            className="hero-img object-[62%_22%]"
                        />
                    </div>
                </div>
                <div className="absolute inset-0 -z-10 bg-gradient-to-t from-[#0b0b0c] via-[#0b0b0c]/65 to-[#0b0b0c]/25 lg:bg-gradient-to-r lg:from-[#0b0b0c] lg:via-[#0b0b0c]/70 lg:to-transparent" />

                <div className="mx-auto w-full max-w-7xl px-4 sm:px-8">
                    <p className="hero-fade eyebrow-b mb-6">Barbier à domicile · Abidjan</p>
                    <h1 className="font-barber text-[16vw] sm:text-[9vw] lg:text-[7.6rem]">
                        <MaskedLines lines={["La coupe", "parfaite,", "chez vous."]} accentLast />
                    </h1>
                    <div className="hero-rule rule mt-8 w-24" />
                    <p className="hero-fade mt-6 max-w-md text-base text-cream-muted sm:text-lg">
                        Le barbier se déplace chez vous, à l’heure que vous choisissez. Réservez en quelques secondes, il confirme sur WhatsApp.
                    </p>
                    <div className="hero-fade mt-8 flex flex-col gap-3 sm:flex-row">
                        <Link href="/reserver" className="bl-btn bl-btn-brass">
                            Réserver un créneau <IconArrow className="h-4 w-4" />
                        </Link>
                        <a href="#prestations" className="bl-btn-line">
                            Voir les tarifs
                        </a>
                    </div>
                    <p className="hero-fade mt-8 text-[11px] font-medium uppercase tracking-[0.28em] text-cream-muted">
                        Abidjan <span className="brass">·</span> à domicile <span className="brass">·</span> confirmation WhatsApp
                    </p>
                </div>

                <a
                    href="#experience"
                    className="absolute bottom-8 right-8 hidden h-12 w-7 justify-center rounded-full border border-white/30 pt-2 lg:flex"
                    aria-label="Défiler vers le contenu"
                >
                    <span className="scroll-dot block h-2 w-1 rounded-full bg-[#c8a96a]" />
                </a>
            </section>

            {/* MARQUEE */}
            <div className="overflow-hidden border-y border-white/10 bg-[#0b0b0c] py-5" aria-hidden="true">
                <div className="marquee-track flex w-max">
                    {[0, 1].map((dup) => (
                        <div key={dup} className="flex shrink-0 items-center">
                            {MARQUEE.map((w) => (
                                <span key={`${dup}-${w}`} className="font-barber flex items-center whitespace-nowrap text-3xl sm:text-5xl">
                                    <span className="px-6 sm:px-10">{w}</span>
                                    <span className="brass text-lg sm:text-2xl">✦</span>
                                </span>
                            ))}
                        </div>
                    ))}
                </div>
            </div>

            {/* EXPERIENCE */}
            <section id="experience" className="experience relative bg-[#0b0b0c]">
                <div className="mx-auto grid max-w-7xl gap-12 px-4 py-24 sm:px-8 lg:grid-cols-2 lg:gap-16 lg:py-0">
                    <div className="lg:sticky lg:top-0 lg:flex lg:h-screen lg:items-center">
                        <div className="relative aspect-[4/5] w-full overflow-hidden rounded-[2rem] sm:aspect-[16/11] lg:aspect-[4/5]">
                            {EXPERIENCE.map((e, i) => (
                                <div key={e.n} className="exp-img photo vignette absolute inset-0" style={{ zIndex: i }}>
                                    <img src={e.img.src} alt={e.img.alt} width={e.img.w} height={e.img.h} loading="lazy" decoding="async" />
                                </div>
                            ))}
                            <div className="absolute bottom-5 left-5 z-10 rounded-full bg-[#0b0b0c]/70 px-4 py-2 text-[11px] uppercase tracking-[0.25em] backdrop-blur">
                                L’expérience {brand}
                            </div>
                        </div>
                    </div>
                    <div className="lg:py-[28vh]">
                        <p className="eyebrow-b reveal">L’expérience</p>
                        <h2 className="reveal-line font-barber mt-5 text-5xl sm:text-7xl">
                            <MaskedLines lines={["Un salon", "qui vient", "à vous."]} accentLast />
                        </h2>
                        <div className="mt-12 space-y-14 lg:mt-24 lg:space-y-[26vh]">
                            {EXPERIENCE.map((e) => (
                                <article key={e.n} className="exp-text max-w-md">
                                    <p className="brass font-barber text-6xl">{e.n}</p>
                                    <div className="draw-rule rule my-5 w-16" />
                                    <h3 className="font-display text-2xl font-semibold">{e.title}</h3>
                                    <p className="mt-3 text-lg text-cream-muted">{e.text}</p>
                                </article>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* PRESTATIONS — barbershop price menu */}
            <section id="prestations" className="relative isolate scroll-mt-16 overflow-hidden py-24 sm:py-32">
                <div className="photo absolute inset-0 -z-20">
                    <img src={IMG("clippers")} alt="" width={1400} height={933} loading="lazy" decoding="async" className="opacity-40" />
                </div>
                <div className="absolute inset-0 -z-10 bg-[#0b0b0c]/85" />
                <div className="mx-auto max-w-4xl px-4 sm:px-8">
                    <div className="text-center">
                        <p className="eyebrow-b reveal">La carte</p>
                        <h2 className="reveal-line font-barber mt-5 text-5xl sm:text-7xl">
                            <MaskedLines lines={["Prestations", "& tarifs"]} accentLast />
                        </h2>
                        {minPrice !== null && (
                            <p className="reveal mt-5 text-cream-muted">
                                À partir de <span className="brass font-semibold">{formatPrice(minPrice)}</span>, le barbier se déplace chez vous.
                            </p>
                        )}
                    </div>

                    <div className="mt-14 rounded-[2rem] border border-white/10 bg-[#141416]/80 p-6 backdrop-blur sm:p-10">
                        {services === null && (
                            <div className="space-y-6" aria-busy="true">
                                {[0, 1].map((i) => (
                                    <div key={i} className="h-14 animate-pulse rounded-xl bg-white/5" />
                                ))}
                            </div>
                        )}
                        {services && services.length === 0 && (
                            <p className="text-center text-cream-muted">La carte est en cours de mise à jour. Revenez très vite.</p>
                        )}
                        <ul className="menu-list divide-y divide-white/10">
                            {services?.map((s) => (
                                <li key={s.id} className="menu-row">
                                    <Link href={`/reserver?service=${s.id}`} className="group block py-6">
                                        <div className="flex items-baseline gap-3">
                                            <h3 className="font-barber min-w-0 text-2xl transition group-hover:text-[#c8a96a] sm:text-3xl">{s.name}</h3>
                                            <span className="leader hidden sm:block" aria-hidden="true" />
                                            <span className="brass font-barber ml-auto whitespace-nowrap text-2xl sm:ml-0 sm:text-3xl">{formatPrice(s.price)}</span>
                                        </div>
                                        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-cream-muted">
                                            <span className="uppercase tracking-widest">{formatDuration(s.duration_minutes)}</span>
                                            {s.description && <span>{s.description}</span>}
                                            <span className="ml-auto inline-flex items-center gap-1.5 text-[#f4efe7] opacity-70 transition group-hover:translate-x-1 group-hover:opacity-100">
                                                Réserver <IconArrow className="h-4 w-4" />
                                            </span>
                                        </div>
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            </section>

            {/* GALERIE — pinned horizontal scroll on desktop, swipe on mobile */}
            <section id="galerie" className="gallery scroll-mt-16 overflow-hidden bg-[#f4efe7] text-[#0b0b0c] lg:flex lg:h-screen lg:flex-col lg:justify-center">
                <div className="mx-auto w-full max-w-7xl px-4 pt-24 sm:px-8 lg:pt-0">
                    <p className="eyebrow-b reveal !text-[#a8874a] before:!bg-[#a8874a]">Galerie</p>
                    <div className="mt-5 flex flex-wrap items-end justify-between gap-4">
                        <h2 className="reveal-line font-barber text-5xl sm:text-7xl">
                            <MaskedLines lines={["Le savoir-faire"]} />
                        </h2>
                        <p className="reveal max-w-sm text-[#0b0b0c]/60">Dégradés, contours, barbe : le geste du barbier, en images.</p>
                    </div>
                </div>
                <div className="gallery-track mt-10 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-24 sm:gap-6 sm:px-8 lg:w-max lg:snap-none lg:overflow-visible lg:pb-0 lg:pl-[max(2rem,calc((100vw-80rem)/2+2rem))]">
                    {GALLERY.map((g, i) => (
                        <figure key={g.caption} className="w-[72vw] shrink-0 snap-center sm:w-[42vw] lg:w-[24vw]">
                            <div className="photo vignette aspect-[3/4] overflow-hidden rounded-[1.5rem]">
                                <img src={g.src} alt={g.alt} width={g.w} height={g.h} loading="lazy" decoding="async" className="transition duration-700 hover:scale-105" />
                            </div>
                            <figcaption className="mt-4 flex items-baseline gap-3">
                                <span className="font-barber text-sm text-[#a8874a]">0{i + 1}</span>
                                <span className="font-display text-lg font-semibold">{g.caption}</span>
                            </figcaption>
                        </figure>
                    ))}
                    <div className="flex w-[60vw] shrink-0 snap-center flex-col justify-center sm:w-[32vw] lg:w-[20vw]">
                        <p className="font-barber text-5xl">Votre tour ?</p>
                        <Link href="/reserver" className="mt-6 inline-flex w-fit items-center gap-2 rounded-full bg-[#0b0b0c] px-6 py-3 font-semibold text-[#f4efe7]">
                            Réserver <IconArrow className="h-4 w-4" />
                        </Link>
                    </div>
                </div>
            </section>

            {/* À DOMICILE — how it works */}
            <section className="domicile relative isolate overflow-hidden py-24 sm:py-32">
                <div className="domicile-bg photo absolute inset-x-0 -top-[10%] -z-20 h-[120%]">
                    <img src={IMG("street-salon")} alt="" width={1400} height={1000} loading="lazy" decoding="async" />
                </div>
                <div className="absolute inset-0 -z-10 bg-gradient-to-b from-[#0b0b0c] via-[#0b0b0c]/80 to-[#0b0b0c]" />
                <div className="mx-auto max-w-7xl px-4 sm:px-8">
                    <p className="eyebrow-b reveal">À domicile</p>
                    <h2 className="reveal-line font-barber mt-5 max-w-3xl text-5xl sm:text-7xl">
                        <MaskedLines lines={["Trois étapes,", "zéro attente."]} accentLast />
                    </h2>
                    <ol className="steps mt-16 grid gap-12 md:grid-cols-3 md:gap-8">
                        {STEPS.map((s) => (
                            <li key={s.n} className="step">
                                <div className="relative h-16 w-16">
                                    <svg viewBox="0 0 64 64" className="step-ring absolute inset-0 -rotate-90" aria-hidden="true">
                                        <circle cx="32" cy="32" r="30" fill="none" stroke="#c8a96a" strokeWidth="1.5" strokeDasharray="189" strokeDashoffset="0" />
                                    </svg>
                                    <span className="brass font-barber absolute inset-0 grid place-items-center text-3xl">{s.n}</span>
                                </div>
                                <h3 className="mt-6 font-display text-2xl font-semibold">{s.title}</h3>
                                <p className="mt-3 max-w-xs text-cream-muted">{s.text}</p>
                            </li>
                        ))}
                    </ol>
                    {profile && (
                        <p className="reveal mt-14 max-w-xl text-sm text-cream-muted">
                            Une demande non confirmée sous {Math.max(1, Math.round(profile.pending_expiry_minutes / 60))} h libère le créneau. Annulation
                            possible jusqu’à {profile.cancel_min_hours} h avant le rendez-vous.
                        </p>
                    )}
                    <Link href="/reserver" className="reveal bl-btn bl-btn-brass mt-10">
                        Commencer ma réservation <IconArrow className="h-4 w-4" />
                    </Link>
                </div>
            </section>

            {/* HORAIRES + ZONES */}
            <section className="bg-[#0b0b0c]">
                <div className="mx-auto grid max-w-7xl gap-16 px-4 py-24 sm:px-8 sm:py-32 lg:grid-cols-2">
                    <div id="horaires" className="scroll-mt-24">
                        <p className="eyebrow-b reveal">Horaires</p>
                        <h2 className="reveal-line font-barber mt-5 text-5xl sm:text-6xl">
                            <MaskedLines lines={["Quand on passe"]} />
                        </h2>
                        <div className="draw-rule rule mt-8 w-full opacity-40" />
                        {!hours && <div className="mt-6 h-64 animate-pulse rounded-2xl bg-white/5" aria-busy="true" />}
                        {hours && (
                            <ul className="hours-list mt-2">
                                {WEEKDAYS.map((name, wd) => {
                                    const day = hours.days.find((d) => d.weekday === wd);
                                    const open = !!day?.is_open;
                                    const isToday = wd === today;
                                    return (
                                        <li
                                            key={name}
                                            className={`hours-row flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-white/10 py-4 ${isToday ? "text-[#f4efe7]" : "text-cream-muted"}`}
                                        >
                                            <span className="flex items-center gap-3 font-display text-lg font-semibold">
                                                {name}
                                                {isToday && (
                                                    <span className="rounded-full bg-[#c8a96a] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-[#0b0b0c]">
                                                        Aujourd’hui
                                                    </span>
                                                )}
                                            </span>
                                            <span className="text-right">
                                                {open && day ? (
                                                    <span className={`font-barber text-xl ${isToday ? "brass" : ""}`}>
                                                        {hm(day.start_time)} – {hm(day.end_time)}
                                                    </span>
                                                ) : (
                                                    <span className="font-barber text-xl opacity-50">Fermé</span>
                                                )}
                                                {open &&
                                                    breaksFor(wd).map((p) => (
                                                        <span key={p.id} className="block text-xs">
                                                            {p.label || "Pause"} {hm(p.start_time)} – {hm(p.end_time)}
                                                        </span>
                                                    ))}
                                            </span>
                                        </li>
                                    );
                                })}
                            </ul>
                        )}
                    </div>

                    <div id="zones" className="scroll-mt-24">
                        <p className="eyebrow-b reveal">Zones desservies</p>
                        <h2 className="reveal-line font-barber mt-5 text-5xl sm:text-6xl">
                            <MaskedLines lines={["On se déplace", "à Abidjan"]} accentLast />
                        </h2>
                        <p className="reveal mt-6 max-w-md text-cream-muted">
                            Le barbier vient à votre domicile, au bureau ou à l’hôtel, dans les communes suivantes :
                        </p>
                        <ul className="zones-list mt-8 flex flex-wrap gap-2.5">
                            {(profile?.communes ?? []).map((c) => (
                                <li
                                    key={c}
                                    className="zone inline-flex items-center gap-2 rounded-full border border-white/15 px-4 py-2 text-sm transition hover:border-[#c8a96a] hover:text-[#c8a96a]"
                                >
                                    <IconPin className="h-4 w-4 opacity-60" /> {c}
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            </section>

            {/* CONTACT */}
            <section id="contact" className="scroll-mt-20 bg-[#0b0b0c] px-4 pb-24 sm:px-8">
                <div className="reveal mx-auto grid max-w-7xl overflow-hidden rounded-[2rem] border border-white/10 bg-[#141416] lg:grid-cols-[1fr_1.1fr]">
                    <div className="photo vignette hidden min-h-[340px] lg:block">
                        <img src={IMG("barber-precision")} alt="Barbier concentré sur une coupe" width={1400} height={933} loading="lazy" decoding="async" />
                    </div>
                    <div className="p-7 sm:p-12">
                        <p className="eyebrow-b">Contact direct</p>
                        <h2 className="font-barber mt-5 text-4xl sm:text-5xl">
                            Une question ? <span className="brass">Parlez au barbier.</span>
                        </h2>
                        <p className="mt-5 max-w-md text-cream-muted">
                            Pour une demande particulière ou un changement de dernière minute, contactez directement {brand}.
                        </p>
                        {profile && (profile.whatsapp_url || profile.call_url) ? (
                            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                                {profile.whatsapp_url && (
                                    <a href={profile.whatsapp_url} target="_blank" rel="noopener noreferrer" className="bl-btn bl-btn-brass">
                                        <IconWhatsapp className="h-5 w-5" /> WhatsApp
                                    </a>
                                )}
                                {profile.call_url && (
                                    <a href={profile.call_url} className="bl-btn-line">
                                        <IconPhone className="h-5 w-5" /> Appeler
                                    </a>
                                )}
                            </div>
                        ) : (
                            <p className="mt-8 text-sm text-cream-muted">Les coordonnées du barbier arrivent bientôt. Réservez en ligne en attendant.</p>
                        )}
                        <p className="mt-8 border-t border-white/10 pt-6 text-xs leading-relaxed text-cream-muted">
                            Les notifications automatiques (code de connexion, confirmations) arrivent d’un numéro WhatsApp dédié : ne répondez pas à ce
                            numéro, utilisez les boutons ci-dessus pour joindre le barbier.
                        </p>
                    </div>
                </div>
            </section>

            {/* FINAL CTA */}
            <section className="final-cta relative isolate overflow-hidden py-32 sm:py-44">
                <div className="cta-bg photo absolute inset-x-0 -top-[15%] -z-20 h-[130%]">
                    <img src={IMG("salon-interior")} alt="" width={2000} height={1370} loading="lazy" decoding="async" />
                </div>
                <div className="absolute inset-0 -z-10 bg-[#0b0b0c]/75" />
                <div className="mx-auto max-w-4xl px-4 text-center sm:px-8">
                    <h2 className="reveal-line font-barber text-[13vw] sm:text-8xl">
                        <MaskedLines lines={["Réservez votre", "prochaine coupe"]} accentLast />
                    </h2>
                    <p className="reveal mx-auto mt-6 max-w-md text-lg text-cream-muted">Choisissez votre créneau maintenant, le barbier s’occupe du reste.</p>
                    <Link href="/reserver" className="reveal bl-btn bl-btn-brass mt-10">
                        Réserver un créneau <IconArrow className="h-4 w-4" />
                    </Link>
                </div>
            </section>

            {/* FOOTER */}
            <footer className="border-t border-white/10 bg-[#0b0b0c]">
                <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-10 text-sm text-cream-muted sm:flex-row sm:items-center sm:justify-between sm:px-8">
                    <Logo inverted />
                    <nav className="flex flex-wrap gap-x-6 gap-y-2" aria-label="Pied de page">
                        <Link href="/reserver" className="hover:text-[#f4efe7]">Réserver</Link>
                        <Link href="/mes-rendez-vous" className="hover:text-[#f4efe7]">Mes rendez-vous</Link>
                        <Link href="/auth/login" className="hover:text-[#f4efe7]">Connexion</Link>
                    </nav>
                    <p className="text-xs">
                        © {new Date().getFullYear()} {brand} · Photos : Unsplash
                    </p>
                </div>
            </footer>
        </div>
    );
}
