"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { CardCustom as Card } from "@/components/ui/card";
import { Palette, Sun, Moon, Monitor } from "lucide-react";
import { cn } from "@/lib/utils/cn";

type ThemeOption = "light" | "dark" | "system";

interface ThemeCardProps {
    theme: ThemeOption;
    currentTheme: string | undefined;
    onSelect: (theme: ThemeOption) => void;
    icon: React.ReactNode;
    label: string;
    description: string;
}

function ThemeCard({ theme, currentTheme, onSelect, icon, label, description }: ThemeCardProps) {
    const isSelected = currentTheme === theme;
    
    return (
        <button
            onClick={() => onSelect(theme)}
            className={cn(
                "flex flex-col items-center p-6 rounded-xl border-2 transition-all",
                "hover:border-brand-500 hover:bg-brand-50 dark:hover:bg-brand-900/20",
                isSelected
                    ? "border-brand-500 bg-brand-50 dark:bg-brand-900/20"
                    : "border-secondary bg-primary"
            )}
        >
            <div
                className={cn(
                    "p-4 rounded-full mb-3 transition-colors",
                    isSelected
                        ? "bg-brand-500 text-white"
                        : "bg-secondary text-tertiary"
                )}
            >
                {icon}
            </div>
            <p className="font-medium">{label}</p>
            <p className="text-sm text-tertiary text-center mt-1">{description}</p>
        </button>
    );
}

export default function AppearanceSettings() {
    const { theme, setTheme } = useTheme();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) {
        return (
            <Card.Root>
                <Card.Header>
                    <Card.Title className="flex items-center gap-2">
                        <Palette className="h-5 w-5" />
                        Apparence
                    </Card.Title>
                    <Card.Description>
                        Personnalisez l’apparence de l’application
                    </Card.Description>
                </Card.Header>
                <Card.Content>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="h-32 rounded-xl border-2 border-secondary bg-secondary/50 animate-pulse" />
                        <div className="h-32 rounded-xl border-2 border-secondary bg-secondary/50 animate-pulse" />
                        <div className="h-32 rounded-xl border-2 border-secondary bg-secondary/50 animate-pulse" />
                    </div>
                </Card.Content>
            </Card.Root>
        );
    }

    return (
        <Card.Root>
            <Card.Header>
                <Card.Title className="flex items-center gap-2">
                    <Palette className="h-5 w-5" />
                    Apparence
                </Card.Title>
                <Card.Description>
                    Personnalisez l’apparence de l’application
                </Card.Description>
            </Card.Header>
            <Card.Content>
                <div className="space-y-6">
                    <div>
                        <h3 className="text-sm font-medium text-secondary mb-4">Thème</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <ThemeCard
                                theme="light"
                                currentTheme={theme}
                                onSelect={setTheme}
                                icon={<Sun className="h-6 w-6" />}
                                label="Clair"
                                description="Un thème lumineux pour la journée"
                            />
                            <ThemeCard
                                theme="dark"
                                currentTheme={theme}
                                onSelect={setTheme}
                                icon={<Moon className="h-6 w-6" />}
                                label="Sombre"
                                description="Un thème sombre, reposant pour les yeux"
                            />
                            <ThemeCard
                                theme="system"
                                currentTheme={theme}
                                onSelect={setTheme}
                                icon={<Monitor className="h-6 w-6" />}
                                label="Système"
                                description="Suit les réglages de l’appareil"
                            />
                        </div>
                    </div>
                </div>
            </Card.Content>
        </Card.Root>
    );
}
