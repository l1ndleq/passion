import crypto from "crypto";
import { redis } from "@/app/lib/redis";

const OTP_TTL_SECONDS = 5 * 60; // 5 минут
const OTP_RESEND_COOLDOWN_SECONDS = 60; // 60 сек между запросами
const OTP_MAX_ATTEMPTS = 5;

function normalizePhone(raw: string) {
  let s = String(raw || "").trim().replace(/[^\d+]/g, "");

  // RU нормализация к +7 (чтобы 8900..., 7900..., +7900... всегда совпадали)
  if (s.startsWith("8") && s.length === 11) s = "+7" + s.slice(1);
  if (s.startsWith("7") && s.length === 11) s = "+7" + s.slice(1);
  if (s.startsWith("9") && s.length === 10) s = "+7" + s;

  return s;
}

function phoneDigits(phone: string) {
  return String(phone || "").replace(/[^\d]/g, "");
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
  const digits = phoneDigits(phone);

  if (digits.length < 10) throw new Error("PHONE_INVALID");

  // cooldown (проверяем по обоим ключам, чтобы не обходили лимит сменой формата)
  const cooldown =
    (await redis.get<number>(otpCooldownKey(phone))) ??
    (await redis.get<number>(otpCooldownKey(digits)));

  if (cooldown) throw new Error("OTP_TOO_SOON");

  const code = String(Math.floor(100000 + Math.random() * 900000)); // 6 цифр
  const payload = {
    hash: hashOtp(code),
    attemptsLeft: OTP_MAX_ATTEMPTS,
    createdAt: Date.now(),
  };

  // пишем OTP в двух форматах ключа (с +7 и только цифры)
  await redis.set(otpKey(phone), payload, { ex: OTP_TTL_SECONDS });
  await redis.set(otpKey(digits), payload, { ex: OTP_TTL_SECONDS });

  // cooldown тоже в двух форматах
  await redis.set(otpCooldownKey(phone), 1, { ex: OTP_RESEND_COOLDOWN_SECONDS });
  await redis.set(otpCooldownKey(digits), 1, { ex: OTP_RESEND_COOLDOWN_SECONDS });

  return { phone, code, ttlSeconds: OTP_TTL_SECONDS };
}

export async function verifyOtp(rawPhone: string, rawCode: string) {
  const phone = normalizePhone(rawPhone);
  const digits = phoneDigits(phone);
  const code = String(rawCode || "").trim();

  // пробуем оба ключа
  let data = await redis.get<any>(otpKey(phone));
  let usedKey = otpKey(phone);

  if (!data) {
    data = await redis.get<any>(otpKey(digits));
    usedKey = otpKey(digits);
  }

  if (!data) throw new Error("OTP_EXPIRED");

  const attemptsLeft = Number(data.attemptsLeft ?? 0);
  if (attemptsLeft <= 0) {
    await redis.del(otpKey(phone));
    await redis.del(otpKey(digits));
    throw new Error("OTP_ATTEMPTS_EXCEEDED");
  }

  const ok = hashOtp(code) === String(data.hash);
  if (!ok) {
    // уменьшаем попытки и переписываем в оба ключа, сохраняя TTL
    const next = { ...data, attemptsLeft: attemptsLeft - 1 };

    await redis.set(otpKey(phone), next, { ex: OTP_TTL_SECONDS });
    await redis.set(otpKey(digits), next, { ex: OTP_TTL_SECONDS });

    throw new Error("OTP_INVALID");
  }

  // успех: чистим оба ключа
  await redis.del(otpKey(phone));
  await redis.del(otpKey(digits));

  // возвращаем канонический формат
  return { phone };
}
