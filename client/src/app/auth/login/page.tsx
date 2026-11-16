"use client";

// WhatsApp-only login: number -> code -> (first time) pseudo -> ?next=.
// Dark split layout from Kortex Defender.
import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PseudoForm } from "@/components/auth/pseudo-form";
import { WhatsappLogin } from "@/components/auth/whatsapp-login";
import { IconCheck, Logo } from "@/components/kx/icons";
import { siteConfig } from "@/config/site";
import { isAdmin, type LoginResult, type User } from "@/lib/api/services";
import { safeNext, useAuth } from "@/lib/auth/auth-context";

const POINTS = [
    "Pas de mot de passe : un code arrive sur WhatsApp",
    "Votre compte est créé automatiquement",
    "Suivez vos rendez-vous et soyez prévenu à chaque étape",
];

function LoginContent() {
    const router = useRouter();
    const params = useSearchParams();
    const { setSession, isAuthenticated, user, refreshUser, loading } = useAuth();
    const [step, setStep] = useState<"login" | "pseudo">("login");
    const next = params.get("next");

    // Already logged in (or just logged in): ask for a pseudo once, else go on.
    useEffect(() => {
        if (loading || !isAuthenticated || !user) return;
        const target = (u: User) => safeNext(next, isAdmin(u) ? "/admin" : "/reserver");
        if (!user.pseudo && !isAdmin(user)) setStep("pseudo");
        else router.replace(target(user));
    }, [loading, isAuthenticated, user, next, router]);

    function onSuccess(result: LoginResult) {
        setSession(result);
    }

    return (
        <div className="w-full rounded-3xl bg-white p-6 text-kx-text shadow-float sm:p-8">
            <div className="mb-6 lg:hidden">
                <Logo />
            </div>
            {step === "pseudo" ? (
                <>
                    <p className="eyebrow">Dernière étape</p>
                    <h1 className="mt-2 font-display text-2xl font-semibold sm:text-3xl">Choisissez un pseudo</h1>
                    <p className="mt-2 mb-6 text-sm text-kx-muted">Une seule fois : il sera affiché au barbier avec vos rendez-vous.</p>
                    <PseudoForm initial={user?.pseudo ?? ""} onDone={refreshUser} />
                </>
            ) : (
                <>
                    <p className="eyebrow">Connexion</p>
                    <h1 className="mt-2 font-display text-2xl font-semibold sm:text-3xl">Entrez votre numéro WhatsApp</h1>
                    <p className="mt-2 mb-6 text-sm text-kx-muted">Nous vous envoyons un code pour vous connecter.</p>
                    <WhatsappLogin onSuccess={onSuccess} />
                </>
            )}
        </div>
    );
}

export default function LoginPage() {
    return (
        <div className="min-h-screen bg-kx-navy text-white">
            <div className="mx-auto grid min-h-screen max-w-6xl items-center gap-12 px-4 py-10 sm:px-8 lg:grid-cols-2">
                <section className="hidden lg:block">
                    <Link href="/" className="mb-12 inline-block">
                        <Logo inverted />
                    </Link>
                    <h2 className="font-display text-5xl leading-[1.1] font-semibold">
                        Votre coupe, chez vous, <span className="text-white/55">à l’heure.</span>
                    </h2>
                    <p className="mt-5 max-w-md text-lg text-white/70">
                        Connectez-vous avec votre numéro WhatsApp pour réserver et suivre vos rendez-vous.
                    </p>
                    <ul className="mt-10 space-y-4">
                        {POINTS.map(p => (
                            <li key={p} className="flex items-center gap-3 text-white/85">
                                <span className="grid h-7 w-7 place-items-center rounded-full bg-white/10 text-white">
                                    <IconCheck className="h-4 w-4" />
                                </span>
                                {p}
                            </li>
                        ))}
                    </ul>
                    <p className="mt-12 inline-flex rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm text-white/75">
                        {siteConfig.tagline}
                    </p>
                </section>
                <section className="mx-auto w-full max-w-md">
                    <Suspense>
                        <LoginContent />
                    </Suspense>
                    <p className="mt-6 text-center text-sm text-white/50">
                        <Link href="/" className="hover:text-white">
                            ← Retour à l’accueil
                        </Link>
                    </p>
                </section>
            </div>
        </div>
    );
}
