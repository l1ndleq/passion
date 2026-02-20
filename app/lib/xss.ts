const FORBIDDEN_URL_PROTOCOLS = new Set([
  "java" + "script:",
  "vbscript:",
  "data:",
  "file:",
]);

export function sanitizeImageSrc(raw: unknown, fallback: string) {
  const value = String(raw || "").trim();
  if (!value) return fallback;

  if (value.startsWith("/") && !value.startsWith("//")) return value;

  try {
    const url = new URL(value);
    const protocol = url.protocol.toLowerCase();
    if (FORBIDDEN_URL_PROTOCOLS.has(protocol)) return fallback;
    if (protocol !== "http:" && protocol !== "https:") return fallback;
    return value;
  } catch {
    return fallback;
  }
}

export function sanitizeTelegramUsername(raw: unknown) {
  const value = String(raw || "").trim().replace(/^@/, "");
  if (!/^[A-Za-z0-9_]{5,32}$/.test(value)) return "";
  return value;
}
