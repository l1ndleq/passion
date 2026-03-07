import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function hasEnv(name: string) {
  return Boolean(String(process.env[name] || "").trim());
}

export async function GET() {
  const flags = {
    otpPepper: hasEnv("OTP_PEPPER"),
    authSecret: hasEnv("AUTH_SECRET"),
    otpSecretReady:
      hasEnv("OTP_PEPPER") ||
      hasEnv("AUTH_SECRET") ||
      hasEnv("TELEGRAM_LOGIN_BOT_TOKEN") ||
      hasEnv("TELEGRAM_BOT_TOKEN"),
    upstashUrl: hasEnv("UPSTASH_REDIS_REST_URL"),
    upstashToken: hasEnv("UPSTASH_REDIS_REST_TOKEN"),
    upstashReady: hasEnv("UPSTASH_REDIS_REST_URL") && hasEnv("UPSTASH_REDIS_REST_TOKEN"),
    telegramLoginBotToken: hasEnv("TELEGRAM_LOGIN_BOT_TOKEN"),
    telegramBotToken: hasEnv("TELEGRAM_BOT_TOKEN"),
    telegramAdminBotToken: hasEnv("TELEGRAM_ADMIN_BOT_TOKEN"),
    telegramWebhookSecret: hasEnv("TELEGRAM_WEBHOOK_SECRET"),
    telegramAdminWebhookSecret: hasEnv("TELEGRAM_ADMIN_WEBHOOK_SECRET"),
    telegramGatewayToken: hasEnv("TELEGRAM_GATEWAY_TOKEN"),
    telegramGatewaySenderUsername: hasEnv("TELEGRAM_GATEWAY_SENDER_USERNAME"),
    waitlistCanNotifyUser:
      hasEnv("TELEGRAM_LOGIN_BOT_TOKEN") || hasEnv("TELEGRAM_BOT_TOKEN"),
    waitlistCanQueuePending: hasEnv("UPSTASH_REDIS_REST_URL") && hasEnv("UPSTASH_REDIS_REST_TOKEN"),
  };

  const response = NextResponse.json({
    ok: true,
    env: {
      nodeEnv: process.env.NODE_ENV || "unknown",
      vercelEnv: process.env.VERCEL_ENV || "unknown",
      commitSha: process.env.VERCEL_GIT_COMMIT_SHA || "unknown",
    },
    flags,
    checkedAt: new Date().toISOString(),
  });

  response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate");
  return response;
}
