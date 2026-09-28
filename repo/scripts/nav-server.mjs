import { navHandler } from "../lib/nav/service.mjs";

/**
 * Backend-only Railway entrypoint. The frontend stays on Vercel.
 * Per-request idle timeout is disabled because a quote refresh waits for receipts.
 */
Bun.serve({
  hostname: "0.0.0.0",
  port: Number(process.env.PORT || 3000),
  fetch(request, server) {
    if (new URL(request.url).pathname !== "/api/nav/prepare") return new Response("Not found", { status: 404 });
    server.timeout(request, 0);
    return navHandler()(request);
  },
});
