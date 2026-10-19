import { BookOpenText, ShieldCheck, PieChart, PiggyBank } from "lucide-react";

const FEATURES = [
  { icon: PieChart, text: "See exactly where every rupee goes" },
  { icon: PiggyBank, text: "Set savings goals and actually reach them" },
  { icon: ShieldCheck, text: "Private by default — amounts stay hidden until you tap" },
];

function Brand({ className }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2 ${className ?? ""}`}>
      <BookOpenText className="size-6" strokeWidth={1.75} />
      <span className="font-display italic text-xl">Hisab-Kitab</span>
    </div>
  );
}

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col lg:grid lg:grid-cols-[1.05fr_1fr] bg-paper text-ink">
      {/* Brand panel — desktop only; phones and tablets get the compact hero below. */}
      <aside className="relative hidden lg:flex flex-col justify-between overflow-hidden bg-accent text-paper p-12 xl:p-16">
        <div aria-hidden className="absolute -top-24 -right-24 size-96 rounded-full bg-paper/10 blur-3xl" />
        <div aria-hidden className="absolute -bottom-32 -left-20 size-[28rem] rounded-full bg-[#3f6f9f]/40 blur-3xl" />

        <Brand className="relative animate-rise" />

        <div className="relative max-w-md animate-rise [animation-delay:120ms]">
          <h2 className="font-display text-4xl xl:text-5xl leading-tight">
            Understand your money. <span className="italic opacity-80">Grow</span> your savings.
          </h2>
          <ul className="mt-10 space-y-4">
            {FEATURES.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3 text-paper/90">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-paper/15">
                  <Icon className="size-4" strokeWidth={1.75} />
                </span>
                {text}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-paper/60">Your personal income, expense &amp; savings ledger.</p>
      </aside>

      <header className="lg:hidden relative overflow-hidden bg-accent text-paper px-6 pt-10 pb-16 sm:px-10">
        <div aria-hidden className="absolute -top-20 -right-16 size-64 rounded-full bg-paper/10 blur-3xl" />
        <div aria-hidden className="absolute -bottom-24 -left-16 size-64 rounded-full bg-[#3f6f9f]/40 blur-3xl" />
        <Brand className="relative animate-rise" />
        <p className="relative mt-6 max-w-xs font-display text-[1.75rem] leading-tight animate-rise [animation-delay:80ms]">
          Understand your money. <span className="italic opacity-80">Grow</span> your savings.
        </p>
      </header>

      {/* On phones the form sheet overlaps the hero's bottom edge; on desktop it's centred in its column. */}
      <main className="relative -mt-8 flex-1 rounded-t-3xl bg-paper px-5 pt-9 pb-[max(2.5rem,env(safe-area-inset-bottom))] sm:px-8 lg:mt-0 lg:flex lg:flex-col lg:justify-center lg:rounded-none lg:py-10">
        <div className="mx-auto w-full max-w-sm animate-rise [animation-delay:120ms]">{children}</div>
      </main>
    </div>
  );
}
