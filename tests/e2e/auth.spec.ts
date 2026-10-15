import { expect, test } from "@playwright/test";
import { acceptInvite, cliInvite, login, logout } from "./helpers";

test.describe.serial("Zugang, Rollen und 2FA", () => {
  let adminSecret: string | null = null;
  let projectInvite = "";

  test("Portal ist ohne Login gesperrt und markiert noindex", async ({ page }) => {
    const res = await page.goto("/de/portal");
    await expect(page).toHaveURL(/\/de\/portal\/login/);
    expect(res?.headers()["x-robots-tag"]).toContain("noindex");
  });

  test("Erster Admin: Einladung, Passwort, Pflicht-2FA", async ({ page }) => {
    await page.goto("/de/portal/login"); // legt INITIAL_ADMINS als eingeladen an
    const link = cliInvite("lerch@gl-ventures.at", ["--name", "Dominik Lerch"]);
    adminSecret = await acceptInvite(page, link, "Dominik Lerch", true);
    await expect(page.getByRole("heading", { name: /Guten Tag|Willkommen/ })).toBeVisible();
  });

  test("Falsches Passwort wird abgelehnt", async ({ page }) => {
    await page.goto("/de/portal/login");
    await page.getByLabel("E-Mail").fill("lerch@gl-ventures.at");
    await page.getByLabel("Passwort").fill("falsch-falsch-falsch");
    await page.getByRole("button", { name: "Anmelden" }).click();
    await expect(page.getByRole("alert")).toContainText("nicht korrekt");
  });

  test("Admin legt Projekt und Projekt-Benutzer an", async ({ page }) => {
    await login(page, "lerch@gl-ventures.at", adminSecret);
    await page.goto("/de/portal/projekte/neu");
    await page.getByLabel("Projektname").fill("Testflug Alpha");
    await page.getByLabel("Organisation / Firma").fill("Alpha Drones GmbH");
    await page.getByRole("button", { name: "Projekt anlegen" }).click();
    await expect(page.getByText("Projekt angelegt.")).toBeVisible();

    await page.goto("/de/portal/benutzer/neu");
    await page.getByLabel("Name").fill("Petra Projekt");
    await page.getByLabel("E-Mail").fill("petra@alpha.example");
    await page.getByLabel("Rolle").selectOption("project");
    await page.getByLabel(/Testflug Alpha/).check();
    await page.getByRole("button", { name: "Anlegen und einladen" }).click();
    const linkField = page.locator('input[readonly][value*="/einladung/"]');
    await expect(linkField).toBeVisible();
    projectInvite = (await linkField.inputValue()).replace("http://localhost:8788", "");
    await logout(page);
  });

  test("Projekt-Benutzer: ohne 2FA, kein Zugriff auf Admin-Bereiche", async ({ page }) => {
    await acceptInvite(page, projectInvite, "Petra Projekt", false);
    await expect(page.getByRole("link", { name: "Benutzer" })).toHaveCount(0);
    await page.goto("/de/portal/benutzer");
    await expect(page).toHaveURL(/\/de\/portal\?denied=1/);
    const res = await page.request.get("/api/admin/users/x/export");
    expect(res.status()).toBe(403);
  });

  test("Sprachwechsel im Portal", async ({ page }) => {
    await login(page, "petra@alpha.example", null);
    await page.getByRole("link", { name: "en", exact: true }).click();
    await expect(page).toHaveURL(/\/en\/portal$/);
    await expect(page.getByRole("heading", { name: /Welcome/ })).toBeVisible();
  });
});
