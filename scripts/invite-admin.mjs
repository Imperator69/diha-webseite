#!/usr/bin/env node
// Erstellt bzw. erneuert eine Admin-Einladung direkt in D1 und gibt den Link aus.
// Für den Erststart ohne E-Mail-Versand und als Notfallzugang (z. B. verlorenes 2FA-Gerät).
//
//   pnpm admin:invite --email lerch@gl-ventures.at --site https://diha.example --remote
//   pnpm admin:invite --email graf@gl-ventures.at --local --site http://localhost:8787
//   Optionen: --name "Vor Nachname"  --locale de|en  --reset-2fa  --persist-to <dir> (lokal)
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";

const args = process.argv.slice(2);
const opt = (name, fallback = undefined) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] && !args[i + 1].startsWith("--") ? args[i + 1] : fallback;
};
const flag = (name) => args.includes(`--${name}`);

const email = (opt("email") ?? "").trim().toLowerCase();
if (!/.+@.+\..+/.test(email)) {
  console.error("Bitte --email angeben.");
  process.exit(1);
}
const remote = flag("remote");
const locale = opt("locale", "de") === "en" ? "en" : "de";
const site = (opt("site") ?? (remote ? "" : "http://localhost:8787")).replace(/\/$/, "");
if (!site) {
  console.error("Bitte --site mit der öffentlichen Adresse angeben (z. B. https://diha.example).");
  process.exit(1);
}
const name = opt("name") ?? email.split("@")[0].replace(/^\w/, (c) => c.toUpperCase());

const token = randomBytes(32).toString("base64url");
const tokenHash = createHash("sha256").update(token).digest("hex");
const now = Date.now();
const q = (v) => `'${String(v).replace(/'/g, "''")}'`;

const statements = [
  `INSERT INTO users (id, email, name, role, status, locale) VALUES (${q(randomUUID())}, ${q(email)}, ${q(name)}, 'admin', 'invited', ${q(locale)})
   ON CONFLICT(email) DO UPDATE SET role = 'admin', status = CASE WHEN users.status = 'disabled' THEN 'invited' ELSE users.status END, updated_at = ${now};`,
  `UPDATE auth_tokens SET used_at = ${now} WHERE used_at IS NULL AND type = 'invite' AND user_id = (SELECT id FROM users WHERE email = ${q(email)});`,
  `INSERT INTO auth_tokens (id, user_id, type, expires_at) VALUES (${q(tokenHash)}, (SELECT id FROM users WHERE email = ${q(email)}), 'invite', ${now + 7 * 86400000});`,
];
if (flag("reset-2fa")) {
  statements.push(`UPDATE users SET totp_enabled = 0, totp_secret = NULL, totp_last_step = NULL, recovery_codes = NULL WHERE email = ${q(email)};`);
  statements.push(`DELETE FROM sessions WHERE user_id = (SELECT id FROM users WHERE email = ${q(email)});`);
}
statements.push(
  `INSERT INTO audit_log (id, user_id, action, entity, entity_id, data) VALUES (${q(randomUUID())}, NULL, 'user.cli_invite', 'user', (SELECT id FROM users WHERE email = ${q(email)}), ${q(JSON.stringify({ email, reset2fa: flag("reset-2fa") }))});`,
);

const wranglerArgs = ["wrangler", "d1", "execute", "DB", remote ? "--remote" : "--local", "--command", statements.join("\n")];
if (!remote) wranglerArgs.push("--persist-to", opt("persist-to", ".wrangler/state"));
execFileSync("npx", wranglerArgs, { stdio: ["ignore", "ignore", "inherit"] });

console.log(`\nEinladung für ${email} erstellt (7 Tage gültig):\n\n  ${site}/${locale}/portal/einladung/${token}\n`);
console.log("Link nur über einen sicheren Kanal weitergeben.");
