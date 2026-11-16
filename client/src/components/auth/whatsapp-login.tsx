"use client";

// Passwordless login: WhatsApp number -> one-time code -> session.
// Adapted from the Foody implementation. Ivorian numbers: the current 10-digit
// numbering (07 01 02 03 04) is accepted as typed; the API normalizes it.
import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { OTPInput } from "input-otp";
import { IconArrow, IconArrowLeft, IconWhatsapp } from "@/components/kx/icons";
import { ErrorBox, Spinner } from "@/components/kx/ui";
import { errorMessage } from "@/lib/api/client";
import { authApi, type LoginResult } from "@/lib/api/services";
import { formatPhone } from "@/lib/barber/format";
import { cn } from "@/lib/utils/cn";

const CODE_LENGTH = 6;

export function WhatsappLogin({ onSuccess }: { onSuccess: (result: LoginResult) => void }) {
    const [step, setStep] = useState<"phone" | "code">("phone");
    const [phone, setPhone] = useState("");
    const [normalized, setNormalized] = useState("");
    const [code, setCode] = useState("");
    const [resendIn, setResendIn] = useState(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const phoneRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (resendIn <= 0) return;
        const t = setTimeout(() => setResendIn(s => s - 1), 1000);
        return () => clearTimeout(t);
    }, [resendIn]);

    useEffect(() => {
        if (step === "phone") phoneRef.current?.focus();
    }, [step]);

    async function sendCode(e?: FormEvent) {
        e?.preventDefault();
        setError(null);
        setLoading(true);
        try {
            const res = await authApi.requestOtp(phone);
            setNormalized(res.phone);
            setResendIn(res.resend_in);
            setCode("");
            setStep("code");
        } catch (err) {
            setError(errorMessage(err));
        } finally {
            setLoading(false);
        }
    }

    async function verify(value: string) {
        if (value.length !== CODE_LENGTH || loading) return;
        setError(null);
        setLoading(true);
        try {
            onSuccess(await authApi.verifyOtp(normalized || phone, value));
        } catch (err) {
            setError(errorMessage(err));
            setCode("");
        } finally {
            setLoading(false);
        }
    }

    if (step === "phone") {
        return (
            <form onSubmit={sendCode} className="space-y-5">
                <div>
                    <label className="label" htmlFor="phone">
                        Numéro WhatsApp
                    </label>
                    <div className="flex items-stretch gap-2">
                        <span className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-kx-border bg-kx-panel2 px-3 text-sm font-semibold">
                            🇨🇮 +225
                        </span>
                        <input
                            ref={phoneRef}
                            id="phone"
                            type="tel"
                            inputMode="tel"
                            autoComplete="tel"
                            placeholder="07 01 02 03 04"
                            value={phone}
                            onChange={e => setPhone(e.target.value)}
                            required
                            className="input py-3.5 text-lg tracking-wide sm:text-base"
                        />
                    </div>
                    <p className="hint">Nouvelle numérotation à 10 chiffres. Autre pays : tapez l’indicatif (+33…).</p>
                </div>
                <ErrorBox message={error} />
                <button type="submit" className="btn btn-lg w-full" disabled={loading || phone.trim().length < 8}>
                    {loading ? <Spinner /> : <IconWhatsapp className="h-5 w-5" />} Recevoir mon code
                </button>
            </form>
        );
    }

    return (
        <div className="space-y-5">
            <p className="text-sm text-kx-muted">
                Code à {CODE_LENGTH} chiffres envoyé sur WhatsApp au{" "}
                <b className="whitespace-nowrap text-kx-text">{formatPhone(normalized)}</b>.
            </p>
            <OTPInput
                maxLength={CODE_LENGTH}
                value={code}
                onChange={value => {
                    setCode(value);
                    if (value.length === CODE_LENGTH) void verify(value);
                }}
                autoFocus
                disabled={loading}
                inputMode="numeric"
                pattern="^[0-9]*$"
                autoComplete="one-time-code"
                containerClassName="flex justify-between gap-2"
                render={({ slots }) => (
                    <>
                        {slots.map((s, i) => (
                            <div
                                key={i}
                                className={cn(
                                    "relative grid h-14 flex-1 place-items-center rounded-xl border bg-white font-display text-2xl font-semibold transition sm:h-16",
                                    s.isActive ? "border-black ring-4 ring-black/5" : "border-kx-border"
                                )}
                            >
                                {s.char}
                                {s.hasFakeCaret && <span className="absolute h-6 w-px animate-pulse bg-black" />}
                            </div>
                        ))}
                    </>
                )}
            />
            <ErrorBox message={error} />
            <button type="button" className="btn btn-lg w-full" disabled={loading || code.length !== CODE_LENGTH} onClick={() => verify(code)}>
                {loading ? <Spinner /> : <IconArrow className="h-5 w-5" />} Se connecter
            </button>
            <div className="flex items-center justify-between text-sm">
                <button
                    type="button"
                    className="inline-flex items-center gap-1.5 font-medium text-kx-muted hover:text-black"
                    onClick={() => {
                        setStep("phone");
                        setError(null);
                    }}
                >
                    <IconArrowLeft className="h-4 w-4" /> Modifier le numéro
                </button>
                <button
                    type="button"
                    disabled={resendIn > 0 || loading}
                    className="font-semibold underline decoration-black/25 underline-offset-4 hover:decoration-black disabled:text-kx-muted disabled:no-underline"
                    onClick={() => sendCode()}
                >
                    {resendIn > 0 ? `Renvoyer dans ${resendIn} s` : "Renvoyer le code"}
                </button>
            </div>
        </div>
    );
}
