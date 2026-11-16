import Link from "next/link";
import { IconShield, Logo } from "@/components/kx/icons";

export default function UnauthorizedPage() {
    return (
        <div className="grid min-h-screen place-items-center bg-kx-bg px-4">
            <div className="w-full max-w-md text-center">
                <div className="mb-8 flex justify-center">
                    <Logo />
                </div>
                <div className="card sm:p-10">
                    <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-kx-panel2">
                        <IconShield className="h-6 w-6" />
                    </span>
                    <h1 className="mt-5 font-display text-2xl font-semibold">Accès réservé au barbier</h1>
                    <p className="mt-2 text-kx-muted">Cette page fait partie du tableau de bord du barbier.</p>
                    <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
                        <Link href="/mes-rendez-vous" className="btn">Mes rendez-vous</Link>
                        <Link href="/" className="btn-ghost">Accueil</Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
