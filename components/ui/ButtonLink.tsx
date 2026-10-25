import { cva, type VariantProps } from "class-variance-authority";
import { ArrowUpRight } from "lucide-react";
import type { ComponentProps } from "react";
import { Link } from "@/lib/i18n/navigation";
import { cn } from "@/lib/utils/cn";

/**
 * Pill-shaped call to action with a spaced monospace label. A link (it navigates) — use a <button> for actions
 * that don't. Hover lifts the glow; keyboard focus shows the shared focus-ring.
 */
export const buttonClassName = cva(
  "group/button focus-ring mono-label inline-flex items-center justify-center gap-3 rounded-(--radius-pill) transition-[box-shadow,background-color,border-color] duration-300",
  {
    variants: {
      variant: {
        /** Accent fill with a soft glow — the main action. */
        solid:
          "bg-accent gradient-accent text-on-accent shadow-(--shadow-glow) hover:shadow-(--shadow-glow-strong)",
        /** Outlined, on a faint fill — the secondary action. */
        ghost:
          "border border-border-strong bg-surface-raised text-text hover:border-text-muted",
      },
      size: {
        /** 240 × 48 — the hero. */
        lg: "h-(--size-cta-h) min-w-(--size-cta-w) px-8 text-label",
        /** The announcement bar. */
        sm: "px-3 py-1.5 text-micro",
      },
    },
    defaultVariants: { variant: "solid", size: "lg" },
  },
);

type ButtonLinkProps = ComponentProps<typeof Link> &
  VariantProps<typeof buttonClassName> & {
    /** Trailing ↗ arrow, as in the design. Decorative — mirrored in RTL. */
    arrow?: boolean;
  };

export function ButtonLink({
  variant,
  size,
  arrow,
  className,
  children,
  ...props
}: ButtonLinkProps) {
  return (
    <Link
      className={cn(buttonClassName({ variant, size }), className)}
      {...props}
    >
      {children}
      {arrow ? (
        <ArrowUpRight
          aria-hidden="true"
          className="size-3.5 transition-transform duration-300 group-hover/button:translate-x-0.5 group-hover/button:-translate-y-0.5 rtl:-scale-x-100"
        />
      ) : null}
    </Link>
  );
}
