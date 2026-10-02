import { navHandler } from "@/lib/nav/service.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<Response> {
  return navHandler()(request);
}
