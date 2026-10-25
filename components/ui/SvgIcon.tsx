import type { CSSProperties } from "react";
import { cn } from "@/lib/utils/cn";

type SvgIconProps = {
  /** An .svg file in public/assets/icons, e.g. "/assets/icons/logo.svg". */
  src: string;
  /** Size and colour: `size-9 text-accent-text`. The icon takes the current text colour. */
  className?: string;
};

/**
 * A decorative icon from an .svg file, painted in the current text colour — so it follows the light and dark
 * themes like inline SVG did. The file is used as a CSS mask (`svg-icon` in tokens.css): its shape and
 * transparency show through, its own colours don't matter. Always hidden from screen readers — the text next to
 * it (or its parent's label) carries the meaning. Stays visible in Windows high-contrast mode.
 */
export function SvgIcon({ src, className }: SvgIconProps) {
  return (
    <span
      aria-hidden="true"
      style={{ "--icon": `url("${src}")` } as CSSProperties}
      className={cn("inline-block shrink-0 svg-icon", className)}
    />
  );
}
