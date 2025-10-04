import { db } from "./db.js";
import { env } from "./env.js";
import { getPublicKey, utils as edUtils } from "@noble/ed25519";
import { base64url } from "jose";

export type ActiveKey = {
  kid: string;
  publicKeyB64: string;
  privateKey?: Uint8Array;
};

const getActiveKeyStmt = db.prepare(
  "SELECT kid, public_key_b64 AS publicKeyB64, private_key_b64 AS privateKeyB64 FROM keys WHERE active = 1 LIMIT 1"
);

const getKeyByKidStmt = db.prepare(
  "SELECT kid, public_key_b64 AS publicKeyB64, private_key_b64 AS privateKeyB64 FROM keys WHERE kid = ? LIMIT 1"
);

const deactivateKeysStmt = db.prepare("UPDATE keys SET active = 0 WHERE active = 1");

const insertKeyStmt = db.prepare(
  "INSERT OR REPLACE INTO keys (kid, public_key_b64, private_key_b64, created_at, active) VALUES (?, ?, ?, datetime('now'), 1)"
);

const decodeKey = (value?: string) =>
  value ? Uint8Array.from(base64url.decode(value)) : undefined;

export const ensureActiveKey = (): ActiveKey => {
  const current = getActiveKeyStmt.get() as
    | { kid: string; publicKeyB64: string; privateKeyB64: string | null }
    | undefined;

  if (current) {
    return {
      kid: current.kid,
      publicKeyB64: current.publicKeyB64,
      privateKey: decodeKey(current.privateKeyB64 ?? undefined)
    };
  }

  const privFromEnv = env.JWT_PRIVATE_KEY_BASE64
    ? base64url.decode(env.JWT_PRIVATE_KEY_BASE64)
    : undefined;
  const pubFromEnv = env.JWT_PUBLIC_KEY_BASE64
    ? base64url.decode(env.JWT_PUBLIC_KEY_BASE64)
    : undefined;

  let privateKey: Uint8Array;
  let publicKey: Uint8Array;

  if (privFromEnv) {
    privateKey = Uint8Array.from(privFromEnv);
    publicKey = pubFromEnv ? Uint8Array.from(pubFromEnv) : getPublicKey(privateKey);
  } else {
    privateKey = edUtils.randomSecretKey();
    publicKey = getPublicKey(privateKey);
  }

  const privateKeyB64 = base64url.encode(privateKey);
  const publicKeyB64 = base64url.encode(publicKey);

  deactivateKeysStmt.run();
  insertKeyStmt.run(env.JWT_KID, publicKeyB64, privateKeyB64);

  return { kid: env.JWT_KID, publicKeyB64, privateKey };
};

export const getActiveKey = (): ActiveKey => {
  const current = getActiveKeyStmt.get() as
    | { kid: string; publicKeyB64: string; privateKeyB64: string | null }
    | undefined;

  if (!current) {
    return ensureActiveKey();
  }

  return {
    kid: current.kid,
    publicKeyB64: current.publicKeyB64,
    privateKey: decodeKey(current.privateKeyB64 ?? undefined)
  };
};

export const getKeyByKid = (kid: string): ActiveKey | undefined => {
  const record = getKeyByKidStmt.get(kid) as
    | { kid: string; publicKeyB64: string; privateKeyB64: string | null }
    | undefined;

  if (!record) {
    return undefined;
  }

  return {
    kid: record.kid,
    publicKeyB64: record.publicKeyB64,
    privateKey: decodeKey(record.privateKeyB64 ?? undefined)
  };
};
