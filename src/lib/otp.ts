import crypto from "crypto";

export function hashOtp(phone: string, code: string) {
  const pepper = process.env.OTP_PEPPER;
  if (!pepper) throw new Error("OTP_PEPPER missing");

  // привязываем хеш к телефону + глобальному секрету
  return crypto
    .createHash("sha256")
    .update(`${phone}:${code}:${pepper}`)
    .digest("hex");
}
