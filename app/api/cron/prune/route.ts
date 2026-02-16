import { NextRequest, NextResponse } from "next/server";
import { pruneStaleTenants } from "@/modules/rank-tracker/db/core/prune";

export const dynamic = "force-dynamic";

function isAuthorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;

  if (!secret) {
    return false;
  }

  const authHeader = request.headers.get("authorization");
  const bearerToken = authHeader?.replace(/^Bearer\s+/i, "").trim();
  const queryToken = request.nextUrl.searchParams.get("secret")?.trim();

  return bearerToken === secret || queryToken === secret;
}

async function handlePrune(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const summary = await pruneStaleTenants();
    return NextResponse.json({ success: true, summary });
  } catch (error) {
    console.error("Failed to prune sandbox tenants", error);
    return NextResponse.json(
      { success: false, error: "Prune job failed" },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest) {
  return handlePrune(request);
}

export async function POST(request: NextRequest) {
  return handlePrune(request);
}
