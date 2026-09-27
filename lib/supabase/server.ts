import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

// Server Components can read cookies but not write them (Next.js
// restriction) — the `catch` below is intentional: middleware.ts is what
// actually persists refreshed session cookies, this client just needs to
// not crash when called from a context that can only read.
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {
            // Called from a Server Component render — middleware handles
            // the actual persistence of refreshed sessions.
          }
        },
      },
    }
  );
}
