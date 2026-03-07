import { redis } from "@/app/lib/redis";
import { hashOtp as hashOtpWithPhone } from "@/src/lib/otp";

const OTP_TTL_SECONDS = 5 * 60; // 5 минут
const OTP_RESEND_COOLDOWN_SECONDS = 60; // 60 сек между запросами
const OTP_MAX_ATTEMPTS = 5;
const hasRedisConfig = Boolean(
  String(process.env.UPSTASH_REDIS_REST_URL || "").trim() &&
  String(process.env.UPSTASH_REDIS_REST_TOKEN || "").trim()
);

type MemoryOtpRecord = {
  hash: string;
  attemptsLeft: number;
  createdAt: number;
  expiresAt: number;
};

const memoryOtp = new Map<string, MemoryOtpRecord>();
const memoryCooldown = new Map<string, number>();

function normalizePhone(raw: string) {
  let s = String(raw || "").trim().replace(/[^\d+]/g, "");

  // RU -> +7
  if (s.startsWith("8") && s.length === 11) s = "+7" + s.slice(1);
  if (s.startsWith("7") && s.length === 11) s = "+7" + s.slice(1);
  if (s.startsWith("9") && s.length === 10) s = "+7" + s;

  return s;
}

function otpKey(phone: string) {
  return `otp:${phone}`;
}
function otpCooldownKey(phone: string) {
  return `otp:cooldown:${phone}`;
}

function hashOtp(phone: string, code: string) {
  return hashOtpWithPhone(phone, code);
}

export async function requestOtp(rawPhone: string) {
  const phone = normalizePhone(rawPhone);
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 10 || digits.length > 15) throw new Error("PHONE_INVALID");

  if (!hasRedisConfig) {
    const now = Date.now();
    const cooldownUntil = Number(memoryCooldown.get(phone) || 0);
    if (cooldownUntil > now) throw new Error("OTP_TOO_SOON");

    const code = String(Math.floor(100000 + Math.random() * 900000));
    memoryOtp.set(phone, {
      hash: hashOtp(phone, code),
      attemptsLeft: OTP_MAX_ATTEMPTS,
      createdAt: now,
      expiresAt: now + OTP_TTL_SECONDS * 1000,
    });
    memoryCooldown.set(phone, now + OTP_RESEND_COOLDOWN_SECONDS * 1000);
    return { phone, code, ttlSeconds: OTP_TTL_SECONDS };
  }

  // cooldown
  const cooldown = await redis.get<number>(otpCooldownKey(phone));
  if (cooldown) throw new Error("OTP_TOO_SOON");

  const code = String(Math.floor(100000 + Math.random() * 900000)); // 6 цифр

  await redis.set(
    otpKey(phone),
    {
      hash: hashOtp(phone, code),
      attemptsLeft: OTP_MAX_ATTEMPTS,
      createdAt: Date.now(),
    },
    { ex: OTP_TTL_SECONDS }
  );

  await redis.set(otpCooldownKey(phone), 1, { ex: OTP_RESEND_COOLDOWN_SECONDS });

  return { phone, code, ttlSeconds: OTP_TTL_SECONDS };
}

export async function verifyOtp(rawPhone: string, rawCode: string) {
  const phone = normalizePhone(rawPhone);
  const code = String(rawCode || "").trim();

  if (!hasRedisConfig) {
    const now = Date.now();
    const data = memoryOtp.get(phone);
    if (!data || data.expiresAt <= now) {
      memoryOtp.delete(phone);
      throw new Error("OTP_EXPIRED");
    }

    if (data.attemptsLeft <= 0) {
      memoryOtp.delete(phone);
      throw new Error("OTP_ATTEMPTS_EXCEEDED");
    }

    const ok = hashOtp(phone, code) === String(data.hash);
    if (!ok) {
      const nextAttempts = data.attemptsLeft - 1;
      memoryOtp.set(phone, { ...data, attemptsLeft: nextAttempts });
      throw new Error("OTP_INVALID");
    }

    memoryOtp.delete(phone);
    return { phone };
  }

  const data = await redis.get<any>(otpKey(phone));
  if (!data) throw new Error("OTP_EXPIRED");

  const attemptsLeft = Number(data.attemptsLeft ?? 0);
  if (attemptsLeft <= 0) {
    await redis.del(otpKey(phone));
    throw new Error("OTP_ATTEMPTS_EXCEEDED");
  }

  const ok = hashOtp(phone, code) === String(data.hash);
  if (!ok) {
    await redis.set(
      otpKey(phone),
      { ...data, attemptsLeft: attemptsLeft - 1 },
      { ex: OTP_TTL_SECONDS }
    );
    throw new Error("OTP_INVALID");
  }

  await redis.del(otpKey(phone));
  return { phone };
}
