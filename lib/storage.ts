import { appEnv } from "@/lib/env";
import { newId } from "@/lib/ids";

export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

export const documentMimeTypes: Record<string, string> = {
  "application/pdf": "pdf",
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
  "application/vnd.oasis.opendocument.text": "odt",
  "text/plain": "txt",
  "text/csv": "csv",
  "application/vnd.google-earth.kml+xml": "kml",
  "application/zip": "zip",
};

export const imageMimeTypes: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};

/** Prüft Typ und Größe; liefert die Dateiendung oder null. */
export function validateUpload(file: unknown, allowed: Record<string, string>, maxBytes = MAX_UPLOAD_BYTES): { file: File; ext: string } | null {
  if (!(file instanceof File) || file.size === 0 || file.size > maxBytes) return null;
  const ext = allowed[file.type];
  if (!ext) return null;
  return { file, ext };
}

/** Speichert in R2 unter einem nicht erratbaren Schlüssel. */
export async function storeFile(prefix: string, file: File, ext: string): Promise<string> {
  const key = `${prefix}/${new Date().toISOString().slice(0, 7)}/${newId()}.${ext}`;
  await appEnv().FILES.put(key, await file.arrayBuffer(), { httpMetadata: { contentType: file.type } });
  return key;
}

export async function readFile(key: string) {
  return appEnv().FILES.get(key);
}

export async function deleteFile(key: string) {
  await appEnv().FILES.delete(key);
}

/** Dateiname für Content-Disposition (RFC 5987). */
export function contentDisposition(name: string, inline: boolean): string {
  const ascii = name.replace(/[^\x20-\x7e]/g, "_").replace(/["\\]/g, "_");
  return `${inline ? "inline" : "attachment"}; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(name)}`;
}
