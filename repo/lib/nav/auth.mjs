import { importSPKI, jwtVerify } from "jose";
import { NavError } from "./errors.mjs";

/**
 * Verify locally against the public verification key from the Privy dashboard.
 * No Privy app secret or operator key is required to authenticate requests.
 */
export function createAuthVerifier(appId, verificationKey) {
  let key;
  return async authorization => {
    if (!appId || !verificationKey) throw new NavError("AUTH_CONFIG", "Quote preparation is not configured yet.");
    if (!authorization?.startsWith("Bearer ") || authorization.length > 8192) {
      throw new NavError("UNAUTHORIZED", "Please sign in again to prepare a quote.", 401);
    }
    try {
      key ??= await importSPKI(verificationKey.replace(/\\n/g, "\n"), "ES256");
      const { payload } = await jwtVerify(authorization.slice(7), key, {
        issuer: "privy.io", audience: appId, algorithms: ["ES256"],
        requiredClaims: ["sub", "iat", "exp"],
      });
      if (!payload.sub?.startsWith("did:privy:")) throw new Error("Missing identity");
      return payload.sub;
    } catch {
      throw new NavError("UNAUTHORIZED", "Please sign in again to prepare a quote.", 401);
    }
  };
}
