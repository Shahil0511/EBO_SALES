import { z } from "zod";

/**
 * The dashboard's filter state — a 1:1 mirror of the backend's `AnalyticsFilters`.
 * The URL query string is the single source of truth; this module parses/serializes it.
 * (Pure functions only — the React hook lives in `use-filters.ts`.)
 */
export type Filters = {
  dateFrom: string; // YYYY-MM-DD
  dateTo: string; // YYYY-MM-DD (inclusive, per the backend)
  stores: string[];
  brands: string[];
  categories: string[];
  channels: string[];
  salespersons: string[];
  products: string[];
  qtyMin: number | null;
  qtyMax: number | null;
  search: string | null;
};

const MULTI_KEYS = [
  "stores",
  "brands",
  "categories",
  "channels",
  "salespersons",
  "products",
] as const;

function isoDate(d: Date): string {
  // Local date parts (not toISOString, which is UTC and can shift the day near midnight).
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function numberOrNull(value: string | null): number | null {
  if (value === null || value.trim() === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

/** Default view when the URL carries no filters: the last 30 days. */
export function defaultFilters(): Filters {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - 29);
  return {
    dateFrom: isoDate(from),
    dateTo: isoDate(to),
    stores: [],
    brands: [],
    categories: [],
    channels: [],
    salespersons: [],
    products: [],
    qtyMin: null,
    qtyMax: null,
    search: null,
  };
}

/** URL query string → Filters (missing params fall back to defaults). */
export function parseFilters(sp: URLSearchParams): Filters {
  const d = defaultFilters();
  return {
    dateFrom: sp.get("dateFrom") ?? d.dateFrom,
    dateTo: sp.get("dateTo") ?? d.dateTo,
    stores: sp.getAll("stores"),
    brands: sp.getAll("brands"),
    categories: sp.getAll("categories"),
    channels: sp.getAll("channels"),
    salespersons: sp.getAll("salespersons"),
    products: sp.getAll("products"),
    qtyMin: numberOrNull(sp.get("qtyMin")),
    qtyMax: numberOrNull(sp.get("qtyMax")),
    search: sp.get("search") || null,
  };
}

/** Filters → URL query string (empties omitted so URLs stay clean & shareable). */
export function serializeFilters(f: Filters): URLSearchParams {
  const sp = new URLSearchParams();
  sp.set("dateFrom", f.dateFrom);
  sp.set("dateTo", f.dateTo);
  for (const key of MULTI_KEYS) {
    for (const value of f[key]) sp.append(key, value);
  }
  if (f.qtyMin !== null) sp.set("qtyMin", String(f.qtyMin));
  if (f.qtyMax !== null) sp.set("qtyMax", String(f.qtyMax));
  if (f.search) sp.set("search", f.search);
  return sp;
}

/**
 * Filters → the query object passed to the typed API client
 * (`api.GET(..., { params: { query: toQueryParams(filters) } })`). Empty values become
 * `undefined`, which openapi-fetch omits from the request.
 */
export function toQueryParams(f: Filters) {
  return {
    dateFrom: f.dateFrom,
    dateTo: f.dateTo,
    stores: f.stores.length ? f.stores : undefined,
    brands: f.brands.length ? f.brands : undefined,
    categories: f.categories.length ? f.categories : undefined,
    channels: f.channels.length ? f.channels : undefined,
    salespersons: f.salespersons.length ? f.salespersons : undefined,
    products: f.products.length ? f.products : undefined,
    qtyMin: f.qtyMin ?? undefined,
    qtyMax: f.qtyMax ?? undefined,
    search: f.search ?? undefined,
  };
}

/** Zod schema for the filter form (F5), mirroring the backend's cross-field rules. */
export const filterFormSchema = z
  .object({
    dateFrom: z.string().min(1),
    dateTo: z.string().min(1),
    qtyMin: z.number().int().nullable(),
    qtyMax: z.number().int().nullable(),
    search: z.string().nullable(),
  })
  .refine((v) => v.dateFrom <= v.dateTo, {
    message: "From date must be on or before To date",
    path: ["dateTo"],
  })
  .refine((v) => v.qtyMin === null || v.qtyMax === null || v.qtyMin <= v.qtyMax, {
    message: "Min quantity must be ≤ max",
    path: ["qtyMax"],
  });

export type FilterFormValues = z.infer<typeof filterFormSchema>;
