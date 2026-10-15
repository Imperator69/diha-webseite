// TOTP nach RFC 6238 (SHA-1, 30 s, 6 Stellen) – kompatibel mit gängigen Authenticator-Apps.
const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

export function base32Encode(bytes: Uint8Array): string {
  let bits = 0;
  let value = 0;
  let out = "";
  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += ALPHABET[(value << (5 - bits)) & 31];
  return out;
}

export function base32Decode(input: string): Uint8Array {
  const clean = input.toUpperCase().replace(/[^A-Z2-7]/g, "");
  let bits = 0;
  let value = 0;
  const out: number[] = [];
  for (const ch of clean) {
    value = (value << 5) | ALPHABET.indexOf(ch);
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return new Uint8Array(out);
}

export function generateTotpSecret(): string {
  return base32Encode(crypto.getRandomValues(new Uint8Array(20)));
}

export async function totpCode(secret: string, step: number): Promise<string> {
  const counter = new ArrayBuffer(8);
  const view = new DataView(counter);
  view.setUint32(0, Math.floor(step / 2 ** 32));
  view.setUint32(4, step >>> 0);
  const key = await crypto.subtle.importKey("raw", base32Decode(secret), { name: "HMAC", hash: "SHA-1" }, false, ["sign"]);
  const mac = new Uint8Array(await crypto.subtle.sign("HMAC", key, counter));
  const offset = mac[mac.length - 1] & 0x0f;
  const bin = ((mac[offset] & 0x7f) << 24) | (mac[offset + 1] << 16) | (mac[offset + 2] << 8) | mac[offset + 3];
  return String(bin % 1_000_000).padStart(6, "0");
}

export function currentStep(nowMs = Date.now()): number {
  return Math.floor(nowMs / 30_000);
}

/**
 * Prüft einen Code mit ±1 Zeitschritt Toleranz. Liefert den verwendeten Schritt,
 * damit derselbe Code nicht zweimal akzeptiert wird (lastStep).
 */
export async function verifyTotp(secret: string, code: string, lastStep: number | null, nowMs = Date.now()): Promise<number | null> {
  const clean = code.replace(/\s/g, "");
  if (!/^\d{6}$/.test(clean)) return null;
  const step = currentStep(nowMs);
  for (const candidate of [step - 1, step, step + 1]) {
    if (lastStep !== null && candidate <= lastStep) continue;
    if ((await totpCode(secret, candidate)) === clean) return candidate;
  }
  return null;
}

export function otpauthUri(secret: string, account: string, issuer = "DIHA Portal"): string {
  const label = encodeURIComponent(`${issuer}:${account}`);
  return `otpauth://totp/${label}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`;
}

export function generateRecoveryCodes(count = 8): string[] {
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    const raw = base32Encode(crypto.getRandomValues(new Uint8Array(6))).slice(0, 10).toLowerCase();
    codes.push(`${raw.slice(0, 5)}-${raw.slice(5)}`);
  }
  return codes;
}
