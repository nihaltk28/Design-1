import {
  Atom,
  BookOpen,
  Earth,
  FlaskConical,
  Landmark,
  Orbit,
  Projector,
  Sparkles,
  Sprout,
  Star,
  Sun,
  Telescope,
  type LucideIcon,
} from "lucide-react";
import { Link } from "@/lib/i18n/navigation";
import type { HomePage } from "@/lib/schemas/home";
import { cn } from "@/lib/utils/cn";

type Journey = HomePage["journey"];

const STEP_ICON: Record<Journey["steps"][number]["icon"], LucideIcon> = {
  bang: Sparkles,
  stars: Star,
  galaxy: Orbit,
  sun: Sun,
  earth: Earth,
  life: Sprout,
  telescope: Telescope,
};

const PLACE_ICON: Record<Journey["places"][number]["icon"], LucideIcon> = {
  gallery: Landmark,
  star: Atom,
  planetarium: Projector,
  observatory: Telescope,
  lab: FlaskConical,
  library: BookOpen,
};

type JourneyStageProps = {
  journey: Journey;
  labels: { places: string };
  headingLevel?: 2 | 3;
};

/**
 * Stage 3 of the journey: a frosted panel that scrolls up over the black hole, with a heading and seven steps
 * from the Big Bang to today. Each step lists the museum places where you can see it — on desktop as tiles above
 * or below its card, joined by a line (design detail); on phones and tablets under the card's text. Server-
 * rendered; HeroJourney reveals the heading and steps on scroll through the `data-anim` attributes.
 */
export function JourneyStage({
  journey,
  labels,
  headingLevel = 2,
}: JourneyStageProps) {
  const Heading = `h${headingLevel}` as const;
  const StepHeading = `h${headingLevel + 1}` as "h3" | "h4";
  const places = new Map(journey.places.map((place) => [place.id, place]));
  const lines = journey.title.split("\n");

  // Desktop: a fixed-height row of tiles above or below the card, joined to it by a short line. Phones and
  // tablets: the tiles simply follow the card.
  const tiles = (ids: string[], position: "above" | "below") => {
    const place = position === "above" ? "lg:order-first lg:mb-6" : "lg:mt-6";
    if (!ids.length)
      // An empty row keeps the seven columns lined up.
      return (
        <span
          aria-hidden="true"
          className={cn("hidden lg:block lg:h-(--size-place-row)", place)}
        />
      );
    return (
      <ul
        aria-label={labels.places}
        className={cn(
          "relative mt-3 flex gap-2 lg:mt-0 lg:h-(--size-place-row)",
          place,
          "lg:before:absolute lg:before:start-1/2 lg:before:h-6 lg:before:w-px lg:before:bg-border-strong",
          position === "above" ? "lg:before:top-full" : "lg:before:bottom-full",
        )}
      >
        {ids.map((id) => {
          const item = places.get(id);
          if (!item) return null;
          const Icon = PLACE_ICON[item.icon];
          return (
            <li key={id} className="flex-1">
              <Link
                href={item.href}
                className="flex h-full flex-col items-center justify-center gap-2 rounded-(--radius-md) border border-accent-text/40 bg-accent/10 px-2 py-3 mono-label text-micro text-accent-text focus-ring transition-colors hover:bg-accent/20"
              >
                <span className="inline-flex size-9 items-center justify-center rounded-(--radius-md) border border-accent-text/40 bg-page/40">
                  <Icon aria-hidden="true" className="size-4" />
                </span>
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    );
  };

  return (
    <div className="mx-auto w-full max-w-(--size-journey) px-(--container-gutter) py-24">
      <div data-anim="journey-head" className="text-center">
        <p className="flex items-center justify-center gap-4 mono-label text-label tracking-(--tracking-eyebrow) text-accent-text">
          <span aria-hidden="true" className="h-px w-10 bg-accent-text" />
          {journey.eyebrow}
        </p>
        <Heading
          id="stage-journey-title"
          className="mt-5 text-heading font-bold text-text"
        >
          {lines.map((line, index) => (
            <span key={line} className="block">
              {line}
              {/* A space between lines, so the plain text doesn't run them together (it doesn't render). */}
              {index < lines.length - 1 ? " " : null}
            </span>
          ))}
        </Heading>
        {journey.text ? (
          <p className="mx-auto mt-5 max-w-2xl text-lead text-text-muted">
            {journey.text}
          </p>
        ) : null}
      </div>

      <ol className="mt-16 grid gap-10 sm:grid-cols-2 lg:grid-cols-7 lg:gap-3">
        {journey.steps.map((step, index) => {
          const Icon = STEP_ICON[step.icon];
          return (
            <li
              key={step.id}
              data-anim="step"
              className="relative flex flex-col"
            >
              <article className="relative flex flex-1 flex-col items-center rounded-(--radius-md) border border-border bg-surface-raised px-3 pt-8 pb-5 text-center shadow-lg lg:min-h-(--size-step-card)">
                {/* The number badge sits on the card's top edge (design detail). */}
                <span
                  aria-hidden="true"
                  className="absolute start-1/2 -top-3.5 inline-flex size-7 -translate-x-1/2 items-center justify-center rounded-(--radius-pill) bg-text text-sm font-bold text-page rtl:translate-x-1/2"
                >
                  {index + 1}
                </span>
                <Icon
                  aria-hidden="true"
                  className="size-5 text-text"
                  strokeWidth={1.5}
                />
                <StepHeading className="mt-2 text-sm font-semibold text-text">
                  <span className="sr-only">{`${index + 1}. `}</span>
                  {step.title}
                </StepHeading>
                <p className="mt-2 text-xs text-text-muted">{step.text}</p>
              </article>
              {/* Places: tiles above or below the card on desktop, joined by a line. */}
              {tiles(step.above, "above")}
              {tiles(step.below, "below")}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
