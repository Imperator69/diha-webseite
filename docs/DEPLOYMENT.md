# Deployment (Cloudflare)

## 1. Ressourcen anlegen

```sh
npx wrangler login
npx wrangler d1 create diha --jurisdiction eu
npx wrangler r2 bucket create diha-files --jurisdiction eu
```

Die ausgegebene `database_id` in `wrangler.jsonc` unter `d1_databases` eintragen.

## 2. Konfiguration

In `wrangler.jsonc` unter `vars`:

| Variable | Wert |
|---|---|
| `SITE_URL` | öffentliche Adresse, z. B. `https://www.diha.at` (Links in E-Mails, Canonicals, Sitemap) |
| `MAIL_FROM` | Absender, z. B. `DIHA <noreply@diha.at>` (Domain muss bei Resend verifiziert sein) |
| `INITIAL_ADMINS` | erste Admins, kommagetrennt (werden nur angelegt, solange es noch keine Benutzer gibt) |

Secrets (nicht im Repository):

```sh
openssl rand -base64 48 | npx wrangler secret put APP_SECRET   # verschlüsselt TOTP-Schlüssel, nie wechseln ohne 2FA-Reset
npx wrangler secret put RESEND_API_KEY                          # optional, ohne Key nur Postausgang
openssl rand -base64 32 | npx wrangler secret put CRON_SECRET  # schützt POST /api/cron
```

`APP_SECRET` nach dem ersten Einrichten nicht mehr ändern: gespeicherte 2FA-Schlüssel lassen sich sonst nicht mehr entschlüsseln (Abhilfe: `pnpm admin:invite --reset-2fa`).

## 3. Datenbank und Deploy

```sh
pnpm db:migrate:remote
pnpm deploy
```

Danach in Cloudflare die eigene Domain als Custom Domain des Workers verbinden.

## 4. Erste Admins

Mit E-Mail-Versand: Beim ersten Aufruf der Login-Seite werden die Adressen aus `INITIAL_ADMINS` angelegt und eingeladen.

Ohne E-Mail-Versand oder als Ersatz:

```sh
pnpm admin:invite --email lerch@gl-ventures.at --name "Vorname Nachname" --remote --site https://www.diha.at
```

Den ausgegebenen Link nur über einen sicheren Kanal weitergeben (7 Tage gültig).

## 5. E-Mail (Resend)

1. Domain bei Resend in der Region EU anlegen, DNS-Einträge (SPF, DKIM) setzen, verifizieren.
2. API-Key mit Sendeberechtigung als `RESEND_API_KEY` hinterlegen.
3. Unter Einstellungen → System prüfen, dass „E-Mail-Versand: eingerichtet“ angezeigt wird.

## 6. Tagesjobs

Der Worker läuft täglich um 05:15 UTC (`triggers.crons` in `wrangler.jsonc`): abgelaufene Genehmigungen markieren, Fristen-Sammelmail an Admins und Manager, Erinnerungen an Projekte, Löschfristen. Manuell: Einstellungen → „Tagesjobs jetzt ausführen“ oder

```sh
curl -X POST -H "Authorization: Bearer $CRON_SECRET" https://www.diha.at/api/cron
```

## 7. Sicherung

- D1 Time Travel stellt die Datenbank auf einen Zeitpunkt der letzten Tage wieder her (`npx wrangler d1 time-travel`). Aufbewahrungsdauer laut Cloudflare-Tarif prüfen.
- Zusätzlich regelmäßig exportieren und getrennt ablegen: `npx wrangler d1 export diha --remote --output backup.sql`.
- R2-Dateien (Unterlagen, Rechnungs-PDFs) werden nicht von Time Travel erfasst; für Rechnungs-PDFs gilt die Aufbewahrungspflicht von 7 Jahren (§ 132 BAO). Sicherung des Buckets einplanen.

## 8. Aktualisieren

```sh
git pull
pnpm install
pnpm db:migrate:remote   # neue Migrationen zuerst
pnpm deploy
```

Migrationen sind vorwärtsgerichtet. `drizzle/0003_invoice_guards.sql` legt Trigger an, die ausgestellte Rechnungen in der Datenbank sperren; Korrekturen nur über Storno/Gutschrift im Portal.
