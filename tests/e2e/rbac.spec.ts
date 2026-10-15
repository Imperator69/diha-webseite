import { expect, test, type APIRequestContext } from "@playwright/test";
import { acceptInvite, cliInvite, logout } from "./helpers";

const ORIGIN = "http://localhost:8788";
const pdf = { name: "nachweis.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n") };

async function upload(request: APIRequestContext, projectId: string) {
  return request.post("/api/documents", { headers: { Origin: ORIGIN }, multipart: { scope: "project", kind: "insurance", project_id: projectId, file: pdf } });
}

test.describe.serial("Datentrennung zwischen Projekten", () => {
  let foreignDocId = "";
  let foreignProjectId = "";
  let ownProjectId = "";
  let userLink = "";

  test("Vorbereitung: zwei Projekte, Unterlage im fremden Projekt", async ({ page }) => {
    await page.goto("/de/portal/login");
    await acceptInvite(page, cliInvite("rbac-admin@diha.example", ["--name", "Rechte Test"]), "Rechte Test", true);
    for (const [name, org] of [
      ["Projekt Eigen", "Eigen GmbH"],
      ["Projekt Fremd", "Fremd GmbH"],
    ]) {
      await page.goto("/de/portal/projekte/neu");
      await page.getByLabel("Projektname").fill(name);
      await page.getByLabel("Organisation / Firma").fill(org);
      await page.getByRole("button", { name: "Projekt anlegen" }).click();
      await expect(page.getByText("Projekt angelegt.")).toBeVisible();
      const id = page.url().match(/projekte\/([^/?]+)/)![1];
      if (name === "Projekt Fremd") foreignProjectId = id;
      else ownProjectId = id;
    }
    const res = await upload(page.request, foreignProjectId);
    expect(res.status()).toBe(200);
    foreignDocId = ((await res.json()) as { id: string }).id;

    await page.goto("/de/portal/benutzer/neu");
    await page.getByLabel("Name").fill("Eva Eigen");
    await page.getByLabel("E-Mail").fill("eva@eigen.example");
    await page.getByLabel("Rolle").selectOption("project");
    await page.getByLabel(/Projekt Eigen/).check();
    await page.getByRole("button", { name: "Anlegen und einladen" }).click();
    userLink = (await page.locator('input[readonly][value*="/einladung/"]').inputValue()).replace(ORIGIN, "");
    await logout(page);
  });

  test("Projekt-Benutzer sieht und ändert nur eigene Daten", async ({ page }) => {
    await acceptInvite(page, userLink, "Eva Eigen", false);
    const req = page.request;

    // fremde Unterlage: weder lesen noch löschen noch prüfen
    expect((await req.get(`/api/documents/${foreignDocId}`)).status()).toBe(404);
    expect((await req.delete(`/api/documents/${foreignDocId}`, { headers: { Origin: ORIGIN } })).status()).toBe(403);
    expect((await req.post(`/api/documents/${foreignDocId}/review`, { headers: { Origin: ORIGIN }, data: { status: "accepted" } })).status()).toBe(403);
    // in fremdes Projekt hochladen: verboten; ins eigene: erlaubt
    expect((await upload(req, foreignProjectId)).status()).toBe(403);
    expect((await upload(req, ownProjectId)).status()).toBe(200);
    // Upload ohne passenden Origin wird abgewiesen
    expect((await req.post("/api/documents", { headers: { Origin: "https://evil.example" }, multipart: { scope: "project", kind: "insurance", project_id: ownProjectId, file: pdf } })).status()).toBe(403);

    // Verwaltungsbereiche und Exporte
    for (const path of ["projekte", "genehmigungen", "auswertungen", "einstellungen", "rechnungen/neu", "rechnungen/tarife", "vorkommnisse", "sperrzeiten"]) {
      await page.goto(`/de/portal/${path}`);
      await expect(page, path).toHaveURL(/\/de\/portal\?denied=1/);
    }
    expect((await req.get("/api/reports/invoices")).status()).toBe(404);
    expect((await req.get("/api/invoices/00000000-0000-0000-0000-000000000000/pdf")).status()).toBe(404);

    // Dokumentenliste zeigt nur das eigene Projekt
    await page.goto("/de/portal/dokumente");
    await expect(page.getByRole("heading", { name: "Projekt Eigen" })).toBeVisible();
    await expect(page.getByText("Projekt Fremd")).toHaveCount(0);
  });
});
