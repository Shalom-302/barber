import type { Metadata, Viewport } from "next";
import { Anton, Outfit, Roboto_Flex } from "next/font/google";
import { Toaster } from "sonner";
import { siteConfig } from "@/config/site";
import { AuthProvider } from "@/lib/auth/auth-context";
import "../styles/globals.css";

const display = Outfit({ subsets: ["latin"], variable: "--font-outfit", display: "swap" });
const body = Roboto_Flex({ subsets: ["latin"], variable: "--font-roboto-flex", display: "swap" });
const barber = Anton({ weight: "400", subsets: ["latin"], variable: "--font-barber", display: "swap" });

export const metadata: Metadata = {
    title: { default: siteConfig.name, template: `%s · ${siteConfig.name}` },
    description: siteConfig.description,
};

export const viewport: Viewport = {
    themeColor: "#0a0a0a",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
    return (
        <html lang={siteConfig.locale} className={`${display.variable} ${body.variable} ${barber.variable} scroll-smooth`}>
            <body className="antialiased">
                <AuthProvider>
                    <Toaster
                        position="top-center"
                        toastOptions={{
                            classNames: {
                                toast: "!rounded-2xl !border-kx-border !font-sans !shadow-card",
                            },
                        }}
                    />
                    {children}
                </AuthProvider>
            </body>
        </html>
    );
}
