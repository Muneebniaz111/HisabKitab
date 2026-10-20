"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { signOut } from "@/app/(auth)/actions";

export function SignOutButton() {
  const router = useRouter();

  async function handleSignOut() {
    await signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <button
      onClick={handleSignOut}
      className="flex items-center gap-1.5 text-xs text-ink-muted hover:text-ink transition-colors"
    >
      <LogOut className="size-3.5" strokeWidth={1.75} />
      Sign out
    </button>
  );
}
