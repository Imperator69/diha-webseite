import { expect, test, type Page } from "@playwright/test";
import { acceptInvite, cliInvite, login, logout } from "./helpers";
import { writeFileSync } from "node:fs";

const PDF = "test-results/nachweis.pdf";

test.describe.serial("Buchung: Projekt fragt an, Manager prüft und bestätigt", () => {
  let adminSecret: string | null = null;
  let bookingUrl = "";

  test.beforeAll(() => {
    writeFileSync(PDF, "%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n");
  });

  test("Vorbereitung: Admin, Projekt und Projekt-Zugang", async ({ page }) => {
    await page.goto("/de/portal/login");
    adminSecret = await acceptInvite(page, cliInvite("graf@gl-ventures.at", ["--name", "Gianluca Graf"]), "Gianluca Graf", true);
    await page.goto("/de/portal/projekte/neu");
    await page.getByLabel("Projektname").fill("Kampagne Beta");
    await page.getByLabel("Organisation / Firma").fill("Beta Robotics GmbH");
    await page.getByRole("button", { name: "Projekt anlegen" }).click();
    await expect(page.getByText("Projekt angelegt.")).toBeVisible();
    await page.goto("/de/portal/benutzer/neu");
    await page.getByLabel("Name").fill("Bernd Beta");
    await page.getByLabel("E-Mail").fill("bernd@beta.example");
    await page.getByLabel("Rolle").selectOption("project");
    await page.getByLabel(/Kampagne Beta/).check();
    await page.getByRole("button", { name: "Anlegen und einladen" }).click();
    const link = (await page.locator('input[readonly][value*="/einladung/"]').inputValue()).replace("http://localhost:8788", "");
    await logout(page);
    await acceptInvite(page, link, "Bernd Beta", false);
  });

  test("Projekt bucht einen Flugtest über den Assistenten", async ({ page }) => {
    await login(page, "bernd@beta.example", null);
    await page.goto("/de/portal/buchungen/neu");
    await page.getByText("UAS-Flug (offene Kategorie)").click();
    await page.getByRole("button", { name: "Weiter" }).click();
    await page.getByRole("button", { name: /Z-2/ }).last().click();
    await page.getByRole("button", { name: "Zone auswählen" }).click();
    await page.getByRole("button", { name: "Weiter" }).click();
    await page.locator('[role="gridcell"]:not([disabled])').first().click();
    await expect(page.getByText("Gewählte Termine (1)")).toBeVisible();
    await page.getByRole("button", { name: "Weiter" }).click();
    await page.getByLabel("Titel der Buchung").fill("E2E Flugtest");
    await page.getByLabel(/UAS-Typ/).fill("Quad 4");
    await page.getByLabel(/Startmasse/).fill("2.5");
    await page.getByLabel(/Maximale Flughöhe/).fill("60");
    await page.getByLabel(/Registrierungsstaat/).selectOption("AT");
    await page.getByLabel(/Betreiber-ID/).fill("AUT-E2E");
    await page.getByLabel(/Unterkategorie/).selectOption("A1");
    await page.getByRole("button", { name: "Weiter" }).click();
    await page.locator("#project_lead-name").fill("Bernd Beta");
    await page.locator("#project_lead-phone").fill("+43 1 111");
    await page.locator("#remote_pilot-name").fill("Petra Pilotin");
    await page.locator("#remote_pilot-phone").fill("+43 1 222");
    await page.getByRole("button", { name: "Weiter" }).click();
    await page.getByRole("button", { name: "Entwurf speichern und Unterlagen hochladen" }).click();
    await page.waitForURL(/bearbeiten\?step=docs/);
    const forms = page.locator('form:has(input[type="file"])');
    await expect(forms).toHaveCount(3);
    for (let i = 0; i < 3; i++) {
      await forms.nth(i).locator('input[type="file"]').setInputFiles(PDF);
      await forms.nth(i).getByRole("button", { name: "Hochladen" }).click();
      await expect(forms.nth(i).getByText("Hochgeladen.")).toBeVisible();
    }
    await page.getByRole("button", { name: /Prüfen & senden/ }).first().click();
    await expect(page.getByText(/Alle Angaben vollständig/)).toBeVisible();
    await page.getByRole("checkbox", { name: /Ich bestätige/ }).check();
    await page.getByRole("button", { name: "Anfrage senden" }).click();
    await page.waitForURL(/saved=submitted/);
    await expect(page.locator("main").getByText("Angefragt", { exact: true })).toBeVisible();
    bookingUrl = new URL(page.url()).pathname;
    await logout(page);
  });

  test("Manager kann erst nach vollständiger Checkliste bestätigen", async ({ page }) => {
    await login(page, "graf@gl-ventures.at", adminSecret);
    await page.goto(bookingUrl);
    await page.getByRole("button", { name: "Bestätigen", exact: true }).click();
    await expect(page.getByRole("alert")).toContainText("Prüfpunkte");
    await clickAll(page, () => page.locator('button[aria-pressed="false"][aria-label]'));
    await page.getByPlaceholder(/Nachricht an das Projekt/).fill("Bitte 07:45 an der Basis.");
    await page.getByRole("button", { name: "Bestätigen", exact: true }).click();
    await page.waitForURL(/saved=status/);
    await expect(page.locator("main").getByText("Bestätigt", { exact: true })).toBeVisible();
    await page.goto("/de/portal/kalender?view=zones");
  });
});

async function clickAll(page: Page, locate: () => ReturnType<Page["locator"]>) {
  for (let i = 0; i < 15; i++) {
    const n = await locate().count();
    if (n === 0) return;
    await locate().first().click();
    await expect(locate()).toHaveCount(n - 1);
  }
}
