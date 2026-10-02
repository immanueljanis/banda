import { NextResponse } from "next/server";
import { getLiveChainSnapshot } from "@/lib/chain/reader";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const snapshot = await getLiveChainSnapshot();
    return NextResponse.json(snapshot, {
      headers: { "Cache-Control": "private, max-age=5, stale-while-revalidate=10" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "RPC unavailable";
    return NextResponse.json({ status: "unavailable", message }, { status: 503 });
  }
}

