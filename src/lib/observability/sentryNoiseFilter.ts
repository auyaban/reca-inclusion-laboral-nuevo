import type { Event } from "@sentry/nextjs";

const KNOWN_BROWSER_EXTENSION_NOISE_PATTERNS = [
  /(^|[\W_])__firefox__([\W_]|$)/i,
  /window\.ethereum\.selectedAddress\s*=\s*undefined/i,
];

function collectEventTexts(event: Event) {
  const texts = new Set<string>();

  if (typeof event.message === "string" && event.message.trim()) {
    texts.add(event.message.trim());
  }

  const logEntryMessage = event.logentry?.message;
  if (typeof logEntryMessage === "string" && logEntryMessage.trim()) {
    texts.add(logEntryMessage.trim());
  }

  for (const exception of event.exception?.values ?? []) {
    if (typeof exception.type === "string" && exception.type.trim()) {
      texts.add(exception.type.trim());
    }

    if (typeof exception.value === "string" && exception.value.trim()) {
      texts.add(exception.value.trim());
    }

    if (
      typeof exception.type === "string" &&
      exception.type.trim() &&
      typeof exception.value === "string" &&
      exception.value.trim()
    ) {
      texts.add(`${exception.type.trim()}: ${exception.value.trim()}`);
    }
  }

  return [...texts];
}

export function isKnownClientSentryNoiseEvent(event: Event) {
  const eventTexts = collectEventTexts(event);

  return KNOWN_BROWSER_EXTENSION_NOISE_PATTERNS.some((pattern) =>
    eventTexts.some((text) => pattern.test(text))
  );
}

export function filterKnownClientSentryNoiseEvent(event: Event) {
  return isKnownClientSentryNoiseEvent(event) ? null : event;
}
