"use client";

// Choose a pseudo (required before the first booking). Rules are enforced by the
// API (3-30 characters, unique ignoring case): its message is shown as is.
import { useState } from "react";
import type { FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { errorMessage } from "@/lib/api/client";
import { authApi } from "@/lib/api/services";
import { FieldLabel, FormError } from "./auth-card";

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
                <FieldLabel htmlFor="pseudo">Votre pseudo</FieldLabel>
                <Input
                    id="pseudo"
                    value={pseudo}
                    onChange={e => setPseudo(e.target.value)}
                    placeholder="Ex. Koffi225"
                    autoComplete="nickname"
                    minLength={3}
                    maxLength={30}
                    required
                    autoFocus
                    size="md"
                />
                <p className="mt-1.5 text-sm text-tertiary">
                    C&apos;est le nom que verra le barbier. 3 à 30 caractères.
                </p>
            </div>
            <FormError message={error} />
            <Button type="submit" size="lg" className="w-full" isLoading={loading}>
                Continuer
            </Button>
        </form>
    );
}
