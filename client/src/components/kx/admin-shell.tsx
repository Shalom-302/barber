"use client";

// Barber dashboard shell (Kortex Defender AppShell): white sidebar, mobile drawer,
// sticky header.
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import type { ReactNode } from "react";
import { siteConfig, type NavItem } from "@/config/site";
import { displayName } from "@/lib/api/services";
import { useAuth } from "@/lib/auth/auth-context";
import { cn } from "@/lib/utils/cn";
import { IconExternal, IconLogout, IconMenu, Logo } from "./icons";

export function AdminShell({ children }: { children: ReactNode }) {
    const path = usePathname();
    const { user, logout } = useAuth();
    const [open, setOpen] = useState(false);

    const link = (i: NavItem) => {
        const active = path === i.href || (i.href !== "/admin" && path.startsWith(`${i.href}/`));
        const Icon = i.icon;
        return (
            <Link
                key={i.href}
                href={i.href}
                onClick={() => setOpen(false)}
                aria-current={active ? "page" : undefined}
                className={cn(
                    "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition",
                    active ? "bg-kx-bg font-semibold text-black" : "text-kx-muted hover:bg-kx-panel2 hover:text-black"
                )}
            >
                <Icon className={cn("h-5 w-5", active ? "text-black" : "text-kx-muted/70 group-hover:text-black")} />
                {i.name}
            </Link>
        );
    };

    const sidebar = (
        <div className="flex h-full flex-col">
            <Link href="/admin" className="mb-8 block px-2" onClick={() => setOpen(false)}>
                <Logo />
            </Link>
            <Link href="/" target="_blank" className="btn mb-6 w-full">
                <IconExternal className="h-4 w-4" /> Voir le site
            </Link>
            <nav className="flex flex-col gap-1 overflow-y-auto" aria-label="Navigation principale">
                {siteConfig.nav.admin.map(link)}
                <p className="mt-6 mb-1 px-3 text-[11px] font-semibold tracking-wider text-kx-muted/70 uppercase">Système</p>
                {siteConfig.nav.system.map(link)}
            </nav>
            <div className="mt-auto border-t border-kx-border pt-4">
                <p className="truncate px-3 text-xs text-kx-muted">{displayName(user)}</p>
                <button
                    type="button"
                    onClick={logout}
                    className="mt-2 flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm text-kx-muted hover:bg-kx-panel2 hover:text-black"
                >
                    <IconLogout className="h-5 w-5 text-kx-muted/70" /> Se déconnecter
                </button>
            </div>
        </div>
    );

    const current = [...siteConfig.nav.admin, ...siteConfig.nav.system].find(
        i => path === i.href || (i.href !== "/admin" && path.startsWith(`${i.href}/`))
    );

    return (
        <div className="min-h-screen bg-kx-bg lg:flex">
            <aside className="sticky top-0 hidden h-screen w-64 shrink-0 border-r border-kx-border bg-white px-4 py-6 lg:block">{sidebar}</aside>

            {open && (
                <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
                    <button type="button" className="absolute inset-0 bg-kx-navy/50" aria-label="Fermer le menu" onClick={() => setOpen(false)} />
                    <aside className="relative h-full w-72 max-w-[85vw] bg-white px-4 py-6">{sidebar}</aside>
                </div>
            )}

            <div className="min-w-0 flex-1">
                <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-kx-border bg-white/90 px-3 backdrop-blur sm:h-16 sm:gap-3 sm:px-8">
                    <button type="button" className="-ml-1 shrink-0 rounded-lg p-2 hover:bg-kx-panel2 lg:hidden" onClick={() => setOpen(true)} aria-label="Ouvrir le menu">
                        <IconMenu />
                    </button>
                    <Link href="/admin" className="shrink-0 lg:hidden" aria-label="Tableau de bord">
                        <Logo compact />
                    </Link>
                    <p className="hidden font-display text-sm font-semibold lg:block">{current?.name ?? "Tableau de bord"}</p>
                    <span className="ml-auto rounded-full bg-black px-3 py-1.5 text-xs font-medium text-white">Barbier</span>
                </header>
                <main className="mx-auto w-full min-w-0 max-w-6xl px-4 py-6 sm:px-8 sm:py-10">{children}</main>
            </div>
        </div>
    );
}
