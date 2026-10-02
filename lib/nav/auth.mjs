import { importSPKI, jwtVerify } from "jose";
import { NavError } from "./errors.mjs";

/**
 * Verify against Privy's public keys: a PEM override, or a jose key resolver such
 * as the app's JWKS, which follows key rotation by `kid`.
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
      key ??= typeof verificationKey === "string"
        ? await importSPKI(verificationKey.replace(/\\n/g, "\n"), "ES256")
        : verificationKey;
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
