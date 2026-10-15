import { scrypt, randomBytes, timingSafeEqual } from "node:crypto";

// OWASP-Variante für begrenzten Speicher: N=2^14, r=8, p=5
const N = 16384;
const R = 8;
const P = 5;
const KEYLEN = 32;
const MAXMEM = 64 * 1024 * 1024;

function derive(password: string, salt: Buffer, n = N, r = R, p = P): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password.normalize("NFKC"), salt, KEYLEN, { N: n, r, p, maxmem: MAXMEM }, (err, key) => (err ? reject(err) : resolve(key)));
  });
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await derive(password, salt);
  return `scrypt$${N}$${R}$${P}$${salt.toString("base64")}$${key.toString("base64")}`;
}

export async function verifyPassword(password: string, stored: string | null | undefined): Promise<boolean> {
  if (!stored) return false;
  const [algo, n, r, p, saltB64, keyB64] = stored.split("$");
  if (algo !== "scrypt") return false;
  const expected = Buffer.from(keyB64, "base64");
  const key = await derive(password, Buffer.from(saltB64, "base64"), Number(n), Number(r), Number(p));
  return key.length === expected.length && timingSafeEqual(key, expected);
}

export function passwordProblems(password: string): string[] {
  const problems: string[] = [];
  if (password.length < 12) problems.push("min_length");
  if (password.length > 200) problems.push("max_length");
  if (!/[A-Za-zÄÖÜäöüß]/.test(password) || !/\d|[^A-Za-z0-9]/.test(password)) problems.push("mix");
  return problems;
}
