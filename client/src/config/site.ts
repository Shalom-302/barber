// Central app configuration: name, branding and navigation.
import type { ComponentType } from "react";
import { BRAND_NAME } from "./brand";
import {
    IconBell,
    IconCalendar,
    IconCalendarCheck,
    IconChart,
    IconClock,
    IconFile,
    IconHome,
    IconScissors,
    IconSettings,
    IconShield,
    IconUser,
    IconUsers,
} from "@/components/kx/icons";

export type NavItem = {
    name: string;
    href: string;
    icon: ComponentType<{ className?: string }>;
};

export const siteConfig = {
    name: BRAND_NAME,
    tagline: "Coiffure à domicile · Abidjan",
    description: "Réservez votre barbier à domicile à Abidjan, confirmation sur WhatsApp.",
    locale: "fr",
    // API path, served on the same origin and proxied by the Next server.
    apiBasePath: "/admin/api/v1",
    nav: {
        user: [
            { name: "Accueil", href: "/", icon: IconHome },
            { name: "Réserver", href: "/reserver", icon: IconCalendar },
            { name: "Rendez-vous", href: "/mes-rendez-vous", icon: IconCalendarCheck },
            { name: "Profil", href: "/profile", icon: IconUser },
        ] satisfies NavItem[],
        admin: [
            { name: "Tableau de bord", href: "/admin", icon: IconChart },
            { name: "Réservations", href: "/admin/reservations", icon: IconCalendarCheck },
            { name: "Clients", href: "/admin/clients", icon: IconUsers },
            { name: "Prestations", href: "/admin/prestations", icon: IconScissors },
            { name: "Disponibilités", href: "/admin/disponibilites", icon: IconClock },
            { name: "Réglages", href: "/admin/reglages", icon: IconSettings },
            { name: "Notifications", href: "/admin/notifications", icon: IconBell },
        ] satisfies NavItem[],
        system: [
            { name: "Utilisateurs", href: "/admin/users", icon: IconUser },
            { name: "Rôles", href: "/admin/roles", icon: IconShield },
            { name: "Journaux", href: "/admin/logs", icon: IconFile },
        ] satisfies NavItem[],
    },
};
