"use client";

// WhatsApp-only login: number -> code -> (first time) pseudo -> ?next=.
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AuthCard } from "@/components/auth/auth-card";
import { PseudoForm } from "@/components/auth/pseudo-form";
import { WhatsappLogin } from "@/components/auth/whatsapp-login";
import { isAdmin, type LoginResult, type User } from "@/lib/api/services";
import { safeNext, useAuth } from "@/lib/auth/auth-context";

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

    if (step === "pseudo") {
        return (
            <AuthCard
                title="Choisissez un pseudo"
                subtitle="Une seule fois : il sera affiché au barbier avec vos rendez-vous."
            >
                <PseudoForm initial={user?.pseudo ?? ""} onDone={refreshUser} />
            </AuthCard>
        );
    }

    return (
        <AuthCard
            title="Connexion"
            subtitle="Pas de mot de passe : recevez un code sur WhatsApp. Votre compte est créé automatiquement."
        >
            <WhatsappLogin onSuccess={onSuccess} />
        </AuthCard>
    );
}

export default function LoginPage() {
    return (
        <Suspense>
            <LoginContent />
        </Suspense>
    );
}
