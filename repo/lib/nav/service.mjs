import { createRemoteJWKSet } from "jose";
import { createAuthVerifier } from "./auth.mjs";
import { createCoordinator, createLimiter } from "./coordinator.mjs";
import { createHandler } from "./handler.mjs";
import { withJournal } from "./journal.mjs";
import { prepareQuote, preparePrices } from "./prepare.mjs";
import { createMarketPrices } from "./prices.mjs";
import { createTransport } from "./transport.mjs";
import { NavError } from "./errors.mjs";

const key = Symbol.for("banda.nav.on-demand");
/** Shared in a single Node process, including Next development module reloads. */
export function navHandler() {
  if (!globalThis[key]) {
    const env = process.env;
    const enabled = env.BANDA_NAV_ON_DEMAND === "true";
    const marketPrices = createMarketPrices();
    const log = (event, details) => console.info(JSON.stringify({ event, ...details }));
    const prepare = createCoordinator(async strategyId => {
      if (env.BANDA_NAV_SINGLE_INSTANCE !== "true" || !env.ROBINHOOD_TESTNET_RPC_URL || !env.BANDA_OPERATOR_PRIVATE_KEY) {
        throw new NavError("NAV_CONFIG", "Quote service requires single-instance operator configuration.");
      }
      return withJournal(env.BANDA_NAV_STATE_DIR, async journal => {
        const chain = createTransport(env.ROBINHOOD_TESTNET_RPC_URL, env.BANDA_OPERATOR_PRIVATE_KEY);
        const quote = await prepareQuote(strategyId, chain, journal, log);
        const prices = await preparePrices(strategyId, chain, journal, marketPrices, log);
        return { ...quote, prices: prices.status };
      });
    });
    globalThis[key] = createHandler({
      origin: env.BANDA_APP_ORIGIN,
      enabled,
      authenticate: createAuthVerifier(env.NEXT_PUBLIC_PRIVY_APP_ID, env.PRIVY_VERIFICATION_KEY ||
        (env.NEXT_PUBLIC_PRIVY_APP_ID && createRemoteJWKSet(new URL(`https://auth.privy.io/api/v1/apps/${env.NEXT_PUBLIC_PRIVY_APP_ID}/jwks.json`)))),
      limit: createLimiter(),
      prepare,
    });
  }
  return globalThis[key];
}
