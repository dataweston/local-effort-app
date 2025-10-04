import * as ed from "@noble/ed25519";
import { base64url } from "jose";
import { randomBytes } from "crypto";

export type TokenPayload = {
  oid: string;
  n: string;
  q: number;
  e: string;
  v: string;
  t: "sando";
  jti: string;
};

const encoder = new TextEncoder();
const decoder = new TextDecoder();

const CROCKFORD_ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

const encodePart = (value: unknown) =>
  base64url.encode(encoder.encode(JSON.stringify(value)));

const toCrockfordBase32 = (bytes: Uint8Array) => {
  let bits = 0;
  let value = 0;
  let output = "";

  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;

    while (bits >= 5) {
      const index = (value >> (bits - 5)) & 0b1_1111;
      bits -= 5;
      output += CROCKFORD_ALPHABET[index];
    }
  }

  if (bits > 0) {
    const index = (value << (5 - bits)) & 0b1_1111;
    output += CROCKFORD_ALPHABET[index];
  }

  return output;
};

export const makeHumanCode = () => {
  let buffer = "";

  while (buffer.length < 10) {
    buffer += toCrockfordBase32(randomBytes(5));
  }

  const code = buffer.slice(0, 10);
  return `${code.slice(0, 5)}-${code.slice(5, 10)}`;
};

export async function signToken(
  payload: TokenPayload,
  kid: string,
  privRaw: Uint8Array
) {
  const header = { alg: "EdDSA", kid };
  const head = encodePart(header);
  const body = encodePart(payload);
  const msg = encoder.encode(`${head}.${body}`);
  const sig = await ed.sign(msg, privRaw);
  return `${head}.${body}.${base64url.encode(sig)}`;
}

export async function verifyToken(token: string, pubRaw: Uint8Array) {
  const [head, body, sigb64] = token.split(".");
  if (!head || !body || !sigb64) {
    return { ok: false as const };
  }

  const msg = encoder.encode(`${head}.${body}`);
  const signature = base64url.decode(sigb64);
  const ok = await ed.verify(signature, msg, pubRaw);

  if (!ok) {
    return { ok: false as const };
  }

  const payload = JSON.parse(
    decoder.decode(base64url.decode(body))
  ) as TokenPayload;
  const header = JSON.parse(
    decoder.decode(base64url.decode(head))
  ) as { alg: string; kid: string };

  return { ok: true as const, header, payload };
}
