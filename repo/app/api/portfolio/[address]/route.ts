import { NextResponse } from "next/server";
import { getAddress } from "viem";
import { getLivePortfolio } from "@/lib/chain/indexer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ address: string }> }) {
  try {
    const { address: rawAddress } = await params;
    const address = getAddress(rawAddress);
    const portfolio = await getLivePortfolio(address);
    return NextResponse.json(portfolio, { headers: { "Cache-Control": "private, max-age=5, stale-while-revalidate=15" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Portfolio RPC unavailable";
    return NextResponse.json({ status: "unavailable", message }, { status: 503 });
  }
}
