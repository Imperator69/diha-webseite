import { describe, expect, it } from "vitest";
import { base32Decode, base32Encode, totpCode, verifyTotp } from "@/lib/auth/totp";

// RFC 6238 Testvektor: Schlüssel "12345678901234567890" (SHA-1)
const secret = base32Encode(new TextEncoder().encode("12345678901234567890"));

describe("TOTP", () => {
  it("Base32 ist umkehrbar", () => {
    expect(new TextDecoder().decode(base32Decode(secret))).toBe("12345678901234567890");
  });
  it("entspricht den RFC-6238-Testvektoren", async () => {
    expect(await totpCode(secret, Math.floor(59 / 30))).toBe("287082");
    expect(await totpCode(secret, Math.floor(1111111109 / 30))).toBe("081804");
    expect(await totpCode(secret, Math.floor(1234567890 / 30))).toBe("005924");
  });
  it("akzeptiert ±1 Schritt und verhindert Wiederverwendung", async () => {
    const now = 1_234_567_890_000;
    const step = Math.floor(now / 30_000);
    const code = await totpCode(secret, step);
    expect(await verifyTotp(secret, code, null, now)).toBe(step);
    expect(await verifyTotp(secret, code, step, now)).toBeNull();
    expect(await verifyTotp(secret, await totpCode(secret, step + 1), null, now)).toBe(step + 1);
    expect(await verifyTotp(secret, await totpCode(secret, step + 3), null, now)).toBeNull();
    expect(await verifyTotp(secret, "abc", null, now)).toBeNull();
  });
});
