import { redirect } from "next/navigation";

// BARBER uses WhatsApp only: the account is created at the first WhatsApp login.
// (The email form component is kept in components/auth/email-login.tsx.)
export default function RegisterPage() {
    redirect("/auth/login");
}
