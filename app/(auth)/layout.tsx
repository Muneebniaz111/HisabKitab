import { BookOpenText } from "lucide-react";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-paper text-ink px-4">
      <div className="flex items-center gap-2 mb-8">
        <BookOpenText className="size-6 text-accent" strokeWidth={1.75} />
        <span className="font-display italic text-xl">Hisab-Kitab</span>
      </div>
      <div className="w-full max-w-sm border border-rule bg-surface rounded-sm p-8">{children}</div>
    </div>
  );
}
