import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/app-shell/sidebar";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-paper text-ink">
      <Sidebar userEmail={user?.email} />
      <main className="flex-1 min-w-0">{children}</main>
    </div>
  );
}
