"use client";

// Choose a pseudo (required before the first booking). Rules are enforced by the
// API (3-30 characters, unique ignoring case): its message is shown as is.
import { useState } from "react";
import type { FormEvent } from "react";
import { IconArrow } from "@/components/kx/icons";
import { ErrorBox, Spinner } from "@/components/kx/ui";
import { errorMessage } from "@/lib/api/client";
import { authApi } from "@/lib/api/services";

export function PseudoForm({ initial = "", onDone }: { initial?: string; onDone: () => void | Promise<void> }) {
    const [pseudo, setPseudo] = useState(initial);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function submit(e: FormEvent) {
        e.preventDefault();
        setError(null);
        setLoading(true);
        try {
            await authApi.updateMe({ pseudo: pseudo.trim() });
            await onDone();
        } catch (err) {
            setError(errorMessage(err));
        } finally {
            setLoading(false);
        }
    }

    return (
        <form onSubmit={submit} className="space-y-5">
            <div>
                <label className="label" htmlFor="pseudo">
                    Votre pseudo
                </label>
                <input
                    id="pseudo"
                    className="input py-3.5 text-lg sm:text-base"
                    value={pseudo}
                    onChange={e => setPseudo(e.target.value)}
                    placeholder="Ex. Koffi225"
                    autoComplete="nickname"
                    minLength={3}
                    maxLength={30}
                    required
                    autoFocus
                />
                <p className="hint">C’est le nom que verra le barbier. 3 à 30 caractères.</p>
            </div>
            <ErrorBox message={error} />
            <button type="submit" className="btn btn-lg w-full" disabled={loading || pseudo.trim().length < 3}>
                {loading ? <Spinner /> : <IconArrow className="h-5 w-5" />} Continuer
            </button>
        </form>
    );
}
