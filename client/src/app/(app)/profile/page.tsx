"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { toast } from "sonner";
import { IconLogout } from "@/components/kx/icons";
import { ErrorBox, Field, PageHeader, Spinner } from "@/components/kx/ui";
import { errorMessage } from "@/lib/api/client";
import { authApi } from "@/lib/api/services";
import { useAuth } from "@/lib/auth/auth-context";
import { formatPhone } from "@/lib/barber/format";

export default function ProfilePage() {
    const { user, refreshUser, logout } = useAuth();
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
        <div className="max-w-2xl">
            <PageHeader title="Profil" sub="Vos informations visibles par le barbier." />
            <form onSubmit={save} className="card space-y-5">
                <Field label="Pseudo" htmlFor="pseudo" hint="3 à 30 caractères, unique.">
                    <input id="pseudo" className="input" value={pseudo} onChange={e => setPseudo(e.target.value)} minLength={3} maxLength={30} />
                </Field>
                <div className="grid gap-5 sm:grid-cols-2">
                    <Field label="Prénom" htmlFor="firstname">
                        <input id="firstname" className="input" value={firstname} onChange={e => setFirstname(e.target.value)} maxLength={80} />
                    </Field>
                    <Field label="Nom" htmlFor="lastname">
                        <input id="lastname" className="input" value={lastname} onChange={e => setLastname(e.target.value)} maxLength={80} />
                    </Field>
                </div>
                <Field label="Numéro WhatsApp" htmlFor="phone" hint="C’est votre identifiant de connexion : il ne peut pas être modifié.">
                    <input id="phone" className="input" value={formatPhone(user?.phone)} disabled />
                </Field>
                <ErrorBox message={error} />
                <button type="submit" className="btn" disabled={saving}>
                    {saving && <Spinner />} Enregistrer
                </button>
            </form>
            <button type="button" onClick={logout} className="btn-ghost mt-6">
                <IconLogout className="h-4 w-4" /> Se déconnecter
            </button>
        </div>
    );
}
