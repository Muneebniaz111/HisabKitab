// Money arithmetic in whole paisa, so totals are exact (0.1 + 0.2 is 0.3,
// not 0.30000000000000004). Amounts stay plain numbers everywhere else
// because they're passed to client components, which can't receive a
// Prisma Decimal. Exact for anything a Decimal(14, 2) column can hold.

const toPaisa = (amount: number) => Math.round(amount * 100);

/** Exact sum of money amounts. Subtract by passing negated values. */
export function sumMoney(amounts: Iterable<number>): number {
  let paisa = 0;
  for (const amount of amounts) paisa += toPaisa(amount);
  return paisa / 100;
}
