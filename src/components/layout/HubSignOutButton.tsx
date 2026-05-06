"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { clearSentryUser } from "@/lib/observability/sentryUser";
import { createClient } from "@/lib/supabase/client";

export default function HubSignOutButton() {
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createClient();
    clearSentryUser();
    await supabase.auth.signOut();
    router.push("/");
  }

  return (
    <button
      type="button"
      onClick={handleSignOut}
      className="rounded-lg p-2 text-reca-100 transition-colors hover:bg-white/10"
      aria-label="Cerrar sesión"
    >
      <LogOut className="h-4 w-4" />
    </button>
  );
}
