// Indian number + currency formatting (lakh / crore), matching the prototype.

const nfIN = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 });

/** Integer with Indian digit grouping (e.g. 1,23,456). */
export function num(value: number | null | undefined): string {
  return nfIN.format(Math.round(value ?? 0));
}

/** Compact ₹ with crore/lakh suffixes (₹29.77 Cr · ₹1.27 L · ₹4,999). */
export function inr(value: number | null | undefined): string {
  const v = value ?? 0;
  const abs = Math.abs(v);
  if (abs >= 1e7) return `₹${(v / 1e7).toFixed(2)} Cr`;
  if (abs >= 1e5) return `₹${(v / 1e5).toFixed(2)} L`;
  return `₹${nfIN.format(Math.round(v))}`;
}

/** Full ₹ amount with grouping, no suffix (for tooltips/titles). */
export function inrFull(value: number | null | undefined): string {
  return `₹${nfIN.format(Math.round(value ?? 0))}`;
}
