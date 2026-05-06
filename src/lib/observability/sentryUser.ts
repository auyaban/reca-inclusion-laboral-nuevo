import * as Sentry from "@sentry/nextjs";

type SentryUser = {
  id: string;
  email?: string;
  username?: string;
};

type SentrySetUser = (user: SentryUser | null) => void;

type SentryUserInput = {
  authUserId?: string | null;
  email?: string | null;
  usuarioLogin?: string | null;
};

function readNonEmptyString(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function getSetUser() {
  const maybeSetUser = (Sentry as { setUser?: unknown }).setUser;
  return typeof maybeSetUser === "function"
    ? (maybeSetUser as SentrySetUser)
    : null;
}

function safeSetUser(user: SentryUser | null) {
  try {
    getSetUser()?.(user);
  } catch {
    // Sentry context should improve observability, never block app usage.
  }
}

export function setAuthenticatedSentryUser(input: SentryUserInput) {
  const authUserId = readNonEmptyString(input.authUserId);
  if (!authUserId) {
    clearSentryUser();
    return;
  }

  const user: SentryUser = {
    id: authUserId,
  };
  const email = readNonEmptyString(input.email);
  const username = readNonEmptyString(input.usuarioLogin);

  if (email) {
    user.email = email;
  }

  if (username) {
    user.username = username;
  }

  safeSetUser(user);
}

export function clearSentryUser() {
  safeSetUser(null);
}
