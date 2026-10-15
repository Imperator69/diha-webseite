import { drizzle } from "drizzle-orm/d1";
import * as schema from "@/db/schema";
import { appEnv } from "./env";

export function db() {
  return drizzle(appEnv().DB, { schema });
}

export type Database = ReturnType<typeof db>;
export { schema };
