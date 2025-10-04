import * as ed from "@noble/ed25519";
import { base64url } from "jose";
import { randomBytes } from "crypto";
const encoder = new TextEncoder();
const decoder = new TextDecoder();
const CROCKFORD_ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
const encodePart = (value) => base64url.encode(encoder.encode(JSON.stringify(value)));
const toCrockfordBase32 = (bytes) => {
    let bits = 0;
    let value = 0;
    let output = "";
    for (const byte of bytes) {
        value = (value << 8) | byte;
        bits += 8;
        while (bits >= 5) {
            const index = (value >> (bits - 5)) & 31;
            bits -= 5;
            output += CROCKFORD_ALPHABET[index];
        }
    }
    if (bits > 0) {
        const index = (value << (5 - bits)) & 31;
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
export async function signToken(payload, kid, privRaw) {
    const header = { alg: "EdDSA", kid };
    const head = encodePart(header);
    const body = encodePart(payload);
    const msg = encoder.encode(`${head}.${body}`);
    const sig = await ed.sign(msg, privRaw);
    return `${head}.${body}.${base64url.encode(sig)}`;
}
export async function verifyToken(token, pubRaw) {
    const [head, body, sigb64] = token.split(".");
    if (!head || !body || !sigb64) {
        return { ok: false };
    }
    const msg = encoder.encode(`${head}.${body}`);
    const signature = base64url.decode(sigb64);
    const ok = await ed.verify(signature, msg, pubRaw);
    if (!ok) {
        return { ok: false };
    }
    const payload = JSON.parse(decoder.decode(base64url.decode(body)));
    const header = JSON.parse(decoder.decode(base64url.decode(head)));
    return { ok: true, header, payload };
}
