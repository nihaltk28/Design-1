import {
  ArrowUpRight,
  Gem,
  Moon,
  RadioTower,
  Rocket,
  Satellite,
  Timer,
  type LucideIcon,
} from "lucide-react";
import { Link } from "@/lib/i18n/navigation";
import type { HomePage } from "@/lib/schemas/home";
import { cn } from "@/lib/utils/cn";

type Exhibits = HomePage["exhibits"];

const ICON: Record<Exhibits["items"][number]["icon"], LucideIcon> = {
  meteorite: Gem,
  moon: Moon,
  capsule: Rocket,
  satellite: Satellite,
  dish: RadioTower,
  clock: Timer,
};

/**
 * Desktop place of each card: items 1–3 down the start column, 4–6 down the end column (the middle one is the
 * black hole). The middle row sits a little further in (design detail).
 */
const PLACES = [
  "lg:col-start-1 lg:row-start-1",
  "lg:col-start-1 lg:row-start-2 lg:relative lg:start-4",
  "lg:col-start-1 lg:row-start-3",
  "lg:col-start-3 lg:row-start-1",
  "lg:col-start-3 lg:row-start-2 lg:relative lg:end-4",
  "lg:col-start-3 lg:row-start-3",
] as const;

/**
 * Lines from each card's inner edge towards the black hole, in a 100 × 100 box stretched over the card grid
 * (columns 2fr · 5fr · 2fr → the inner edges at 22.2% and 77.8%). Symmetric, so they need no RTL mirroring.
 */
const LINES = [
  "M22.2 14 C31 14 31 40 39 43",
  "M23.6 50 L38 50",
  "M22.2 86 C31 86 31 60 39 57",
  "M77.8 14 C69 14 69 40 61 43",
  "M76.4 50 L62 50",
  "M77.8 86 C69 86 69 60 61 57",
];

type ExhibitsStageProps = {
  exhibits: Exhibits;
  headingLevel?: 2 | 3;
};

/**
 * Stage 5 of the journey: six featured objects around the black hole, each joined to it by a glowing line, with
 * the title below. On phones and tablets the cards form a grid under the title, without lines. Server-rendered;
 * HeroJourney flies the cards in from the black hole, draws the lines and lifts the title (`data-anim`).
 */
export function ExhibitsStage({
  exhibits,
  headingLevel = 2,
}: ExhibitsStageProps) {
  const Heading = `h${headingLevel}` as const;
  const CardHeading = `h${headingLevel + 1}` as "h3" | "h4";

  return (
    <div className="mx-auto flex min-h-svh w-full max-w-(--size-journey) flex-col justify-center px-(--container-gutter) py-16">
      <p
        data-anim="exhibits-eyebrow"
        className="flex items-center justify-center gap-4 mono-label text-label tracking-(--tracking-eyebrow) text-accent-text"
      >
        <span aria-hidden="true" className="h-px w-10 bg-accent-text" />
        {exhibits.eyebrow}
      </p>

      {/* First in the reading order; below the cards on desktop. */}
      <div
        data-anim="exhibits-head"
        className="mt-6 text-center lg:order-last lg:mt-10"
      >
        <Heading
          id="stage-exhibits-title"
          className="text-heading font-bold text-text"
        >
          {exhibits.title}
        </Heading>
        {exhibits.text ? (
          <p className="mt-5 mono-label text-label tracking-(--tracking-eyebrow) text-text">
            {exhibits.text}
          </p>
        ) : null}
      </div>

      <div className="relative mt-12 lg:mt-10">
        <svg
          data-anim="exhibits-lines"
          aria-hidden="true"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          className="absolute inset-0 hidden size-full overflow-visible drop-shadow-glow lg:block"
        >
          {LINES.map((d) => (
            <path
              key={d}
              d={d}
              fill="none"
              strokeWidth="1.5"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
              className="stroke-accent-text"
            />
          ))}
        </svg>

        <ul className="relative grid gap-3 sm:grid-cols-2 lg:grid-cols-[2fr_5fr_2fr] lg:grid-rows-3 lg:gap-x-0 lg:gap-y-8">
          {exhibits.items.map((item, index) => {
            const Icon = ICON[item.icon];
            const end = index >= 3;
            return (
              <li
                key={item.id}
                data-anim="exhibit"
                data-side={end ? "end" : "start"}
                className={PLACES[index]}
              >
                <article className="relative flex h-full flex-col rounded-(--radius-lg) border border-border bg-surface/85 p-5 shadow-lg">
                  {/* Where the line meets the card (design detail). */}
                  <span
                    aria-hidden="true"
                    className={cn(
                      "absolute top-1/2 hidden size-1.5 -translate-y-1/2 rounded-(--radius-pill) bg-accent-text lg:block",
                      end ? "-start-0.75" : "-end-0.75",
                    )}
                  />
                  <div className="flex items-center gap-4">
                    <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-(--radius-md) border border-accent-text/40 bg-accent/10 text-accent-text">
                      <Icon
                        aria-hidden="true"
                        className="size-5"
                        strokeWidth={1.5}
                      />
                    </span>
                    <CardHeading className="mono-label text-sm font-medium text-text">
                      {item.name}
                    </CardHeading>
                  </div>
                  <p className="mt-4 mb-5 text-sm text-text">{item.text}</p>
                  <Link
                    href={item.link.href}
                    className="mt-auto flex items-center justify-between gap-3 rounded-sm border-t border-border pt-3 mono-label text-micro text-accent-text focus-ring"
                  >
                    {item.link.label}
                    <ArrowUpRight
                      aria-hidden="true"
                      className="size-3 shrink-0 rtl:-scale-x-100"
                    />
                  </Link>
                </article>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
