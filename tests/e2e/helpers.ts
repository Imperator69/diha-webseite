import { execFileSync } from "node:child_process";
import { createHmac } from "node:crypto";
import { expect, type Page } from "@playwright/test";

export const PASSWORD = "Teststand-Eibenstein-2026!";

export function cliInvite(email: string, extra: string[] = []): string {
  const out = execFileSync("node", ["scripts/invite-admin.mjs", "--email", email, "--local", "--persist-to", ".wrangler/e2e", "--site", "http://localhost:8788", ...extra], {
    encoding: "utf8",
  });
  const match = out.match(/http:\/\/localhost:8788\S+/);
  if (!match) throw new Error(`Kein Link in Ausgabe: ${out}`);
  return match[0];
}

function base32Decode(input: string): Buffer {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = 0;
  let value = 0;
  const out: number[] = [];
  for (const ch of input.replace(/\s/g, "").toUpperCase()) {
    value = (value << 5) | alphabet.indexOf(ch);
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(out);
}

export function totp(secret: string, offsetSteps = 0): string {
  const step = Math.floor(Date.now() / 30_000) + offsetSteps;
  const buf = Buffer.alloc(8);
  buf.writeUInt32BE(Math.floor(step / 2 ** 32), 0);
  buf.writeUInt32BE(step >>> 0, 4);
  const mac = createHmac("sha1", base32Decode(secret)).update(buf).digest();
  const o = mac[mac.length - 1] & 0x0f;
  const bin = ((mac[o] & 0x7f) << 24) | (mac[o + 1] << 16) | (mac[o + 2] << 8) | mac[o + 3];
  return String(bin % 1_000_000).padStart(6, "0");
}

/** Einladung annehmen und – für Admin/Manager – 2FA einrichten. Gibt den TOTP-Schlüssel zurück. */
export async function acceptInvite(page: Page, link: string, name: string, withTotp: boolean): Promise<string | null> {
  await page.goto(link);
  await page.getByLabel(/^Name/).fill(name);
  await page.getByLabel(/Neues Passwort|New password/).fill(PASSWORD);
  await page.getByLabel(/Passwort wiederholen|Repeat password/).fill(PASSWORD);
  await page.getByRole("button", { name: /Zugang aktivieren|Activate/ }).click();
  if (!withTotp) {
    await page.waitForURL(/\/portal$/);
    return null;
  }
  await page.waitForURL(/2fa-einrichten/);
  const secret = (await page.locator("p.font-mono").textContent())!.replace(/\s/g, "");
  await page.getByLabel(/6-stelliger Code|6-digit code/).fill(totp(secret));
  await page.getByRole("button", { name: /2FA aktivieren|Enable 2FA/ }).click();
  await expect(page.getByText(/Wiederherstellungscodes|recovery codes/i).first()).toBeVisible();
  await page.getByRole("link", { name: /Weiter zum Portal|Continue to portal/ }).click();
  await page.waitForURL(/\/portal$/);
  return secret;
}

export async function login(page: Page, email: string, secret: string | null) {
  await page.goto("/de/portal/login");
  await page.getByLabel("E-Mail").fill(email);
  await page.getByLabel("Passwort").fill(PASSWORD);
  await page.getByRole("button", { name: "Anmelden" }).click();
  if (secret) {
    await page.waitForURL(/login\/2fa/);
    // nächster Zeitschritt, damit der beim Einrichten verwendete Code nicht erneut gilt
    await page.getByLabel(/Code/).fill(totp(secret, 1));
    await page.getByRole("button", { name: "Bestätigen" }).click();
  }
  await page.waitForURL(/\/portal$/);
}

export async function logout(page: Page) {
  await page.getByRole("button", { name: /Abmelden|Sign out/ }).click();
  await page.waitForURL(/login\?logged_out=1/);
}
