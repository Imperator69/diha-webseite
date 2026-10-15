import { describe, expect, it } from "vitest";
import { negotiateLocale, switchLocalePath } from "@/lib/i18n/config";

describe("Sprache", () => {
  it("wählt die bevorzugte unterstützte Sprache", () => {
    expect(negotiateLocale("en-US,en;q=0.9,de;q=0.8")).toBe("en");
    expect(negotiateLocale("fr-FR,de;q=0.5")).toBe("de");
    expect(negotiateLocale("fr")).toBe("de");
    expect(negotiateLocale(null)).toBe("de");
  });
  it("tauscht Präfix und sprachspezifische Slugs", () => {
    expect(switchLocalePath("/de/portal/buchungen", "en")).toBe("/en/portal/buchungen");
    expect(switchLocalePath("/de/impressum", "en")).toBe("/en/imprint");
    expect(switchLocalePath("/en/privacy", "de")).toBe("/de/datenschutz");
    expect(switchLocalePath("/", "en")).toBe("/en");
  });
});
