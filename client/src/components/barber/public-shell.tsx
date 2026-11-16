"use client";

// Public layout (landing, booking flow): simple top bar, mobile-first.
import Link from "next/link";
import type { ReactNode } from "react";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { siteConfig } from "@/config/site";
import { useAuth } from "@/lib/auth/auth-context";

export function PublicShell({ children }: { children: ReactNode }) {
    const { isAuthenticated, isAdmin } = useAuth();
    return (
        <div className="flex min-h-screen flex-col bg-secondary">
            <header className="sticky top-0 z-20 border-b border-secondary bg-primary/90 backdrop-blur">
                <div className="mx-auto flex h-16 max-w-5xl items-center gap-3 px-4">
                    <Link href="/" className="text-xl font-bold text-primary">
                        ✂ {siteConfig.name}
                    </Link>
                    <div className="flex-1" />
                    <nav className="flex items-center gap-1 text-sm font-semibold">
                        <Link href="/reserver" className="rounded-md px-3 py-2 text-secondary hover:bg-primary_hover">
                            Réserver
                        </Link>
                        {isAuthenticated ? (
                            <Link
                                href={isAdmin ? "/admin" : "/mes-rendez-vous"}
                                className="rounded-md px-3 py-2 text-secondary hover:bg-primary_hover"
                            >
                                {isAdmin ? "Tableau de bord" : "Mes rendez-vous"}
                            </Link>
                        ) : (
                            <Link
                                href="/auth/login?next=/mes-rendez-vous"
                                className="rounded-md px-3 py-2 text-secondary hover:bg-primary_hover"
                            >
                                Connexion
                            </Link>
                        )}
                    </nav>
                    <ThemeToggle />
                </div>
            </header>
            <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 sm:py-10">{children}</main>
            <footer className="border-t border-secondary bg-primary">
                <div className="mx-auto max-w-5xl px-4 py-6 text-sm text-tertiary">
                    © {new Date().getFullYear()} {siteConfig.name} · Coiffure à domicile à Abidjan
                </div>
            </footer>
        </div>
    );
}
