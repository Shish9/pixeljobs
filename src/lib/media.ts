import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { AVATAR_TYPES, MEDIA_MAX_BYTES, sniffImageType } from "@/lib/validation";

export type UploadResult = { ok: true; path: string } | { ok: false; error: string };

/**
 * Validates an uploaded image on the server (size + magic bytes, never the browser's MIME type) and stores it in the
 * public `media` bucket under "<user id>/<random>.<ext>" so storage RLS applies. Empty input = no upload.
 */
export async function uploadMedia(
  supabase: SupabaseClient<Database>,
  userId: string,
  file: FormDataEntryValue | null,
): Promise<UploadResult | null> {
  if (!(file instanceof File) || file.size === 0) return null;
  if (file.size > MEDIA_MAX_BYTES) return { ok: false, error: "errors.uploadSize" };
  const bytes = new Uint8Array(await file.arrayBuffer());
  const type = sniffImageType(bytes);
  if (!type) return { ok: false, error: "errors.uploadType" };
  const path = `${userId}/${crypto.randomUUID()}.${AVATAR_TYPES[type]}`;
  const { error } = await supabase.storage.from("media").upload(path, bytes, { contentType: type, cacheControl: "31536000", upsert: false });
  return error ? { ok: false, error: "errors.generic" } : { ok: true, path };
}

export async function removeMedia(supabase: SupabaseClient<Database>, userId: string, path: string | null | undefined) {
  if (path?.startsWith(`${userId}/`)) await supabase.storage.from("media").remove([path]);
}
