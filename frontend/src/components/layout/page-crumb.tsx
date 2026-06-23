"use client";

import { ChevronRight } from "lucide-react";
import Link from "next/link";

import { serializeFilters } from "@/lib/filters";
import { useFilters } from "@/lib/use-filters";

/** "Dashboard / <title>" breadcrumb for detail pages; the Dashboard link keeps the filters. */
export function PageCrumb({ title }: { title: string }) {
  const { filters } = useFilters();
  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-sm">
      <Link
        href={`/?${serializeFilters(filters).toString()}`}
        className="text-muted-foreground hover:text-foreground transition-colors"
      >
        Dashboard
      </Link>
      <ChevronRight className="text-muted-foreground/50 size-3.5" />
      <span className="font-medium">{title}</span>
    </nav>
  );
}
