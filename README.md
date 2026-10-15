# DIHA Testzentrum Eibenstein: Website und Portal

Öffentliche Website (DE/EN) des DIHA Testzentrums in Eibenstein (NÖ) und Portal für die Buchung und Verwaltung des Testgeländes.

- **Website:** Landingpage, Gelände-Explorer, Kontaktformular, Impressum und Datenschutz (DE/EN), SEO (hreflang, Sitemap, JSON-LD, OG-Bilder). Keine Cookies ohne Nutzeraktion, keine Requests an Dritte.
- **Portal (Projekte):** Buchungsassistent mit Karte und Kalender, Pflichtpersonen und -unterlagen je Nutzungsart, Status, Dokumente, Rechnungen.
- **Portal (Admin/Manager):** Buchungsprüfung mit Checkliste, Kalender, Zonen- und Karteneditor, Slot-Vorlagen, Sperrzeiten, Nutzungsarten, Genehmigungsregister mit Fristen, Dokumente, Vorkommnisse, Rechnungen (§ 11 UStG) mit Zahlungseingang und Storno, Auswertungen mit CSV-Export, Benutzer- und Projektverwaltung, Audit-Log.

## Technik

| Bereich | Umsetzung |
|---|---|
| Framework | [vinext](https://github.com/cloudflare/vinext) (Next.js App Router auf Vite), React 19, TypeScript |
| Hosting | Cloudflare Workers (`worker/index.ts`: Requests und täglicher Cron) |
| Daten | Cloudflare D1 (SQLite) mit Drizzle, Migrationen in `drizzle/` |
| Dateien | Cloudflare R2 (Jurisdiktion EU), Auslieferung nur über geprüfte Routen |
| E-Mail | Resend-API; ohne Key landen Nachrichten im Postausgang (Admin) |
| UI | Tailwind CSS 4, eigene Komponenten, Inter selbst gehostet |
| PDF | pdf-lib (Rechnungen) |
| Tests | Vitest (Logik), Playwright (End-to-End gegen den gebauten Worker) |

## Lokal starten

Voraussetzungen: Node 22, pnpm 10.

```sh
pnpm install
cp .dev.vars.example .dev.vars          # APP_SECRET und CRON_SECRET setzen
pnpm db:migrate:local                   # D1 lokal anlegen (.wrangler/state)
pnpm build && pnpm start                # gebauter Worker auf http://localhost:8787
pnpm admin:invite --email lerch@gl-ventures.at --local --site http://localhost:8787
```

Der letzte Befehl gibt einen Einladungslink aus. Damit Passwort setzen, danach 2FA einrichten (Pflicht für Admins und Manager).

`pnpm dev` startet den Vite-Entwicklungsserver (Port 5173).

## Befehle

| Befehl | Zweck |
|---|---|
| `pnpm typecheck` / `pnpm lint` | TypeScript, ESLint |
| `pnpm test` | Unit-Tests (Regelwerk, Preise, Rechnungen, Intervalle, TOTP, i18n) |
| `pnpm test:e2e` | Build und Playwright-Tests gegen frische lokale Daten (`.wrangler/e2e`). Vorinstalliertes Chromium über `CHROMIUM_PATH` |
| `pnpm db:generate` | Migration aus `db/schema.ts` erzeugen |
| `pnpm db:migrate:local` / `pnpm db:migrate:remote` | Migrationen anwenden |
| `pnpm admin:invite --email … [--local\|--remote] --site …` | Admin-Einladung erzeugen (`--reset-2fa` setzt 2FA zurück) |
| `pnpm deploy` | Build und Deploy zu Cloudflare |
| `node scripts/gen-seed.ts` | `drizzle/0001_seed.sql` aus `lib/seed-data.ts` neu erzeugen |
| `node scripts/gen-og.mjs` | OG-Bilder in `public/og/` neu rendern |

## Aufbau

```
app/[locale]/(site)/      Website (de/en), Impressum, Datenschutz
app/[locale]/portal/      Portal: (auth) Login/Einladung/2FA, (app) alle Bereiche
app/api/                  Uploads, Downloads, Rechnungs-PDF, CSV-Export, Cron
components/               ui, site, site-map (Karte), booking, invoices, charts, portal
lib/                      auth, rules (Buchungsregeln), invoices, analytics, jobs, mail, i18n
db/schema.ts, drizzle/    Datenmodell und Migrationen
content/                  Texte der Website und Rechtstexte
docs/                     Deployment, Betrieb, Datenschutz
```

## Rollen

| Rolle | Rechte |
|---|---|
| Admin | alles, zusätzlich Benutzer, Einstellungen, Audit-Log, Postausgang |
| Manager | Gelände, Buchungsprüfung, Dokumente, Genehmigungen, Rechnungen, Auswertungen, Projekte, Anfragen |
| Projekt | eigene Projekte: buchen, Unterlagen, Status, eigene Rechnungen |

Rechte werden serverseitig in jeder Seite, Aktion und API-Route geprüft (`lib/auth/rbac.ts`, `lib/auth/current.ts`).

## Weiter

- [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md): Cloudflare einrichten, Secrets, erste Admins
- [docs/BETRIEB.md](docs/BETRIEB.md): Abläufe im Portal
- [docs/DSGVO.md](docs/DSGVO.md): Verarbeitungsverzeichnis (Vorlage), TOM, Löschfristen

Hinweis: Das Repository ist öffentlich. Keine vertraulichen Inhalte, Zugangsdaten oder Kundendaten einchecken.
