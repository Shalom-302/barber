// Central app configuration: name, branding and navigation.
import type { ComponentType } from "react";
import {
    Home01,
    User01,
    Users01,
    ShieldTick,
    ClipboardCheck,
    BarChartSquare02,
    Calendar,
    CalendarCheck01,
    Scissors01,
    Clock,
    Settings01,
    MessageNotificationCircle,
    UsersRight,
} from "@untitled-ui/icons-react";

export type NavItem = {
    name: string;
    href: string;
    icon: ComponentType<{ className?: string }>;
};

export const siteConfig = {
    name: "Barber",
    description: "Réservez votre barbier à domicile à Abidjan, confirmation sur WhatsApp.",
    locale: "fr",
    // API path, served on the same origin and proxied by the Next server.
    apiBasePath: "/admin/api/v1",
    nav: {
        user: [
            { name: "Accueil", href: "/", icon: Home01 },
            { name: "Réserver", href: "/reserver", icon: Calendar },
            { name: "Mes rendez-vous", href: "/mes-rendez-vous", icon: CalendarCheck01 },
            { name: "Profil", href: "/profile", icon: User01 },
        ] satisfies NavItem[],
        admin: [
            { name: "Tableau de bord", href: "/admin", icon: BarChartSquare02 },
            { name: "Réservations", href: "/admin/reservations", icon: CalendarCheck01 },
            { name: "Clients", href: "/admin/clients", icon: UsersRight },
            { name: "Prestations", href: "/admin/prestations", icon: Scissors01 },
            { name: "Disponibilités", href: "/admin/disponibilites", icon: Clock },
            { name: "Réglages", href: "/admin/reglages", icon: Settings01 },
            { name: "Notifications", href: "/admin/notifications", icon: MessageNotificationCircle },
        ] satisfies NavItem[],
        system: [
            { name: "Utilisateurs", href: "/admin/users", icon: Users01 },
            { name: "Rôles", href: "/admin/roles", icon: ShieldTick },
            { name: "Journaux", href: "/admin/logs", icon: ClipboardCheck },
        ] satisfies NavItem[],
    },
};
