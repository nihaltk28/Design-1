import { SvgIcon } from "@/components/ui/SvgIcon";
import type { HomePage } from "@/lib/schemas/home";
import { cn } from "@/lib/utils/cn";

type Visual = HomePage["galleries"]["cards"][number]["visual"];

/** The drawing for each kind of card (public/assets/icons/gallery-*.svg, 140 × 46). */
const DRAWINGS: Record<Visual, string> = {
  bars: "/assets/icons/gallery-bars.svg",
  spectrum: "/assets/icons/gallery-spectrum.svg",
  orbit: "/assets/icons/gallery-orbit.svg",
  rings: "/assets/icons/gallery-rings.svg",
};

/**
 * The small decorative graphic inside a gallery card, in the accent colour so it follows both themes. Purely
 * visual (aria-hidden): the card's title and link say what the gallery is.
 */
export function MiniVisual({
  kind,
  className,
}: {
  kind: Visual;
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "block aspect-[140/46] rounded-sm border border-accent-text/25 bg-accent/5",
        className,
      )}
    >
      <SvgIcon src={DRAWINGS[kind]} className="size-full text-accent-text" />
    </span>
  );
}
