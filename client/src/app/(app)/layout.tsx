"use client";

// Authenticated area: one sidebar shell for clients and the barber (/admin/*). Anonymous visitors go to the login page.
import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AppShell } from "@/components/kx/app-shell";
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
    return <AppShell>{children}</AppShell>;
}
