export type UserProfile = {
  name?: string;
  phone?: string;
  telegram?: string;
  city?: string;
  address?: string;
};

const KEY = "passion_user_profile_v1";

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
  return safeParse<UserProfile>(window.localStorage.getItem(KEY));
}

export function setUserProfile(profile: UserProfile) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(profile));
}

export function mergeUserProfile(next: UserProfile) {
  const prev = getUserProfile() ?? {};
  setUserProfile({ ...prev, ...next });
}
