"use client";

import { ArrowLeft, ChevronRight, Home } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { serializeFilters } from "@/lib/filters";
import { useFilters } from "@/lib/use-filters";

/**
 * Detail-page breadcrumb: a Back button (one step up, however deep you've nested) plus a
 * Home → Dashboard link that always jumps to the top, both preserving the active filters.
 */
export function PageCrumb({ title }: { title: string }) {
  const { filters } = useFilters();
  const router = useRouter();
  const qs = serializeFilters(filters).toString();
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => router.back()}
        aria-label="Go back"
        title="Go back"
        className="border-border text-muted-foreground hover:bg-muted hover:text-foreground inline-flex size-7 shrink-0 items-center justify-center rounded-md border transition-colors"
      >
        <ArrowLeft className="size-4" />
      </button>
      <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1.5 text-sm">
        <Link
          href={`/?${qs}`}
          className="text-muted-foreground hover:text-foreground inline-flex shrink-0 items-center gap-1 transition-colors"
        >
          <Home className="size-3.5" /> Dashboard
        </Link>
        <ChevronRight className="text-muted-foreground/50 size-3.5 shrink-0" />
        <span className="truncate font-medium">{title}</span>
      </nav>
    </div>
  );
}
