"use client";

import { useCallback, useState } from "react";
import type { FormEvent } from "react";
import { toast } from "sonner";
import { DataTable, formatDate, Pill, usePaged, type Column } from "@/components/admin/data-table";
import { IconPlus } from "@/components/kx/icons";
import { ErrorBox, Field, Modal, PageHeader, Spinner, Toggle } from "@/components/kx/ui";
import { errorMessage } from "@/lib/api/client";
import { adminApi, type Role } from "@/lib/api/services";

type Draft = { id?: number; name: string; status: number; remark: string };

const PROTECTED = ["admin", "user"];

export default function AdminRolesPage() {
    const fetcher = useCallback((p: { page: number; size: number }) => adminApi.roles(p), []);
    const paged = usePaged(fetcher);
    const [draft, setDraft] = useState<Draft | null>(null);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function save(e: FormEvent) {
        e.preventDefault();
        if (!draft) return;
        setSaving(true);
        setError(null);
        const body = { name: draft.name.trim(), status: draft.status, remark: draft.remark || null };
        try {
            if (draft.id) await adminApi.updateRole(draft.id, body);
            else await adminApi.createRole(body);
            toast.success(draft.id ? "Rôle modifié" : "Rôle créé");
            setDraft(null);
            await paged.reload();
        } catch (err) {
            setError(errorMessage(err));
        } finally {
            setSaving(false);
        }
    }

    async function remove(role: Role) {
        if (!window.confirm(`Supprimer le rôle « ${role.name} » ?`)) return;
        try {
            await adminApi.deleteRoles([role.id]);
            toast.success("Rôle supprimé");
            await paged.reload();
        } catch (err) {
            toast.error(errorMessage(err));
        }
    }

    const columns: Column<Role>[] = [
        { header: "Nom", cell: r => <span className="font-medium">{r.name}</span> },
        { header: "Statut", cell: r => <Pill tone={r.status ? "ok" : "gray"}>{r.status ? "Actif" : "Désactivé"}</Pill> },
        { header: "Note", cell: r => r.remark || "—" },
        { header: "Créé le", cell: r => <span className="whitespace-nowrap text-kx-muted">{formatDate(r.created_time)}</span> },
        {
            header: "Actions",
            className: "text-right",
            cell: r => (
                <div className="flex justify-end gap-2">
                    <button
                        type="button"
                        className="btn-ghost btn-sm"
                        onClick={() => {
                            setError(null);
                            setDraft({ id: r.id, name: r.name, status: r.status, remark: r.remark ?? "" });
                        }}
                    >
                        Modifier
                    </button>
                    {!PROTECTED.includes(r.name) && (
                        <button type="button" className="btn-danger btn-sm" onClick={() => remove(r)}>
                            Supprimer
                        </button>
                    )}
                </div>
            ),
        },
    ];

    return (
        <>
            <PageHeader
                title="Rôles"
                sub="Le rôle admin donne accès au tableau de bord du barbier."
                actions={
                    <button
                        type="button"
                        className="btn"
                        onClick={() => {
                            setError(null);
                            setDraft({ name: "", status: 1, remark: "" });
                        }}
                    >
                        <IconPlus className="h-4 w-4" /> Nouveau rôle
                    </button>
                }
            />
            <DataTable columns={columns} paged={paged} empty="Aucun rôle." />

            <Modal open={draft !== null} onClose={() => setDraft(null)} title={draft?.id ? "Modifier le rôle" : "Nouveau rôle"}>
                {draft && (
                    <form onSubmit={save} className="space-y-4">
                        <Field label="Nom" htmlFor="role-name">
                            <input
                                id="role-name"
                                className="input"
                                value={draft.name}
                                onChange={e => setDraft({ ...draft, name: e.target.value })}
                                required
                                disabled={!!draft.id && PROTECTED.includes(draft.name)}
                            />
                        </Field>
                        <Field label="Note" htmlFor="role-remark">
                            <input id="role-remark" className="input" value={draft.remark} onChange={e => setDraft({ ...draft, remark: e.target.value })} />
                        </Field>
                        <label className="flex items-center gap-3 text-sm font-medium">
                            <Toggle checked={draft.status === 1} onChange={v => setDraft({ ...draft, status: v ? 1 : 0 })} label="Actif" /> Actif
                        </label>
                        <ErrorBox message={error} />
                        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                            <button type="button" className="btn-ghost" onClick={() => setDraft(null)}>
                                Annuler
                            </button>
                            <button type="submit" className="btn" disabled={saving}>
                                {saving && <Spinner />} Enregistrer
                            </button>
                        </div>
                    </form>
                )}
            </Modal>
        </>
    );
}
