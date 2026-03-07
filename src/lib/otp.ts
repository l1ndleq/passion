import crypto from "crypto";

function getOtpSecret() {
  const candidates = [
    process.env.OTP_PEPPER,
    process.env.AUTH_SECRET,
    process.env.TELEGRAM_LOGIN_BOT_TOKEN,
    process.env.TELEGRAM_BOT_TOKEN,
  ];

  for (const raw of candidates) {
    const value = String(raw || "").trim();
    if (value) return value;
  }

  throw new Error("OTP_SECRET_MISSING");
}

export function hashOtp(phone: string, code: string) {
  const pepper = getOtpSecret();

  // привязываем хеш к телефону + глобальному секрету
  return crypto
    .createHash("sha256")
    .update(`${phone}:${code}:${pepper}`)
    .digest("hex");
}
