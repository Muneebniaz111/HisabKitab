import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { IDLE_COOKIE, activityCookie, isActive } from "@/lib/idle-session";

const PUBLIC_PATHS = ["/login", "/signup", "/forgot-password", "/auth/callback"];

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    }
  );

  // Refreshes the session if the access token has expired — must be called
  // on every request that touches auth state, per @supabase/ssr's contract.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isPublicPath = PUBLIC_PATHS.some((p) => pathname.startsWith(p));
  const active = !!user && isActive(request.cookies.get(IDLE_COOKIE)?.value, user.id);

  // Idle past IDLE_TIMEOUT_MS or browser was closed: revoke the session server-side too.
  if (user && !active) await supabase.auth.signOut({ scope: "local" });
  if (active) response.cookies.set(activityCookie(user.id));

  if (!active && !isPublicPath && pathname.startsWith("/api/")) {
    return withRefreshedCookies(NextResponse.json({ error: "Session expired" }, { status: 401 }), response);
  }

  if (!active && !isPublicPath) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return withRefreshedCookies(NextResponse.redirect(url), response);
  }

  if (active && (pathname === "/login" || pathname === "/signup")) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    url.search = "";
    return withRefreshedCookies(NextResponse.redirect(url), response);
  }

  return response;
}

// A redirect (either branch above) is a fresh response object, so any
// session cookies refreshed by getUser() above — which were set on
// `response`, not on a redirect — would otherwise be dropped. Copying
// them across means a token refresh never gets lost just because the
// same request also happened to redirect.
function withRefreshedCookies(redirect: NextResponse, source: NextResponse): NextResponse {
  source.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
  return redirect;
}

export const config = {
  matcher: [
    // Every route except static assets and the root redirect handler.
    "/((?!_next/static|_next/image|favicon.ico|api/cron).*)",
  ],
};