"use client";

import { useEffect } from "react";
import {
  clearSentryUser,
  setAuthenticatedSentryUser,
} from "@/lib/observability/sentryUser";
import { createClient } from "@/lib/supabase/client";

type HubSentryUserContextProps = {
  user: {
    authUserId?: string | null;
    email: string | null;
    usuarioLogin: string | null;
  };
};

export default function HubSentryUserContext({
  user,
}: HubSentryUserContextProps) {
  useEffect(() => {
    const authUserId = user.authUserId?.trim() || null;

    if (authUserId) {
      setAuthenticatedSentryUser({
        authUserId,
        email: user.email,
        usuarioLogin: user.usuarioLogin,
      });
    } else {
      clearSentryUser();
    }

    const supabase = createClient();
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      const sessionUserId = session?.user?.id ?? null;

      if (!authUserId || !sessionUserId || sessionUserId !== authUserId) {
        clearSentryUser();
        return;
      }

      setAuthenticatedSentryUser({
        authUserId,
        email: user.email,
        usuarioLogin: user.usuarioLogin,
      });
    });

    return () => {
      data.subscription.unsubscribe();
      clearSentryUser();
    };
  }, [user.authUserId, user.email, user.usuarioLogin]);

  return null;
}
