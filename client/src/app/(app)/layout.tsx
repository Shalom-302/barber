"use client";

// Authenticated area: clients get the light client shell, the barber
// (/admin/*) gets the dashboard shell. Anonymous visitors go to the login page.
import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AdminShell } from "@/components/kx/admin-shell";
import { ClientShell } from "@/components/kx/client-shell";
import { Spinner } from "@/components/kx/ui";
import { useAuth } from "@/lib/auth/auth-context";

export default function AppLayout({ children }: { children: React.ReactNode }) {
    const { isAuthenticated, loading } = useAuth();
    const router = useRouter();
    const path = usePathname();

    useEffect(() => {
        if (!loading && !isAuthenticated) router.replace(`/auth/login?next=${encodeURIComponent(path)}`);
    }, [loading, isAuthenticated, path, router]);

    if (loading || !isAuthenticated) {
        return (
            <div className="grid min-h-screen place-items-center bg-kx-bg">
                <Spinner className="h-6 w-6" />
            </div>
        );
    }
    if (path.startsWith("/admin")) return <AdminShell>{children}</AdminShell>;
    return <ClientShell>{children}</ClientShell>;
}
