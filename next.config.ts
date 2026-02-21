/** @type {import('next').NextConfig} */
const isProd = process.env.NODE_ENV === "production";
// Allow unsafe-inline for scripts and styles to support Next.js hydration and Framer Motion
const scriptSrc = isProd
  ? "script-src 'self' 'unsafe-inline' 'unsafe-eval' https:"
  : "script-src 'self' 'unsafe-inline' 'unsafe-eval' https:";
const styleSrc = isProd
  ? "style-src 'self' 'unsafe-inline' https:"
  : "style-src 'self' 'unsafe-inline' https:";

const csp = [
  "default-src 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  scriptSrc,
  styleSrc,
  "img-src 'self' data: blob: https:",
  "font-src 'self' data: https:",
  "connect-src 'self' https: wss:",
  "frame-src 'self' https:",
].join("; ");

const nextConfig = {
  async headers() {
    const securityHeaders = [
      { key: "Content-Security-Policy", value: csp },
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "X-Frame-Options", value: "DENY" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
      { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
      { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
      ...(isProd
        ? [{ key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" }]
        : []),
    ];

    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

module.exports = nextConfig;
