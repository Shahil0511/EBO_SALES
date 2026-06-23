"use client";

import { m } from "motion/react";
import { useState } from "react";

import { liftHover, liftRest, liftTransition } from "@/components/motion/hover-lift";
import { inr, num } from "@/lib/format";

export type GalleryProduct = {
  productCode: string;
  category: string;
  imageUrl: string | null;
  variantCount: number;
  netRevenue: number;
  units: number;
  returnsUnits: number;
};

export function ProductCard({
  product,
  onSelect,
}: {
  product: GalleryProduct;
  onSelect: (code: string) => void;
}) {
  const [imgError, setImgError] = useState(false);
  const showImage = product.imageUrl && !imgError;

  return (
    <m.button
      type="button"
      onClick={() => onSelect(product.productCode)}
      initial={liftRest}
      whileHover={liftHover}
      transition={liftTransition}
      className="border-border bg-card group overflow-hidden rounded-xl border text-left"
    >
      <div className="bg-muted relative aspect-square overflow-hidden">
        {showImage ? (
          // External CDN images (Shopify/Myntra), variable hosts → plain img + onError fallback.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.imageUrl ?? ""}
            alt={product.productCode}
            loading="lazy"
            onError={() => setImgError(true)}
            className="size-full object-contain transition-transform group-hover:scale-105"
          />
        ) : (
          <div className="text-muted-foreground grid size-full place-items-center font-mono text-xs">
            {product.productCode}
          </div>
        )}
        {product.returnsUnits > 0 && (
          <span className="bg-destructive/90 absolute top-1.5 right-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-medium text-white">
            ↩ {num(product.returnsUnits)}
          </span>
        )}
      </div>
      <div className="p-2.5">
        <div className="truncate font-mono text-xs">{product.productCode}</div>
        <div className="text-muted-foreground truncate text-[11px]">
          {product.category} · {product.variantCount} size{product.variantCount !== 1 ? "s" : ""}
        </div>
        <div className="mt-1 flex items-center justify-between">
          <span className="text-sm font-medium">{inr(product.netRevenue)}</span>
          <span className="text-muted-foreground text-[11px]">{num(product.units)} sold</span>
        </div>
      </div>
    </m.button>
  );
}
