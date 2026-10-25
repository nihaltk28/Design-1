import { Container } from "@/components/ui/Container";
import type { HomePage } from "@/lib/schemas/home";
import { splitHighlight } from "@/lib/utils/highlight";

type DomeStageProps = {
  dome: HomePage["dome"];
  headingLevel?: 2 | 3;
};

/**
 * Stage 4 of the journey: the planetarium. A text block on the start side, edged by a thin accent line, while
 * HeroJourney tilts the black hole and moves it to the other side. Server-rendered; HeroJourney blurs the block
 * in as it rises and fades it near the top (`data-anim`).
 */
export function DomeStage({ dome, headingLevel = 2 }: DomeStageProps) {
  const Heading = `h${headingLevel}` as const;
  const lines = splitHighlight(dome.title);

  return (
    <Container className="flex min-h-svh items-center">
      <div
        data-anim="dome"
        className="max-w-xl border-s border-accent-text ps-6 md:ps-8 lg:ms-44"
      >
        <p className="flex items-center gap-4 mono-label text-label tracking-(--tracking-eyebrow) text-accent-text">
          <span aria-hidden="true" className="h-px w-10 bg-accent-text" />
          {dome.eyebrow}
        </p>
        <Heading
          id="stage-dome-title"
          className="mt-6 text-heading font-bold text-text"
        >
          {lines.map((line, index) => (
            <span key={index} className="block">
              {line.map((segment, i) =>
                segment.highlight ? (
                  <span key={i} className="text-gradient">
                    {segment.text}
                  </span>
                ) : (
                  <span key={i}>{segment.text}</span>
                ),
              )}
              {/* A space between lines, so the plain text doesn't run them together (it doesn't render). */}
              {index < lines.length - 1 ? " " : null}
            </span>
          ))}
        </Heading>
        {dome.text ? (
          <p className="mt-6 text-lead text-text-muted">{dome.text}</p>
        ) : null}
      </div>
    </Container>
  );
}
