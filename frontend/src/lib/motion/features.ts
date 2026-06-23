// Lazy-loaded feature bundle for <LazyMotion> (see providers.tsx). Imported via dynamic
// import() so motion's animation engine is code-split out of the initial JS payload.
//
// domMax (not domAnimation) because we need LAYOUT animations — the `layoutId` shared-element
// tab underline (product gallery / trend toggle) and accordion height in later milestones.
import { domMax } from "motion/react";

export default domMax;
