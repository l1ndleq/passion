export type UserProfile = {
  name?: string;
  phone?: string;
  telegram?: string;
  city?: string;
  address?: string;
};

const KEY = "passion_user_profile_v1";

function sanitizeProfile(input: UserProfile | null | undefined): UserProfile {
  const name = String(input?.name ?? "").trim().slice(0, 80);
  return name ? { name } : {};
}

function safeParse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function getUserProfile(): UserProfile | null {
  if (typeof window === "undefined") return null;
  const raw = safeParse<UserProfile>(window.localStorage.getItem(KEY));
  const sanitized = sanitizeProfile(raw);
  try {
    window.localStorage.setItem(KEY, JSON.stringify(sanitized));
  } catch {}
  return sanitized;
}

export function setUserProfile(profile: UserProfile) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(sanitizeProfile(profile)));
}

export function mergeUserProfile(next: UserProfile) {
  const prev = sanitizeProfile(getUserProfile());
  setUserProfile({ ...prev, ...sanitizeProfile(next) });
}
