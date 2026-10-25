import { ArrowUpRight } from "lucide-react";
import { Link } from "@/lib/i18n/navigation";
import type { HomePage } from "@/lib/schemas/home";
import { cn } from "@/lib/utils/cn";
import { MiniVisual } from "./MiniVisual";

type GalleriesStageProps = {
  galleries: HomePage["galleries"];
  headingLevel?: 2 | 3;
};

/** Where each card sits around the black hole (md and up) and which way its inner edge is cut. */
const PLACES = [
  { side: "start", cut: "md:cut-start-top" },
  { side: "end", cut: "md:cut-end-top" },
  { side: "start", cut: "md:cut-start-bottom" },
  { side: "end", cut: "md:cut-end-bottom" },
] as const;

/**
 * Stage 2 of the journey: four gallery cards around the black hole, a heading above it and a tagline below.
 * Server-rendered; HeroJourney animates it on scroll through the `data-anim` attributes. From md up the cards
 * sit in two columns either side of the hole; on phones they form a 2 × 2 grid.
 */
export function GalleriesStage({
  galleries,
  headingLevel = 2,
}: GalleriesStageProps) {
  const Heading = `h${headingLevel}` as const;
  const CardHeading = `h${headingLevel + 1}` as "h3" | "h4";

  return (
    <div className="flex h-full flex-col items-center justify-center gap-8 px-(--container-gutter) py-20 md:gap-12">
      <Heading
        id="stage-galleries-title"
        data-anim="eyebrow"
        className="flex items-center gap-4 mono-label text-label tracking-(--tracking-eyebrow) text-accent-text"
      >
        <span aria-hidden="true" className="h-px w-10 bg-accent-text" />
        {galleries.eyebrow}
      </Heading>

      <ul className="grid w-full max-w-(--size-gallery-span) grid-cols-2 gap-3 md:grid-cols-[var(--size-gallery-card)_1fr_var(--size-gallery-card)] md:gap-x-0 md:gap-y-20">
        {galleries.cards.map((card, index) => {
          const place = PLACES[index];
          const end = place.side === "end";
          return (
            <li
              key={card.id}
              data-anim="card"
              data-side={place.side}
              // Columns 1 and 3 from md up (the middle one is the black hole); cards 3–4 wrap to row 2.
              className={end ? "md:col-start-3" : "md:col-start-1"}
            >
              <article
                className={cn(
                  "flex h-full flex-col gap-4 rounded-(--radius-lg) border border-accent-text/25 bg-surface/85 p-4 md:card-cut md:p-5",
                  place.cut,
                  end && "md:items-end md:text-end",
                )}
              >
                <CardHeading className="text-card-title font-semibold tracking-(--text-tagline--letter-spacing) text-text">
                  <span className="text-accent-text">{`${index + 1}.`}</span>{" "}
                  {card.title}
                </CardHeading>
                <MiniVisual
                  kind={card.visual}
                  className="h-auto w-full max-w-(--size-mini-visual)"
                />
                <Link
                  href={card.link.href}
                  className="mt-auto inline-flex items-center gap-1.5 rounded-sm mono-label text-micro text-accent-text focus-ring"
                >
                  {card.link.label}
                  <ArrowUpRight
                    aria-hidden="true"
                    className="size-3 rtl:-scale-x-100"
                  />
                </Link>
              </article>
            </li>
          );
        })}
      </ul>

      <p
        data-anim="tagline"
        className="max-w-xl text-center text-tagline font-semibold text-text"
      >
        {galleries.tagline}
      </p>
    </div>
  );
}
