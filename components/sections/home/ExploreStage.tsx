import { ArrowUpRight } from "lucide-react";
import { Link } from "@/lib/i18n/navigation";
import type { HomePage } from "@/lib/schemas/home";
import { cn } from "@/lib/utils/cn";

/**
 * Desktop place of each link: 1–3 down the start column, 4–6 down the end column. Each card's inner edge is cut
 * along a ring round the black hole (design detail); the ring misses the top row.
 */
const PLACES = [
  "lg:col-start-1 lg:row-start-1",
  "lg:col-start-1 lg:row-start-2 lg:card-cut lg:explore-cut-start lg:explore-cut-row-2",
  "lg:col-start-1 lg:row-start-3 lg:card-cut lg:explore-cut-start lg:explore-cut-row-3",
  "lg:col-start-3 lg:row-start-1",
  "lg:col-start-3 lg:row-start-2 lg:card-cut lg:explore-cut-end lg:explore-cut-row-2",
  "lg:col-start-3 lg:row-start-3 lg:card-cut lg:explore-cut-end lg:explore-cut-row-3",
] as const;

type ExploreStageProps = {
  explore: HomePage["explore"];
  /** The "scroll to dive in" cue under the links. */
  cue: string;
  headingLevel?: 2 | 3;
};

/**
 * Stage 7 of the journey, the last: six links around the black hole, three either side, and a cue to scroll on
 * — after which HeroJourney dives into the hole. On phones and tablets the links form a grid. Server-rendered;
 * HeroJourney flies the links out of the hole (`data-anim`).
 */
export function ExploreStage({
  explore,
  cue,
  headingLevel = 2,
}: ExploreStageProps) {
  const Heading = `h${headingLevel}` as const;

  return (
    <div className="flex min-h-svh flex-col items-center justify-center px-(--container-gutter) py-16">
      <Heading
        id="stage-explore-title"
        data-anim="explore-eyebrow"
        className="flex items-center gap-4 mono-label text-label tracking-(--tracking-eyebrow) text-accent-text"
      >
        <span aria-hidden="true" className="h-px w-10 bg-accent-text" />
        {explore.eyebrow}
      </Heading>

      <ul className="mt-12 grid w-full max-w-xl gap-3 sm:grid-cols-2 lg:mt-28 lg:w-auto lg:max-w-none lg:grid-cols-[var(--size-explore-card)_var(--size-explore-gap)_var(--size-explore-card)] lg:grid-rows-[repeat(3,var(--size-explore-row))] lg:gap-x-0 lg:gap-y-10">
        {explore.links.map((link, index) => {
          const end = index >= 3;
          return (
            <li
              key={link.id}
              data-anim="explore-link"
              data-side={end ? "end" : "start"}
              className={PLACES[index]}
            >
              <Link
                href={link.href}
                className={cn(
                  "group flex h-full flex-col justify-center rounded-(--radius-lg) border border-accent-text/30 bg-surface/80 px-4 py-3 focus-ring transition-colors hover:border-accent-text/70 hover:bg-surface-raised/80 focus-visible:border-accent-text/70",
                  end && "lg:items-end lg:text-end",
                )}
              >
                <span
                  className={cn(
                    "flex items-center gap-2 text-lg font-semibold text-text",
                    end && "lg:flex-row-reverse",
                  )}
                >
                  {link.title}
                  <ArrowUpRight
                    aria-hidden="true"
                    className="size-4 shrink-0 text-accent-text transition-transform group-hover:-translate-y-0.5 group-focus-visible:-translate-y-0.5 rtl:-scale-x-100"
                  />
                </span>
                <span className="text-sm text-text-muted">{link.text}</span>
              </Link>
            </li>
          );
        })}
      </ul>

      <div
        data-anim="explore-cue"
        aria-hidden="true"
        className="mt-16 flex flex-col items-center gap-3 lg:mt-44"
      >
        <span className="mono-label text-label text-text">{cue}</span>
        <span className="relative h-10 w-px overflow-hidden bg-border">
          <span className="absolute inset-0 animate-cue bg-accent-text" />
        </span>
      </div>
    </div>
  );
}
