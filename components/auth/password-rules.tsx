import { Check, X } from "lucide-react";
import { PASSWORD_RULES } from "@/lib/validations/password";
import { cn } from "@/lib/utils";

// Live checklist under a new-password field; each rule turns green as it's met.
export function PasswordRules({ id, password }: { id: string; password: string }) {
  return (
    <ul id={id} className="space-y-1 pt-1">
      {PASSWORD_RULES.map(({ label, test }) => {
        const met = test(password);
        return (
          <li key={label} className={cn("flex items-center gap-1.5 text-xs", met ? "text-credit" : "text-ink-muted")}>
            {met ? <Check className="size-3.5" strokeWidth={2} /> : <X className="size-3.5" strokeWidth={2} />}
            {label}
          </li>
        );
      })}
    </ul>
  );
}
