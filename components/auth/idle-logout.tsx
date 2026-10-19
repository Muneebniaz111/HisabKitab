"use client";

import { useEffect } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

const IDLE_MS = 120_000;
const LAST_ACTIVITY_KEY = "hk_last_activity"; // shared across tabs
const EVENTS = ["pointerdown", "pointermove", "keydown", "scroll", "touchstart"];

// proxy.ts enforces the timeout; this keeps the server-side session alive while
// the user is active and logs out on time when they aren't. Timestamps (not
// timer counts) keep it correct when Chrome throttles a minimized tab.
export function IdleLogout() {
  useEffect(() => {
    let last = Date.now();
    let pinged = last;
    const onActivity = () => (last = Date.now());

    async function tick() {
      if (Date.now() - Math.max(last, Number(localStorage.getItem(LAST_ACTIVITY_KEY))) > IDLE_MS) {
        await createSupabaseBrowserClient().auth.signOut({ scope: "local" });
        return location.replace("/login");
      }
      if (last > pinged) {
        pinged = last;
        localStorage.setItem(LAST_ACTIVITY_KEY, String(last));
        const res = await fetch("/api/session", { method: "POST" });
        if (res.status === 401) location.replace("/login");
      }
    }

    EVENTS.forEach((e) => addEventListener(e, onActivity, { capture: true, passive: true }));
    document.addEventListener("visibilitychange", tick);
    const interval = setInterval(tick, 10_000);
    return () => {
      EVENTS.forEach((e) => removeEventListener(e, onActivity, { capture: true }));
      document.removeEventListener("visibilitychange", tick);
      clearInterval(interval);
    };
  }, []);

  return null;
}
