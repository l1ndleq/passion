export const WAITLIST_STATS_PREFIX = "waitlist:stats:";
export const WAITLIST_INDEX_KEY = "waitlist:index";
export const WAITLIST_ENTRY_PREFIX = "waitlist:entry:";
export const WAITLIST_PENDING_TG_PREFIX = "waitlist:pending_tg:";

export type WaitlistSource = "home" | "catalog";
export type WaitlistChannel = "telegram" | "email";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;
const TG_USERNAME_RE = /^[a-zA-Z][a-zA-Z0-9_]{4,31}$/;

export function parseWaitlistSource(raw: unknown): WaitlistSource | null {
  return raw === "home" || raw === "catalog" ? raw : null;
}

export function parseWaitlistChannel(raw: unknown): WaitlistChannel | null {
  return raw === "telegram" || raw === "email" ? raw : null;
}

export function normalizeWaitlistEmail(raw: unknown) {
  const email = String(raw || "").trim().toLowerCase();
  if (!EMAIL_RE.test(email)) return null;
  return email;
}

export function normalizeWaitlistTelegram(raw: unknown) {
  let value = String(raw || "").trim();
  if (!value) return null;

  value = value.replace(/^https?:\/\/t\.me\//i, "");
  value = value.replace(/^@+/, "");
  value = value.split(/[/?#]/, 1)[0] || "";

  if (!TG_USERNAME_RE.test(value)) return null;
  return `@${value.toLowerCase()}`;
}

export function waitlistEntryKey(entryId: string) {
  return `${WAITLIST_ENTRY_PREFIX}${entryId}`;
}

export function waitlistStatKey(field: string) {
  return `${WAITLIST_STATS_PREFIX}${field}`;
}

export function waitlistPendingTelegramKey(username: string) {
  return `${WAITLIST_PENDING_TG_PREFIX}${String(username || "").trim().toLowerCase()}`;
}
