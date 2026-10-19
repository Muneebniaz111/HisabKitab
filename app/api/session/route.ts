// Activity heartbeat from components/auth/idle-logout.tsx — proxy.ts does the
// actual check and re-signs the idle cookie; this just has to exist.
export function POST() {
  return new Response(null, { status: 204 });
}
