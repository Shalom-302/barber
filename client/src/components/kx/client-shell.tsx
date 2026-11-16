"use client";

// Client space (booking flow, my bookings, profile): light top bar + mobile
// bottom tab bar. The barber's dashboard uses AdminShell instead.
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { siteConfig } from "@/config/site";
import { displayName } from "@/lib/api/services";
import { useAuth } from "@/lib/auth/auth-context";
import { cn } from "@/lib/utils/cn";
import { IconLogout, Logo } from "./icons";

export function ClientShell({ children, bare = false }: { children: ReactNode; bare?: boolean }) {
    const path = usePathname();
    const { isAuthenticated, isAdmin, user, logout } = useAuth();
    const tabs = siteConfig.nav.user;
    const active = (href: string) => (href === "/" ? path === "/" : path === href || path.startsWith(`${href}/`));

    return (
        <div className="min-h-screen bg-kx-bg pb-24 sm:pb-0">
            <header className="sticky top-0 z-40 border-b border-kx-border bg-white/90 backdrop-blur">
                <div className="mx-auto flex h-14 max-w-5xl items-center gap-3 px-4 sm:h-16 sm:px-8">
                    <Link href="/" aria-label="Accueil" className="shrink-0">
                        <Logo compact />
                    </Link>
                    <nav className="ml-6 hidden items-center gap-1 text-sm sm:flex" aria-label="Navigation">
                        {tabs.slice(1).map(t => (
                            <Link
                                key={t.href}
                                href={t.href}
                                className={cn(
                                    "rounded-full px-3.5 py-2 transition",
                                    active(t.href) ? "bg-kx-panel2 font-semibold text-black" : "text-kx-muted hover:text-black"
                                )}
                            >
                                {t.name}
                            </Link>
                        ))}
                    </nav>
                    <div className="ml-auto flex items-center gap-2">
                        {isAdmin && (
                            <Link href="/admin" className="btn-ghost btn-sm">
                                Tableau de bord
                            </Link>
                        )}
                        {isAuthenticated ? (
                            <>
                                <span className="hidden max-w-40 truncate text-sm text-kx-muted md:inline">{displayName(user)}</span>
                                <button type="button" onClick={logout} className="rounded-full p-2 text-kx-muted hover:bg-kx-panel2 hover:text-black" aria-label="Se déconnecter" title="Se déconnecter">
                                    <IconLogout className="h-5 w-5" />
                                </button>
                            </>
                        ) : (
                            <Link href={`/auth/login?next=${encodeURIComponent(path)}`} className="btn btn-sm">
                                Connexion
                            </Link>
                        )}
                    </div>
                </div>
            </header>

            <main className={cn("mx-auto w-full min-w-0", bare ? "" : "max-w-5xl px-4 py-6 sm:px-8 sm:py-10")}>{children}</main>

            {/* Mobile tab bar */}
            <nav
                className="fixed inset-x-0 bottom-0 z-40 border-t border-kx-border bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur sm:hidden"
                aria-label="Navigation mobile"
            >
                <div className="grid grid-cols-4">
                    {tabs.map(t => {
                        const Icon = t.icon;
                        const on = active(t.href);
                        return (
                            <Link
                                key={t.href}
                                href={t.href}
                                aria-current={on ? "page" : undefined}
                                className={cn("flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium", on ? "text-black" : "text-kx-muted")}
                            >
                                <span className={cn("grid h-8 w-12 place-items-center rounded-full transition", on && "bg-kx-panel2")}>
                                    <Icon className="h-5 w-5" />
                                </span>
                                {t.name}
                            </Link>
                        );
                    })}
                </div>
            </nav>
        </div>
    );
}
