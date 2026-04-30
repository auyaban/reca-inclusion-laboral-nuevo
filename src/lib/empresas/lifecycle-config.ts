const LOCAL_ALERTS_FALLBACK = "9999-12-31T00:00:00.000Z";

export function getAssignmentAlertsStartAt() {
  const raw = process.env.E3_3_ASSIGNMENT_ALERTS_START_AT;
  if (!raw) {
    return LOCAL_ALERTS_FALLBACK;
  }

  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) {
    return LOCAL_ALERTS_FALLBACK;
  }

  return date.toISOString();
}
