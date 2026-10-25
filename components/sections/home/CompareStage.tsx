import { Check, Minus, X, type LucideIcon } from "lucide-react";
import { Container } from "@/components/ui/Container";
import type { COMPARE_MARKS, HomePage } from "@/lib/schemas/home";
import { cn } from "@/lib/utils/cn";
import { splitHighlight } from "@/lib/utils/highlight";

type Mark = (typeof COMPARE_MARKS)[number];

const MARK_ICON: Record<Mark, LucideIcon> = {
  yes: Check,
  no: X,
  partial: Minus,
};

type CompareStageProps = {
  compare: HomePage["compare"];
  /** What each mark means, for screen readers ("Included" …). */
  labels: Record<Mark, string>;
  headingLevel?: 2 | 3;
};

/**
 * Stage 6 of the journey: tickets compared. A title and a table on the end side, edged by a thin accent line,
 * while HeroJourney moves the black hole to the start side. The first ticket column is highlighted. The table
 * wraps to fit narrow screens (down to 320px) rather than scrolling sideways. Server-rendered; HeroJourney blurs the block in as it
 * rises and fades it near the top (`data-anim`).
 */
export function CompareStage({
  compare,
  labels,
  headingLevel = 2,
}: CompareStageProps) {
  const Heading = `h${headingLevel}` as const;
  const lines = splitHighlight(compare.title);

  return (
    <Container className="flex min-h-svh items-center justify-end">
      <div
        data-anim="compare"
        className="w-full max-w-xl sm:border-e sm:border-accent-text/60 sm:pe-6 md:pe-8"
      >
        <div className="text-end">
          <p className="flex items-center justify-end gap-4 mono-label text-label tracking-(--tracking-eyebrow) text-accent-text">
            {compare.eyebrow}
            <span aria-hidden="true" className="h-px w-10 bg-accent-text" />
          </p>
          <Heading
            id="stage-compare-title"
            className="mt-5 text-heading font-bold text-text"
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
        </div>

        <div className="mt-8 rounded-(--radius-lg) border border-border bg-surface/85 p-1.5 sm:p-3 md:p-4">
          <table
            aria-labelledby="stage-compare-title"
            className="w-full border-separate border-spacing-0"
          >
            <thead>
              <tr>
                <th
                  scope="col"
                  className="px-1.5 py-3 text-start mono-label text-micro font-normal text-text-muted sm:px-3"
                >
                  {compare.corner}
                </th>
                {compare.columns.map((column, index) => (
                  <th
                    key={column.id}
                    scope="col"
                    className={cn(
                      "px-1.5 py-3 text-center mono-label text-micro font-normal tracking-normal sm:px-3 sm:tracking-(--tracking-label)",
                      index === 0
                        ? "rounded-t-(--radius-md) bg-accent font-semibold text-on-accent"
                        : "text-text-muted",
                    )}
                  >
                    {column.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {compare.rows.map((row, rowIndex) => {
                const last = rowIndex === compare.rows.length - 1;
                return (
                  <tr key={row.id} className="odd:bg-surface-raised/60">
                    <th
                      scope="row"
                      className="px-1.5 py-3 text-start mono-label text-micro font-normal tracking-normal text-text sm:px-3"
                    >
                      {row.label}
                    </th>
                    {row.cells.map((cell, index) => {
                      const highlighted = index === 0;
                      let content;
                      if ("mark" in cell) {
                        const Icon = MARK_ICON[cell.mark];
                        content = (
                          <span
                            className={cn(
                              "inline-flex size-6 items-center justify-center rounded-(--radius-pill) border",
                              highlighted
                                ? "border-accent-text bg-accent/15 text-accent-text"
                                : "border-text-muted/60 text-text-muted",
                            )}
                          >
                            <Icon
                              aria-hidden="true"
                              className="size-3.5"
                              strokeWidth={2}
                            />
                            <span className="sr-only">{labels[cell.mark]}</span>
                          </span>
                        );
                      } else {
                        content = (
                          <span
                            className={cn(
                              cell.large
                                ? "block text-2xl leading-tight font-bold"
                                : "text-sm",
                              highlighted
                                ? "font-semibold text-accent-text"
                                : "text-text-muted",
                            )}
                          >
                            {cell.text}
                          </span>
                        );
                      }
                      return (
                        <td
                          key={compare.columns[index]?.id ?? index}
                          className={cn(
                            "px-1.5 py-3 text-center sm:px-3",
                            highlighted &&
                              "border-x border-accent-text/40 bg-accent/10",
                            highlighted &&
                              last &&
                              "rounded-b-(--radius-md) border-b",
                          )}
                        >
                          {content}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </Container>
  );
}
