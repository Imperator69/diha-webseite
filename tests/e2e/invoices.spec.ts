import { execFileSync } from "node:child_process";
import { expect, test } from "@playwright/test";
import { acceptInvite, cliInvite } from "./helpers";

function d1(sql: string): string {
  return execFileSync("npx", ["wrangler", "d1", "execute", "DB", "--local", "--persist-to", ".wrangler/e2e", "--command", sql], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
}

test.describe.serial("Rechnungen: Entwurf, Pflichtangaben, Ausstellen, Zahlung, Storno", () => {
  test("vollständiger Ablauf", async ({ page }) => {
    page.on("dialog", (d) => d.accept());
    await page.goto("/de/portal/login");
    await acceptInvite(page, cliInvite("buchhaltung@diha.example", ["--name", "Buchhaltung Test"]), "Buchhaltung Test", true);

    await page.goto("/de/portal/projekte/neu");
    await page.getByLabel("Projektname").fill("Kunde Gamma");
    await page.getByLabel("Organisation / Firma").fill("Gamma Systems GmbH");
    await page.getByRole("button", { name: "Projekt anlegen" }).click();
    await expect(page.getByText("Projekt angelegt.")).toBeVisible();

    await page.goto("/de/portal/rechnungen/neu");
    await page.locator("#project_id").selectOption({ label: "Kunde Gamma · Gamma Systems GmbH" });
    await page.getByRole("button", { name: "Entwurf anlegen" }).click();
    await expect(page.getByRole("heading", { name: "Rechnungsentwurf" })).toBeVisible();
    await page.getByLabel("Leistung von").fill("2026-10-01");
    await page.getByLabel("Beschreibung Position 1").fill("Geländenutzung Flugfläche, Halbtag");
    await page.getByLabel("Menge Position 1").fill("2");
    await page.getByLabel("Einheit Position 1").selectOption("half_day");
    await page.getByLabel("Einzelpreis Position 1").fill("450,00");
    await expect(page.getByText("€ 1.080,00").first()).toBeVisible();

    // Firmendaten und Empfängeranschrift fehlen noch
    await page.getByRole("button", { name: "Rechnung ausstellen" }).click();
    await expect(page.getByText("Für eine ordnungsgemäße Rechnung fehlt noch:")).toBeVisible();
    await expect(page.getByRole("alert").getByText(/UID-Nummer des Ausstellers fehlt/)).toBeVisible();
    await expect(page.getByRole("alert").getByText(/Anschrift des Empfängers fehlen/)).toBeVisible();
    const draftUrl = page.url();

    await page.goto("/de/portal/einstellungen");
    await page.locator("#co_street").fill("Teststraße 1");
    await page.locator("#co_postal_code").fill("3820");
    await page.locator("#co_city").fill("Raabs an der Thaya");
    await page.locator("#co_vat_id").fill("ATU12345678");
    await page.locator("#co_iban").fill("AT611904300234573201");
    await page.getByRole("button", { name: "Speichern" }).first().click();
    await expect(page.getByText("Gespeichert.").first()).toBeVisible();

    await page.goto("/de/portal/projekte");
    await page.getByRole("link", { name: "Kunde Gamma" }).click();
    await page.locator("#street").fill("Hauptplatz 3");
    await page.locator("#postal_code").fill("1010");
    await page.locator("#city").fill("Wien");
    await page.getByRole("button", { name: /Speichern/ }).first().click();
    await expect(page.getByText(/Gespeichert/).first()).toBeVisible();

    await page.goto(draftUrl);
    await page.getByLabel("per E-Mail an das Projekt senden").uncheck();
    await page.getByRole("button", { name: "Rechnung ausstellen" }).click();
    await expect(page.getByRole("heading", { name: /^Rechnung DIHA-\d{4}-0001$/ })).toBeVisible();
    await expect(page.getByText("€ 1.080,00").first()).toBeVisible();

    const pdf = await page.request.get(`${draftUrl.replace("/de/portal/rechnungen/", "/api/invoices/")}/pdf`);
    expect(pdf.status()).toBe(200);
    expect((await pdf.body()).subarray(0, 5).toString()).toBe("%PDF-");

    // Ausgestellte Rechnungen sind in der Datenbank gesperrt
    expect(() => d1("UPDATE invoice_lines SET unit_price_cents = 1 WHERE invoice_id IN (SELECT id FROM invoices WHERE status <> 'draft')")).toThrow(/invoice_frozen/);
    expect(() => d1("UPDATE invoices SET gross_cents = 1 WHERE status <> 'draft'")).toThrow(/invoice_frozen/);

    await page.locator("#pay_amount").fill("1080");
    await page.getByRole("button", { name: "Zahlung erfassen" }).click();
    await expect(page.getByText("Vollständig ausgeglichen")).toBeVisible();
    await expect(page.locator("header, main").getByText("Bezahlt").first()).toBeVisible();

    await page.getByText("Stornieren", { exact: true }).click();
    await page.getByPlaceholder(/Grund/).fill("Doppelt verrechnet");
    await page.getByRole("button", { name: "Gutschrift ausstellen und stornieren" }).click();
    await expect(page.getByRole("heading", { name: /^Gutschrift DIHA-\d{4}-0002$/ })).toBeVisible();
    await expect(page.getByText("Noch zu erstatten: € 1.080,00")).toBeVisible();
    await page.getByRole("button", { name: "Erstattung erfassen" }).click();
    await expect(page.getByText("Vollständig ausgeglichen")).toBeVisible();

    // Auswertungen und CSV-Export
    await page.goto("/de/portal/auswertungen?period=ytd");
    await expect(page.getByRole("heading", { name: "Auslastung je Zone" })).toBeVisible();
    await expect(page.getByRole("grid", { name: "Auslastung je Zone und Monat" })).toBeVisible();
    const csv = await page.request.get("/api/reports/invoices?period=ytd&locale=de");
    expect(csv.status()).toBe(200);
    const text = await csv.text();
    expect(text).toMatch(/^\ufeffNummer;Art;Status/);
    expect(text).toMatch(/DIHA-\d{4}-0001;Rechnung;Storniert;Kunde Gamma/);
    expect(text).toMatch(/DIHA-\d{4}-0002;Gutschrift/);
    await page.goto("/de/portal");
    await expect(page.getByText("Fristen und Hinweise").first()).toBeVisible();
  });
});
