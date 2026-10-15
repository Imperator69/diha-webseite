import { env as cfEnv } from "cloudflare:workers";

export type AppEnv = {
  DB: D1Database;
  FILES: R2Bucket;
  SITE_URL?: string;
  MAIL_FROM?: string;
  INITIAL_ADMINS?: string;
  APP_SECRET?: string;
  RESEND_API_KEY?: string;
  CRON_SECRET?: string;
};

export function appEnv(): AppEnv {
  return cfEnv as unknown as AppEnv;
}
