export function ComingInPhase({ phase, note }: { phase: string; note: string }) {
  return (
    <div className="mx-4 sm:mx-6 lg:mx-10 mt-8 rounded-sm border border-dashed border-rule bg-surface px-6 py-8">
      <p className="text-xs uppercase tracking-[0.14em] text-accent mb-2">{phase}</p>
      <p className="text-ink-muted max-w-md">{note}</p>
    </div>
  );
}
