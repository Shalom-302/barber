import { redirect } from "next/navigation";

// Light theme only (Kortex design): the former appearance page now lives in the profile.
export default function SettingsPage() {
    redirect("/profile");
}
