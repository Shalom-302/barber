// Minimal stroke icons (24px grid, currentColor), Kortex style. No icon dependency.
import { BRAND_NAME } from "@/config/brand";

type P = { className?: string };
const base = (d: React.ReactNode, className = "h-5 w-5") => (
    <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
        aria-hidden="true"
    >
        {d}
    </svg>
);

export const IconHome = ({ className }: P) => base(<><path d="M3 10.5 12 3l9 7.5" /><path d="M5 9.5V21h14V9.5" /></>, className);
export const IconScissors = ({ className }: P) =>
    base(<><circle cx="6" cy="6" r="3" /><circle cx="6" cy="18" r="3" /><path d="M20 4 8.1 15.9M14.5 14.5 20 20M8.1 8.1 12 12" /></>, className);
export const IconCalendar = ({ className }: P) =>
    base(<><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 10h18" /></>, className);
export const IconCalendarCheck = ({ className }: P) =>
    base(<><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 10h18M9 15l2 2 4-4" /></>, className);
export const IconClock = ({ className }: P) => base(<><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>, className);
export const IconPin = ({ className }: P) =>
    base(<><path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21Z" /><circle cx="12" cy="9.5" r="2.5" /></>, className);
export const IconPhone = ({ className }: P) =>
    base(<path d="M5 4h3l2 5-2.5 1.5a11 11 0 0 0 6 6L15 14l5 2v3a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2Z" />, className);
export const IconWhatsapp = ({ className }: P) =>
    base(<><path d="M3.5 20.5 5 16a8.5 8.5 0 1 1 3 3Z" /><path d="M9 9.5c.3 2 2.5 4.2 4.5 4.5l1.3-1.1 1.7.9c-.3 1.1-1.1 1.7-2.2 1.7C11 15.5 8.5 13 8.5 9.7c0-1.1.6-1.9 1.7-2.2l.9 1.7Z" /></>, className);
export const IconUser = ({ className }: P) => base(<><circle cx="12" cy="8" r="4" /><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" /></>, className);
export const IconUsers = ({ className }: P) =>
    base(<><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20c1.2-3.4 3.7-5 6.5-5s5.3 1.6 6.5 5" /><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 15c2 .6 3 2.2 3.5 5" /></>, className);
export const IconLogout = ({ className }: P) => base(<><path d="M15 4h4v16h-4" /><path d="M10 8l-4 4 4 4M6 12h10" /></>, className);
export const IconMenu = ({ className }: P) => base(<path d="M4 7h16M4 12h16M4 17h16" />, className);
export const IconClose = ({ className }: P) => base(<path d="M6 6l12 12M18 6 6 18" />, className);
export const IconCheck = ({ className }: P) => base(<path d="m5 12 5 5 9-10" />, className);
export const IconArrow = ({ className }: P) => base(<path d="M5 12h14m-6-6 6 6-6 6" />, className);
export const IconArrowLeft = ({ className }: P) => base(<path d="M19 12H5m6-6-6 6 6 6" />, className);
export const IconChevron = ({ className }: P) => base(<path d="m9 6 6 6-6 6" />, className);
export const IconList = ({ className }: P) => base(<path d="M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01" />, className);
export const IconSettings = ({ className }: P) =>
    base(<><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z" /></>, className);
export const IconBell = ({ className }: P) =>
    base(<><path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.9 1.9 0 0 0 3.4 0" /></>, className);
export const IconChart = ({ className }: P) => base(<path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />, className);
export const IconShield = ({ className }: P) =>
    base(<><path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z" /><path d="m9 12 2 2 4-4" /></>, className);
export const IconFile = ({ className }: P) =>
    base(<><path d="M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8Z" /><path d="M14 3v5h5M9 13h6M9 17h6" /></>, className);
export const IconPlus = ({ className }: P) => base(<path d="M12 5v14M5 12h14" />, className);
export const IconTrash = ({ className }: P) =>
    base(<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />, className);
export const IconSearch = ({ className }: P) => base(<><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></>, className);
export const IconExternal = ({ className }: P) => base(<path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />, className);
export const IconAlert = ({ className }: P) =>
    base(<><path d="M12 3 2 20h20Z" /><path d="M12 10v4M12 17h.01" /></>, className);

/** Kortex circuit mark + brand wordmark, all black (light surfaces). */
export function Logo({ size = "md", compact = false, inverted = false }: { size?: "md" | "lg"; compact?: boolean; inverted?: boolean }) {
    const h = size === "lg" ? "h-9" : compact ? "h-6 sm:h-7" : "h-7";
    return (
        <span className={`inline-flex items-center gap-2.5 ${inverted ? "text-white" : "text-black"}`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/kortex-logo.svg" alt="Kortex" className={`${h} w-auto ${inverted ? "invert" : ""}`} />
            <span
                className={`font-display font-semibold tracking-[0.2em] uppercase ${size === "lg" ? "text-base" : "text-xs sm:text-sm"} ${compact ? "hidden sm:inline" : ""}`}
            >
                {BRAND_NAME}
            </span>
        </span>
    );
}
