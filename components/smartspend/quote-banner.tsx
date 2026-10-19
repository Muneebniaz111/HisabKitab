import { Sparkles } from "lucide-react";
import { db } from "@/lib/db";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { pickForSession } from "@/lib/smartspend";

// Motivational quote from the `quotes` table — one per login session.
export async function QuoteBanner() {
  const supabase = await createSupabaseServerClient();
  const [quotes, { data: claims }] = await Promise.all([
    db.quote.findMany({ where: { isActive: true }, orderBy: { createdAt: "asc" } }),
    supabase.auth.getClaims(),
  ]);
  const quote = pickForSession(quotes, claims?.claims.session_id);
  if (!quote) return null;

  return (
    <figure className="flex items-start gap-3 rounded-sm bg-accent text-paper px-5 py-4 sm:px-6">
      <Sparkles className="size-5 shrink-0 mt-0.5 opacity-90" strokeWidth={1.75} />
      <div className="min-w-0">
        <blockquote className="font-display text-base sm:text-lg leading-snug">&ldquo;{quote.text}&rdquo;</blockquote>
        {quote.author && <figcaption className="text-xs opacity-80 mt-1">— {quote.author}</figcaption>}
      </div>
    </figure>
  );
}
