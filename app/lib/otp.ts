import crypto from "crypto";
import { redis } from "@/app/lib/redis";

const OTP_TTL_SECONDS = 5 * 60; // 5 минут
const OTP_RESEND_COOLDOWN_SECONDS = 60; // 60 сек между запросами
const OTP_MAX_ATTEMPTS = 5;

function normalizePhone(raw: string) {
  // минимальная нормализация: оставляем цифры и +
  const s = raw.trim();
  const digits = s.replace(/[^\d+]/g, "");
  // можно усилить под RU: если начинается с 8 -> +7 и т.д. (позже)
  return digits;
}

function otpKey(phone: string) {
  return `otp:${phone}`;
}
function otpCooldownKey(phone: string) {
  return `otp:cooldown:${phone}`;
}

function hashOtp(code: string) {
  return crypto.createHash("sha256").update(code).digest("hex");
}

export async function requestOtp(rawPhone: string) {
  const phone = normalizePhone(rawPhone);
  if (phone.length < 10) throw new Error("PHONE_INVALID");

  // cooldown
  const cooldown = await redis.get<number>(otpCooldownKey(phone));
  if (cooldown) throw new Error("OTP_TOO_SOON");

  const code = String(Math.floor(100000 + Math.random() * 900000)); // 6 цифр

  await redis.set(
    otpKey(phone),
    {
      hash: hashOtp(code),
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
  const code = rawCode.trim();

  const data = await redis.get<any>(otpKey(phone));
  if (!data) throw new Error("OTP_EXPIRED");

  const attemptsLeft = Number(data.attemptsLeft ?? 0);
  if (attemptsLeft <= 0) {
    await redis.del(otpKey(phone));
    throw new Error("OTP_ATTEMPTS_EXCEEDED");
  }

  const ok = hashOtp(code) === String(data.hash);
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
