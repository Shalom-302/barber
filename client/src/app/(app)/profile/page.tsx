"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { toast } from "sonner";
import { FieldLabel, FormError } from "@/components/auth/auth-card";
import { PageHeader } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { errorMessage } from "@/lib/api/client";
import { authApi } from "@/lib/api/services";
import { useAuth } from "@/lib/auth/auth-context";
import { formatPhone } from "@/lib/barber/format";

export default function ProfilePage() {
    const { user, refreshUser } = useAuth();
    const [pseudo, setPseudo] = useState("");
    const [firstname, setFirstname] = useState("");
    const [lastname, setLastname] = useState("");
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        setPseudo(user?.pseudo ?? "");
        setFirstname(user?.firstname ?? "");
        setLastname(user?.lastname ?? "");
    }, [user]);

    async function save(e: FormEvent) {
        e.preventDefault();
        setError(null);
        setSaving(true);
        try {
            const data: { firstname: string; lastname: string; pseudo?: string } = { firstname, lastname };
            if (pseudo.trim() && pseudo.trim() !== user?.pseudo) data.pseudo = pseudo.trim();
            await authApi.updateMe(data);
            await refreshUser();
            toast.success("Profil mis à jour");
        } catch (err) {
            setError(errorMessage(err));
        } finally {
            setSaving(false);
        }
    }

    return (
        <>
            <PageHeader title="Profil" description="Vos informations." />
            <form
                onSubmit={save}
                className="max-w-xl space-y-5 rounded-xl border border-secondary bg-primary p-6 shadow-xs"
            >
                <div>
                    <FieldLabel htmlFor="pseudo">Pseudo</FieldLabel>
                    <Input
                        id="pseudo"
                        value={pseudo}
                        onChange={e => setPseudo(e.target.value)}
                        minLength={3}
                        maxLength={30}
                        size="md"
                    />
                </div>
                <div className="grid gap-5 sm:grid-cols-2">
                    <div>
                        <FieldLabel htmlFor="firstname">Prénom</FieldLabel>
                        <Input
                            id="firstname"
                            value={firstname}
                            onChange={e => setFirstname(e.target.value)}
                            maxLength={80}
                            size="md"
                        />
                    </div>
                    <div>
                        <FieldLabel htmlFor="lastname">Nom</FieldLabel>
                        <Input
                            id="lastname"
                            value={lastname}
                            onChange={e => setLastname(e.target.value)}
                            maxLength={80}
                            size="md"
                        />
                    </div>
                </div>
                <div>
                    <FieldLabel htmlFor="phone">Numéro WhatsApp</FieldLabel>
                    <Input id="phone" value={formatPhone(user?.phone)} disabled size="md" />
                    <p className="mt-1.5 text-sm text-tertiary">
                        C&apos;est votre identifiant de connexion : il ne peut pas être modifié.
                    </p>
                </div>
                <FormError message={error} />
                <Button type="submit" size="md" isLoading={saving}>
                    Enregistrer
                </Button>
            </form>
        </>
    );
}
