export function PageHeader({
  eyebrow,
  title,
  action,
}: {
  eyebrow: string;
  title: string;
  action?: React.ReactNode;
}) {
  return (
    // h-16 matches the sidebar's brand row height exactly (see the aside's
    // logo box in (app)/layout.tsx) — the two borders line up flush across
    // the top of the app regardless of which page you're on.
    <div className="h-16 flex items-center justify-between gap-4 px-4 sm:px-6 lg:px-10 border-b border-rule">
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-[0.14em] text-ink-muted leading-none mb-1 truncate">
          {eyebrow}
        </p>
        <h1 className="font-display text-lg sm:text-xl leading-none truncate">{title}</h1>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
