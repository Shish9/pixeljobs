import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/lib/database.types";
import { getSupabaseEnv } from "./env";

/**
 * Refreshes the Supabase session cookie and forwards it (plus any extra request headers) to Server Components.
 * Returns whether a user is signed in — an optimistic check for redirects only. Authorization is enforced again
 * on the server (getUser) and by RLS.
 */
export async function updateSession(
  request: NextRequest,
  requestHeaders: Headers,
): Promise<{ response: NextResponse; userId: string | null }> {
  let response = NextResponse.next({ request: { headers: requestHeaders } });
  const env = getSupabaseEnv();
  if (!env) return { response, userId: null };

  const supabase = createServerClient<Database>(env.url, env.key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        requestHeaders.set("cookie", request.headers.get("cookie") ?? "");
        response = NextResponse.next({ request: { headers: requestHeaders } });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        Object.entries(headers ?? {}).forEach(([key, value]) => response.headers.set(key, value));
      },
    },
  });

  // getClaims() validates the JWT and refreshes an expired session (triggering setAll).
  const { data } = await supabase.auth.getClaims();
  const sub = data?.claims?.sub;
  return { response, userId: typeof sub === "string" ? sub : null };
}
