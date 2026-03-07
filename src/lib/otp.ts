import crypto from "crypto";

export function hashOtp(phone: string, code: string) {
  const pepper = String(process.env.OTP_PEPPER || process.env.AUTH_SECRET || "").trim();
  if (!pepper) throw new Error("OTP_SECRET_MISSING");

  // привязываем хеш к телефону + глобальному секрету
  return crypto
    .createHash("sha256")
    .update(`${phone}:${code}:${pepper}`)
    .digest("hex");
}
