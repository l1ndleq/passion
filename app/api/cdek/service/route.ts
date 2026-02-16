import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const action = url.searchParams.get("action");
  return NextResponse.json({
    ok: false,
    error: "CDEK_SERVICE_NOT_IMPLEMENTED_YET",
    action,
    hint: "Implement offices/calculate proxy here",
  });
}
