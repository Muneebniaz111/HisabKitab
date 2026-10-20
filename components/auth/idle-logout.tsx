"use client";

import { useEffect, useRef, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const WARNING_MS = 60_000;
const PING_EVERY_MS = 10_000;
const LAST_ACTIVITY_KEY = "hk_last_activity"; // shared across tabs
const EVENTS = ["pointerdown", "pointermove", "keydown", "scroll", "touchstart"];

// proxy.ts enforces the timeout; this keeps the server-side session alive while
// the user is active, warns a minute before it runs out, and logs out on time
// when they don't respond. Timestamps (not timer counts) keep it correct when
// Chrome throttles a minimized tab.
export function IdleLogout({ timeoutMs }: { timeoutMs: number }) {
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const staySignedIn = useRef<() => void>(() => {});

  useEffect(() => {
    let last = Date.now();
    let pinged = last;
    const onActivity = () => (last = Date.now());

    async function tick() {
      const idleFor = Date.now() - Math.max(last, Number(localStorage.getItem(LAST_ACTIVITY_KEY)));
      if (idleFor > timeoutMs) {
        await createSupabaseBrowserClient().auth.signOut({ scope: "local" });
        return location.replace("/login");
      }
      const left = timeoutMs - idleFor;
      setSecondsLeft(left <= WARNING_MS ? Math.ceil(left / 1000) : null);

      if (last > pinged && Date.now() - pinged >= PING_EVERY_MS) {
        pinged = last;
        localStorage.setItem(LAST_ACTIVITY_KEY, String(last));
        const res = await fetch("/api/session", { method: "POST" });
        if (res.status === 401) location.replace("/login");
      }
    }

    staySignedIn.current = () => {
      last = Date.now();
      pinged = 0; // refresh the server-side session right away
      tick();
    };

    EVENTS.forEach((e) => addEventListener(e, onActivity, { capture: true, passive: true }));
    document.addEventListener("visibilitychange", tick);
    // Every second so the warning's countdown stays live; pings stay throttled above.
    const interval = setInterval(tick, 1_000);
    return () => {
      EVENTS.forEach((e) => removeEventListener(e, onActivity, { capture: true }));
      document.removeEventListener("visibilitychange", tick);
      clearInterval(interval);
    };
  }, [timeoutMs]);

  return (
    <Dialog open={secondsLeft !== null} onOpenChange={(open) => !open && staySignedIn.current()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Still there?</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-ink-muted">
          You&apos;ll be logged out in {secondsLeft} {secondsLeft === 1 ? "second" : "seconds"} for your security.
        </p>
        <div className="mt-5 flex justify-end">
          <Button onClick={() => staySignedIn.current()}>Stay signed in</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
