# LIBAS — Premium Motion Epic (Plan)

> Elevate the functional dashboard into a **premium, motion-driven product** (Linear / Stripe Dashboard /
> Notion / Microsoft 365 grade). Companion to `frontend/plan.md`. Delivered **milestone-by-milestone**
> (you say **DONE** between each); **⌘K command palette included**; **motion first, then F13** (dockerize/CI).

## Context
The dashboard (F1–F12) is functionally complete but **visually flat** — flat cards, abrupt show/hide,
no entrance/feedback motion. Goal: make every interaction feel intentional and alive, *without* distraction.
Motion is an **enhancement layer** — the product must stay fully legible with it off (reduced-motion).

## Operating rules (apply to every UI change)
1. **21st.dev-first sourcing.** Before hand-building any animated component, search **21st.dev** (and the
   shadcn-compatible registries it indexes — magicui, originui, aceternity, kokonutui…), install via
   `npx shadcn@latest add "<registry-url>"`, then **adapt to our tokens** (maroon/cream, the calibration below).
   Hand-build with Framer Motion **only** when no good equivalent exists.
2. shadcn/ui conventions · **Tailwind only** · TypeScript · accessible (keep all the F12 a11y work) ·
   reusable/modular · **mobile-first** · **dark-mode** (our theme already has `.dark` tokens).
3. **No unnecessary deps.** Registry components are mostly *copy-in source* (no runtime weight). The only new
   runtime libs are the justified ones: `motion`, and (later) `sonner`, `cmdk`, `vaul`.
4. Durations **150–300ms**, springs where physical, **never animate everything at once**, respect
   `prefers-reduced-motion`.

---

## The motion system (single source of truth — calibration)
Premium feel = a *small* set of numbers applied everywhere. Tokens live in **`src/lib/motion/`** and are
mirrored into `globals.css` `@theme` so CSS transitions match Framer exactly.

**Library:** `motion` (the renamed Framer Motion, v12 — for React 19/Next 16). Use **`LazyMotion` + `domMax`
+ `strict`** (so we write `<m.div>`, lazy-load features, and keep layout animations for `layoutId` tabs).
Global **`<MotionConfig reducedMotion="user">`** in `providers.tsx` auto-degrades transforms→opacity.

```ts
// src/lib/motion/tokens.ts  — import everywhere; never hardcode a duration
export const DURATION = { micro: 0.14, state: 0.20, overlay: 0.24, layout: 0.30 }; // exits run ~0.8×
export const DURATION_MS = { fast: 150, base: 200, overlay: 240, layout: 300, chart: 800 };
export const EASE = {
  out:      [0.16, 1, 0.3, 1],  // ENTER — strong decel, "arrives and settles"
  standard: [0.4, 0, 0.2, 1],   // hover / reversible micro-motion (the transition-all workhorse)
  in:       [0.4, 0, 1, 1],     // EXIT — accelerate away
};
export const SPRING = {
  card:   { type:"spring", stiffness:480, damping:40, mass:0.8 }, // snappy, ZERO overshoot
  modal:  { type:"spring", stiffness:300, damping:30, mass:1   }, // gentle, faint life
  drawer: { type:"spring", stiffness:240, damping:32, mass:1   }, // heavy, no overshoot
  layout: { type:"spring", stiffness:400, damping:38, mass:1   }, // shared-element / layoutId
};
export const STAGGER = 0.04; // 40ms; cap at 6 visible items
```

**Calibration (the premium tells):**
- **Timing:** hover/micro **140ms** · toggle/state **200ms** · overlay/modal/toast **240ms** · drawer/accordion/sidebar **300ms**. **Exits shorter than enters** (≈0.8×) — dismissals feel decisive.
- **Hover recipe (subtle!):** cards `translateY -2px` + warm ink shadow `0 4px 12px -2px rgba(43,36,32,.10)` (**no scale**); buttons `-1px` + soft shadow (keep the existing `active:translate-y-px`); icons `scale 1.08`; table rows **background only** (`bg-muted/50`). Rule: **lift ≤ 2px, shadow blur ≤ 12px, scale ≤ 1.08** — if you can clearly *see* it, it's too much. Shadows are **warm ink-tinted, never black**.
- **Orchestration:** stagger **40ms** (cap 6) · **in-view gating** (below-the-fold reveals on scroll, `once`) · **only the changed region animates** (filter change → KPIs + charts re-tween; chrome stays still).
- **DO-NOT:** bouncy springs by default · durations >320ms · animating per-keystroke · layout-thrash props (transform/opacity only; accordion height is the one exception) · pure-black shadows / glows · parallax / looping idle · stacking 3+ properties on one element.
- **Reduced-motion:** opacity crossfades ≤120ms, drop all translate/scale/spring/stagger/count-up, render final numbers instantly, accordions/drawers toggle instantly.

---

## 21st.dev sourcing map (search → reuse → adapt)
| Need | Search 21st.dev / registry for | Adapt to us |
|------|-------------------------------|-------------|
| Number count-up | magicui **Number Ticker** / NumberFlow | drive the **raw** value, format with `inr()`/`num()` per frame |
| Skeleton shimmer | registry **shimmer skeleton** | warm-ink highlight (not cold white) |
| Toasts | **sonner** (shadcn) | maroon/cream theme; export/reset/error + Retry |
| Tooltip | **Base UI tooltip** (already installed) or 21st animated tooltip | 400ms open delay, fade+slide |
| Command palette ⌘K | **cmdk** command menu / 21st command palette | scale+fade; wire to filters/search/nav |
| Hover/animated card | magicui **Magic Card** / spotlight | or just our `HoverLift` + the −2px recipe |
| Modal/dialog | 21st animated dialog | or hand `AnimatePresence` per tokens |
| Mobile drawer | **vaul** (shadcn drawer) | `SPRING.drawer` |
| Animated tabs | 21st animated tabs / `layoutId` | maroon underline + content crossfade |
| Empty-state art | 21st empty-state | on-brand line-art (hanger, receipt, magnifier…) |

---

## Milestones (DONE-gated, ~1–3h each)

**M1 · Motion foundation & tokens.** `npm i motion`; `LazyMotion`+`MotionConfig reducedMotion="user"` in
`providers.tsx`; `src/lib/motion/` tokens + reduced-motion helpers; mirror easing/duration into `globals.css`
`@theme`; reusable primitives `Reveal`, `HoverLift`, `AnimatedNumber`, `useShake`, `Skeleton`. *Verify:* build
+ reduced-motion toggle.

**M2 · Micro-interactions (hover/focus/tap).** Card lift (KPI · breakdown · trend · product · section cards);
button elevation + tap (`button.tsx`); icon hover scale; table-row highlight; input focus-border ease.
(21st.dev: magic-card hover if it beats our `HoverLift`.)

**M3 · Entrances & data motion.** Section reveal + stagger + in-view gating; **KPI count-up** (21st Number
Ticker → `AnimatedNumber`, formatted by `inr()`/`num()`); chart load tuning (`isAnimationActive`, 800ms
ease-out) + trend total count-up; breakdown bar grow-in; **skeleton shimmer** everywhere (replace `animate-pulse`).

**M4 · Overlays & transitions.** Product modal **scale+fade** (`AnimatePresence`); search dropdown fade+slide;
mobile drawer spring (vaul or hand); **accordion height** for filter groups (replace `{open && …}`); product
ranking tabs + trend toggle **animated indicator** (`layoutId`) + content crossfade; filter chips add/remove
(`AnimatePresence` + `layout`).

**M5 · Feedback & states.** **Toasts** (sonner) for export started/ready, reset, load-error+Retry; **export
check-morph** + blob download; filter-applied pulse; **error shake** (date/qty invalid, error boundary) +
guiding copy; **empty-state illustrations** (trend/products/transactions/search); **tooltips** (Base UI, 400ms)
for icon buttons, truncated labels, and **KPI definitions** (info icons).

**M6 · Command palette (⌘K).** Source a cmdk-based palette; **scale+fade** dialog (`AnimatePresence`); wire
actions — Navigation (scroll to KPIs/Trend/Products/Transactions), Filters (reset, 30d/90d/MTD presets, channel
toggles), Search (reuse `useSearch` → `setFilters({search})`). Reduced-motion: opacity-only.

**M7 · Polish, a11y & perf pass.** Reduced-motion verification across all; 60fps (transform/opacity only,
isolate changed regions); consistency audit (tokens only, no ad-hoc durations); optional adversarial review.

**F13 · Dockerize + compose + CI (final, post-motion).** Multi-stage `next build`→`next start` (non-root),
`web` service in `docker-compose.yml`, Nginx serves app + proxies `/api/`, CI (lint + tsc + build).

---

## Verification (each milestone)
`tsc --noEmit` + `eslint` clean · page 200 · **you view it live at :3000** · toggle OS reduced-motion and
confirm graceful degradation · the milestone's specific behaviors. Final `next build` before F13.

**Status: plan drafted. Reply DONE to start M1 (motion foundation & tokens).**
