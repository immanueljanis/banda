import { NavError, publicError } from "./errors.mjs";
import { strategyInput } from "./coordinator.mjs";

/**
 * Bounds the streamed body even when Content-Length is absent or incorrect.
 * Never logs raw transport errors, tokens, keys or credentialed RPC URLs.
 * CORS is granted only to the single exact configured frontend origin.
 */
export function createHandler({ origin, authenticate, limit, prepare, enabled }) {
  return async request => {
    const allowed = Boolean(origin) && request.headers.get("origin") === origin;
    const cors = allowed ? { "Access-Control-Allow-Origin": origin, Vary: "Origin" } : { Vary: "Origin" };
    if (request.method === "OPTIONS") {
      return new Response(null, allowed ? {
        status: 204,
        headers: { ...cors, "Access-Control-Allow-Methods": "POST", "Access-Control-Allow-Headers": "authorization, content-type", "Access-Control-Max-Age": "600" },
      } : { status: 403, headers: cors });
    }
    try {
      if (request.method !== "POST") throw new NavError("METHOD", "Quote requests must use POST.", 405);
      if (!enabled) throw new NavError("NAV_DISABLED", "Automatic quote preparation has not been enabled yet.");
      if (!allowed) throw new NavError("ORIGIN", "Quote request origin is not allowed.", 403);
      if (request.headers.get("content-type")?.split(";")[0].trim() !== "application/json") throw new NavError("BAD_REQUEST", "Expected a JSON quote request.", 400);
      const subject = await authenticate(request.headers.get("authorization"));
      limit(subject);
      const reader = request.body?.getReader();
      if (!reader) throw new NavError("BAD_REQUEST", "Missing quote request.", 400);
      const chunks = [];
      let size = 0;
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          size += value.length;
          if (size > 256) {
            await reader.cancel();
            throw new NavError("BAD_REQUEST", "Quote request is too large.", 413);
          }
          chunks.push(value);
        }
      } finally { reader.releaseLock(); }
      let body;
      try { body = JSON.parse(Buffer.concat(chunks).toString("utf8")); }
      catch { throw new NavError("BAD_REQUEST", "Invalid quote request.", 400); }
      const result = await prepare(strategyInput(body));
      return Response.json(result, { headers: { ...cors, "Cache-Control": "no-store" } });
    } catch (error) {
      const { status, code, message } = publicError(error);
      console.warn(JSON.stringify({ event: "nav_prepare_failed", code }));
      return Response.json({ code, message }, {
        status, headers: { ...cors, "Cache-Control": "no-store", ...(status === 429 ? { "Retry-After": "60" } : {}) },
      });
    }
  };
}
