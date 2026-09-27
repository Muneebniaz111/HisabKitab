"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export type CategoryOption = { id: string; name: string };

export function CategoryManager({
  incomeCategories,
  expenseCategories,
}: {
  incomeCategories: CategoryOption[];
  expenseCategories: CategoryOption[];
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 sm:gap-6">
      <CategoryColumn title="Income Categories" kind="INCOME" categories={incomeCategories} />
      <CategoryColumn title="Expense Categories" kind="EXPENSE" categories={expenseCategories} />
    </div>
  );
}

function CategoryColumn({
  title,
  kind,
  categories,
}: {
  title: string;
  kind: "INCOME" | "EXPENSE";
  categories: CategoryOption[];
}) {
  const router = useRouter();
  const [adding, setAdding] = React.useState(false);
  const [newName, setNewName] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const res = await fetch("/api/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName, kind }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(body?.error ?? "Couldn't add that category.");
      return;
    }
    setNewName("");
    setAdding(false);
    router.refresh();
  }

  return (
    <div className="border border-rule rounded-sm">
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-rule">
        <p className="text-xs uppercase tracking-[0.14em] text-ink-muted">{title}</p>
        <Button variant="ghost" size="icon" onClick={() => setAdding((v) => !v)} aria-label="Add category">
          <Plus className="size-4" strokeWidth={1.75} />
        </Button>
      </div>

      {adding && (
        <form onSubmit={handleAdd} className="flex items-center gap-2 px-5 py-3 border-b border-rule">
          <Input
            autoFocus
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="New category"
            className="h-8 text-sm"
          />
          <Button type="submit" size="icon" className="h-8 w-8" aria-label="Save">
            <Check className="size-3.5" strokeWidth={2} />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setAdding(false)}
            aria-label="Cancel"
          >
            <X className="size-3.5" strokeWidth={2} />
          </Button>
        </form>
      )}
      {error && <p className="px-5 pt-2 text-xs text-debit">{error}</p>}

      {categories.length === 0 ? (
        <p className="px-5 py-6 text-sm text-ink-muted">No categories yet.</p>
      ) : (
        <div className="divide-y divide-rule/60">
          {categories.map((c) => (
            <CategoryRow key={c.id} category={c} />
          ))}
        </div>
      )}
    </div>
  );
}

function CategoryRow({ category }: { category: CategoryOption }) {
  const router = useRouter();
  const [editing, setEditing] = React.useState(false);
  const [name, setName] = React.useState(category.name);
  const [error, setError] = React.useState<string | null>(null);

  async function handleRename(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const res = await fetch(`/api/categories/${category.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (!res.ok) {
      setError("Couldn't rename this category.");
      return;
    }
    setEditing(false);
    router.refresh();
  }

  async function handleDelete() {
    if (!confirm(`Delete category "${category.name}"?`)) return;
    const res = await fetch(`/api/categories/${category.id}`, { method: "DELETE" });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      alert(body?.error ?? "Couldn't delete this category.");
      return;
    }
    router.refresh();
  }

  if (editing) {
    return (
      <form onSubmit={handleRename} className="flex items-center gap-2 px-5 py-2">
        <Input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="h-8 text-sm"
        />
        <Button type="submit" size="icon" className="h-8 w-8" aria-label="Save">
          <Check className="size-3.5" strokeWidth={2} />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => {
            setEditing(false);
            setName(category.name);
          }}
          aria-label="Cancel"
        >
          <X className="size-3.5" strokeWidth={2} />
        </Button>
        {error && <p className="text-xs text-debit ml-1">{error}</p>}
      </form>
    );
  }

  return (
    <div className="flex items-center justify-between px-5 py-2 group">
      <span className="text-sm">{category.name}</span>
      <div className="flex items-center gap-1 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditing(true)} aria-label="Rename">
          <Pencil className="size-3.5" strokeWidth={1.75} />
        </Button>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleDelete} aria-label="Delete">
          <Trash2 className="size-3.5 text-debit" strokeWidth={1.75} />
        </Button>
      </div>
    </div>
  );
}
