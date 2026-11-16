"use client";

// One shell for the whole app (client space and barber dashboard): dark left
// sidebar in the barbershop identity, cream content area. On phones the same
// sidebar opens as a drawer from a slim top bar (no bottom tab bar).
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { siteConfig, type NavItem } from "@/config/site";
import { displayName } from "@/lib/api/services";
import { useAuth } from "@/lib/auth/auth-context";
import { formatPhone } from "@/lib/barber/format";
import { cn } from "@/lib/utils/cn";
import { IconCalendar, IconClose, IconExternal, IconLogout, IconMenu, Logo } from "./icons";

function initials(name: string): string {
    const parts = name.replace(/[^\p{L}\p{N} ]/gu, " ").trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return "?";
    return (parts[0][0] + (parts[1]?.[0] ?? "")).toUpperCase();
}

export function AppShell({ children, bare = false }: { children: ReactNode; bare?: boolean }) {
    const path = usePathname();
    const { user, isAuthenticated, isAdmin, logout } = useAuth();
    const [open, setOpen] = useState(false);
    const adminArea = path.startsWith("/admin");

    useEffect(() => setOpen(false), [path]);
    useEffect(() => {
        document.body.style.overflow = open ? "hidden" : "";
        return () => {
            document.body.style.overflow = "";
        };
    }, [open]);

    const isActive = (href: string) =>
        href === "/" ? path === "/" : href === "/admin" ? path === "/admin" : path === href || path.startsWith(`${href}/`);

    const link = (i: NavItem) => {
        const active = isActive(i.href);
        const Icon = i.icon;
        return (
            <Link
                key={i.href}
                href={i.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                    "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition",
                    active ? "bg-white/[.07] font-semibold text-cream" : "text-cream/60 hover:bg-white/[.04] hover:text-cream"
                )}
            >
                <span
                    className={cn(
                        "absolute top-1/2 left-0 h-6 w-[3px] -translate-y-1/2 rounded-r-full bg-brass transition-opacity",
                        active ? "opacity-100" : "opacity-0"
                    )}
                    aria-hidden="true"
                />
                <Icon className={cn("h-5 w-5 shrink-0", active ? "text-brass" : "text-cream/45 group-hover:text-cream/80")} />
                {i.name}
            </Link>
        );
    };

    const name = displayName(user);
    const sidebar = (
        <div className="flex h-full flex-col">
            <div className="flex items-center justify-between px-2">
                <Link href={adminArea ? "/admin" : "/"} aria-label="Accueil">
                    <Logo inverted />
                </Link>
                <button type="button" className="rounded-lg p-2 text-cream/70 hover:text-cream lg:hidden" onClick={() => setOpen(false)} aria-label="Fermer le menu">
                    <IconClose className="h-5 w-5" />
                </button>
            </div>

            {adminArea ? (
                <Link href="/" target="_blank" className="btn-line-dark mt-8 w-full">
                    <IconExternal className="h-4 w-4" /> Voir le site
                </Link>
            ) : (
                <Link href="/reserver" className="btn-brass mt-8 w-full">
                    <IconCalendar className="h-4 w-4" /> Réserver
                </Link>
            )}

            <nav className="mt-8 flex flex-1 flex-col gap-1 overflow-y-auto pr-1" aria-label="Navigation principale">
                {adminArea ? (
                    <>
                        <p className="mb-2 px-3 text-[10px] font-semibold tracking-[0.28em] text-brass/80 uppercase">Barbier</p>
                        {siteConfig.nav.admin.map(link)}
                        <p className="mt-6 mb-2 px-3 text-[10px] font-semibold tracking-[0.28em] text-cream/35 uppercase">Système</p>
                        {siteConfig.nav.system.map(link)}
                    </>
                ) : (
                    <>
                        <p className="mb-2 px-3 text-[10px] font-semibold tracking-[0.28em] text-brass/80 uppercase">Mon espace</p>
                        {siteConfig.nav.user.map(link)}
                        {isAdmin && (
                            <>
                                <p className="mt-6 mb-2 px-3 text-[10px] font-semibold tracking-[0.28em] text-cream/35 uppercase">Barbier</p>
                                {link(siteConfig.nav.admin[0])}
                            </>
                        )}
                    </>
                )}
            </nav>

            <div className="mt-6 border-t border-white/10 pt-4">
                {isAuthenticated ? (
                    <>
                        <div className="flex items-center gap-3 px-2">
                            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brass font-barber text-base text-ink">{initials(name)}</span>
                            <div className="min-w-0">
                                <p className="truncate text-sm font-semibold text-cream">{name}</p>
                                {user?.phone && <p className="truncate text-xs text-cream/50">{formatPhone(user.phone)}</p>}
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={logout}
                            className="mt-3 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-cream/60 transition hover:bg-white/[.04] hover:text-cream"
                        >
                            <IconLogout className="h-5 w-5 text-cream/45" /> Se déconnecter
                        </button>
                    </>
                ) : (
                    <Link href={`/auth/login?next=${encodeURIComponent(path)}`} className="btn-line-dark w-full">
                        Connexion
                    </Link>
                )}
            </div>
        </div>
    );

    const current = [...siteConfig.nav.admin, ...siteConfig.nav.system, ...siteConfig.nav.user].find(i => isActive(i.href));

    return (
        <div className="min-h-screen bg-kx-bg lg:flex">
            <aside className="sticky top-0 hidden h-screen w-72 shrink-0 bg-ink px-4 py-6 lg:block">{sidebar}</aside>

            {open && (
                <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
                    <button type="button" className="absolute inset-0 bg-black/60 backdrop-blur-[2px]" aria-label="Fermer le menu" onClick={() => setOpen(false)} />
                    <aside className="relative h-full w-[19rem] max-w-[86vw] bg-ink px-4 py-6 shadow-2xl">{sidebar}</aside>
                </div>
            )}

            <div className="min-w-0 flex-1">
                <header className="sticky top-0 z-30 flex h-14 items-center gap-3 bg-ink px-3 text-cream lg:hidden">
                    <button type="button" className="rounded-lg p-2 hover:bg-white/10" onClick={() => setOpen(true)} aria-label="Ouvrir le menu">
                        <IconMenu className="h-6 w-6" />
                    </button>
                    <Link href={adminArea ? "/admin" : "/"} aria-label="Accueil">
                        <Logo inverted compact />
                    </Link>
                    <span className="ml-auto truncate font-barber text-sm tracking-wider text-brass">{current?.name ?? ""}</span>
                </header>
                <main className={cn("mx-auto w-full min-w-0", bare ? "max-w-5xl" : "max-w-6xl px-4 py-6 sm:px-8 sm:py-10")}>{children}</main>
            </div>
        </div>
    );
}
