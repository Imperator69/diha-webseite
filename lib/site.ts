import { appEnv } from "./env";

export function siteUrl(): string {
  return (appEnv().SITE_URL || "http://localhost:5173").replace(/\/$/, "");
}
