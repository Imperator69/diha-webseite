import { describe, expect, it } from "vitest";
import { isValidIban } from "@/lib/validation";

describe("isValidIban", () => {
  it("akzeptiert gültige IBANs", () => {
    expect(isValidIban("AT611904300234573201")).toBe(true);
    expect(isValidIban("DE89370400440532013000")).toBe(true);
  });
  it("lehnt falsche Prüfziffern und Formate ab", () => {
    expect(isValidIban("AT611904300234573202")).toBe(false);
    expect(isValidIban("AT61 1904 3002 3457 3201")).toBe(false);
    expect(isValidIban("")).toBe(false);
  });
});
