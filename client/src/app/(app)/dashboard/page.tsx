"use client";

// Kept for old links: clients go to their bookings, the barber to the dashboard.
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/auth-context";

export default function DashboardRedirect() {
    const { isAdmin } = useAuth();
    const router = useRouter();
    useEffect(() => {
        router.replace(isAdmin ? "/admin" : "/mes-rendez-vous");
    }, [isAdmin, router]);
    return null;
}
