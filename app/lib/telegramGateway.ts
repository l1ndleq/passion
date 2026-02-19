type TelegramGatewayRequestStatus = {
  request_id?: string;
  phone_number?: string;
  request_cost?: number;
  remaining_balance?: number;
};

type TelegramGatewayResponse = {
  ok?: boolean;
  result?: TelegramGatewayRequestStatus;
  error?: string;
};

const TELEGRAM_GATEWAY_BASE_URL = "https://gatewayapi.telegram.org";
const DEFAULT_TTL_SECONDS = 300;

function getGatewayToken() {
  return String(process.env.TELEGRAM_GATEWAY_API_TOKEN || "").trim();
}

function getSenderUsername() {
  return String(process.env.TELEGRAM_GATEWAY_SENDER_USERNAME || "")
    .trim()
    .replace(/^@/, "");
}

function getTtlSeconds() {
  const raw = Number(process.env.TELEGRAM_GATEWAY_TTL_SECONDS || "");
  if (Number.isFinite(raw) && raw >= 30 && raw <= 3600) {
    return Math.floor(raw);
  }
  return DEFAULT_TTL_SECONDS;
}

function withTimeoutSignal(timeoutMs: number) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return { signal: controller.signal, clear: () => clearTimeout(timer) };
}

export function isTelegramGatewayConfigured() {
  return Boolean(getGatewayToken());
}

export async function sendOtpViaTelegramGateway(params: {
  phone: string;
  code: string;
  payload?: string;
}) {
  const token = getGatewayToken();
  if (!token) {
    return {
      sent: false as const,
      reason: "NOT_CONFIGURED" as const,
    };
  }

  const senderUsername = getSenderUsername();
  const ttl = getTtlSeconds();
  const body: Record<string, unknown> = {
    phone_number: params.phone,
    code: params.code,
    ttl,
  };

  if (senderUsername) body.sender_username = senderUsername;
  if (params.payload) body.payload = params.payload.slice(0, 128);

  const timeout = withTimeoutSignal(7000);

  try {
    const res = await fetch(`${TELEGRAM_GATEWAY_BASE_URL}/sendVerificationMessage`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
      signal: timeout.signal,
    });

    const data = (await res.json().catch(() => ({}))) as TelegramGatewayResponse;

    if (!res.ok || !data?.ok) {
      return {
        sent: false as const,
        reason: "API_ERROR" as const,
        error: data?.error || `HTTP_${res.status}`,
      };
    }

    return {
      sent: true as const,
      requestId: data?.result?.request_id || null,
      cost: data?.result?.request_cost ?? null,
      balance: data?.result?.remaining_balance ?? null,
    };
  } catch (error: unknown) {
    return {
      sent: false as const,
      reason: "NETWORK_ERROR" as const,
      error: error instanceof Error ? error.message : "NETWORK_ERROR",
    };
  } finally {
    timeout.clear();
  }
}
