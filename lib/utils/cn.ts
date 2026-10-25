import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

/**
 * tailwind-merge only knows Tailwind's default scales. Our own type sizes (styles/tokens.css --text-*) must be
 * listed here, or `text-micro` reads as a colour and a later `text-text-muted` silently removes it.
 * Add every new --text-* token to this list (lib/utils/cn.test.ts checks them all).
 */
export const CUSTOM_TEXT_SIZES = [
  "micro",
  "label",
  "nav",
  "lead",
  "display",
  "heading",
  "tagline",
  "card-title",
];

const twMerge = extendTailwindMerge({
  extend: { theme: { text: CUSTOM_TEXT_SIZES } },
});

/** Merge class names; later Tailwind classes win over conflicting earlier ones. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
