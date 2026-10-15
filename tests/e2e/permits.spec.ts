import { expect, test } from "@playwright/test";
import { acceptInvite, cliInvite, login } from "./helpers";

const isoDay = (offset: number) => new Date(Date.now() + offset * 86_400_000).toISOString().slice(0, 10);

test.describe.serial("Betrieb: Genehmigungsregister, Vorkommnisse, Tagesjobs", () => {
  let secret: string | null = null;

  test("Register aus Vorlage, Frist setzen, Erinnerung über Tagesjobs", async ({ page }) => {
    await page.goto("/de/portal/login");
    secret = await acceptInvite(page, cliInvite("betrieb@diha.example", ["--name", "Betrieb Test"]), "Betrieb Test", true);

    await page.goto("/de/portal/genehmigungen");
    await page.getByRole("button", { name: "Standard-Register anlegen" }).click();
    await expect(page.getByText("Standard-Register angelegt.")).toBeVisible();
    await expect(page.locator("tbody tr")).toHaveCount(16);

    await page.getByRole("link", { name: /Betriebsgenehmigung UAS/ }).click();
    await expect(page.getByRole("heading", { name: /Betriebsgenehmigung UAS/ })).toBeVisible();
    await page.locator("#status").selectOption("submitted");
    await page.locator("#reference_no").fill("AZ-2026-1");
    await page.locator("#next_deadline").fill(isoDay(-1));
    await page.locator("#next_deadline_note").fill("Nachreichung Betriebshandbuch");
    await page.getByRole("button", { name: "Speichern" }).click();
    await expect(page.getByText("Gespeichert.")).toBeVisible();
    // nach dem Speichern muss die Auswahl den gespeicherten Wert zeigen (kein Rücksprung)
    await expect(page.locator("#status")).toHaveValue("submitted");

    await page.goto("/de/portal/einstellungen");
    await page.getByRole("button", { name: "Tagesjobs jetzt ausführen" }).click();
    await expect(page.getByText(/Offene Fristen: 1 \(neu: 1\)/)).toBeVisible();
    await page.goto("/de/portal/postausgang");
    await expect(page.getByText("DIHA-Portal: 1 offene Fristen").first()).toBeVisible();

    // zweiter Lauf: nichts Neues, daher keine weitere Sammelmail
    await page.goto("/de/portal/einstellungen");
    await page.getByRole("button", { name: "Tagesjobs jetzt ausführen" }).click();
    await expect(page.getByText(/Offene Fristen: 1 \(neu: 0\)/)).toBeVisible();
  });

  test("Vorkommnis erfassen und abschließen", async ({ page }) => {
    await login(page, "betrieb@diha.example", secret);
    await page.goto("/de/portal/vorkommnisse");
    await page.getByLabel("Kurzbeschreibung").fill("Funkverbindung kurz unterbrochen");
    await page.getByLabel("Was ist passiert?").fill("Telemetrieabbruch ca. 5 s, Failsafe nicht ausgelöst.");
    await page.getByRole("button", { name: "Erfassen" }).click();
    await expect(page.locator("tbody tr")).toHaveCount(1);
    await page.getByRole("link", { name: "Funkverbindung kurz unterbrochen" }).click();
    await expect(page.getByRole("heading", { name: "Vorkommnis bearbeiten" })).toBeVisible();
    await page.locator("#inc_status").selectOption("closed");
    await page.getByRole("button", { name: "Speichern" }).click();
    await expect(page.locator("tbody").getByText("abgeschlossen")).toBeVisible();
    await expect(page.locator("#inc_status")).toHaveValue("closed");
  });

  test("Cron-Endpunkt verlangt das Geheimnis", async ({ request }) => {
    const res = await request.post("/api/cron");
    expect([403, 404]).toContain(res.status());
  });
});
