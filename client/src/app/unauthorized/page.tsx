import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function UnauthorizedPage() {
    return (
        <div className="flex min-h-screen items-center justify-center bg-secondary px-4">
            <div className="w-full max-w-md rounded-xl border border-secondary bg-primary p-8 text-center shadow-sm">
                <h1 className="text-display-xs font-semibold text-primary">Accès refusé</h1>
                <p className="mt-2 text-md text-tertiary">
                    Cette page est réservée au barbier.
                </p>
                <Button asChild size="md" className="mt-6">
                    <Link href="/mes-rendez-vous">Mes rendez-vous</Link>
                </Button>
            </div>
        </div>
    );
}
