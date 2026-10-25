import { getImageProps } from "next/image";
import { getTranslations } from "next-intl/server";
import { preload } from "react-dom";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { SvgIcon } from "@/components/ui/SvgIcon";
import type { HomePage } from "@/lib/schemas/home";
import { splitHighlight } from "@/lib/utils/highlight";
import { CompareStage } from "./CompareStage";
import { DomeStage } from "./DomeStage";
import { ExhibitsStage } from "./ExhibitsStage";
import { ExploreStage } from "./ExploreStage";
import { GalleriesStage } from "./GalleriesStage";
import { HeroJourney } from "./HeroJourney";
import { JourneyStage } from "./JourneyStage";
import { HOLE_STILLS } from "./stills";

type HomeHeroProps = {
  hero: HomePage["hero"];
  galleries: HomePage["galleries"];
  journey: HomePage["journey"];
  dome: HomePage["dome"];
  exhibits: HomePage["exhibits"];
  compare: HomePage["compare"];
  explore: HomePage["explore"];
  stages: HomePage["stages"];
  /**
   * Level of the hero headline — set by the page template, which owns the page outline (CLAUDE.md §4): 1 when
   * the hero is the page title. The stages' headings sit one level below it.
   */
  headingLevel: 1 | 2;
};

/** Entrance delay per element, so the hero text arrives in order. */
const delay = (index: number) => ({ animationDelay: `${120 + index * 110}ms` });

/**
 * The scroll journey at the top of the home page: the headline over the black hole, then the journey's stages.
 * Server-rendered content; the scroll scene and animation are the client component HeroJourney.
 */
export async function HomeHero({
  hero,
  galleries,
  journey,
  dome,
  exhibits,
  compare,
  explore,
  stages,
  headingLevel,
}: HomeHeroProps) {
  const t = await getTranslations("Home");
  // The black hole's still image is the page's LCP element (CLAUDE.md §5: preload it, high priority). Two
  // themes, two files: each preload only applies to its own system theme, so the visitor downloads one. (A
  // theme chosen with the header switch loads its still normally.)
  for (const [theme, media] of [
    ["dark", "not all and (prefers-color-scheme: light)"],
    ["light", "(prefers-color-scheme: light)"],
  ] as const) {
    const { props } = getImageProps({
      src: HOLE_STILLS[theme],
      alt: "",
      fill: true,
      sizes: HOLE_STILLS.sizes,
    });
    preload(props.src, {
      as: "image",
      imageSrcSet: props.srcSet,
      imageSizes: props.sizes,
      fetchPriority: "high",
      media,
    });
  }
  const Heading = `h${headingLevel}` as const;
  const stageLevel = (headingLevel + 1) as 2 | 3;
  const lines = splitHighlight(hero.title);

  return (
    <section id="stage-start" aria-labelledby="hero-title">
      <HeroJourney
        stages={stages}
        labels={{
          menu: t("stagesLabel"),
          stage: t("stage"),
          progress: t("progress"),
          scroll: t("scroll"),
        }}
        galleries={
          <GalleriesStage galleries={galleries} headingLevel={stageLevel} />
        }
        journey={
          <JourneyStage
            journey={journey}
            labels={{ places: t("places") }}
            headingLevel={stageLevel}
          />
        }
        dome={<DomeStage dome={dome} headingLevel={stageLevel} />}
        exhibits={
          <ExhibitsStage exhibits={exhibits} headingLevel={stageLevel} />
        }
        explore={
          <ExploreStage
            explore={explore}
            cue={t("scroll")}
            headingLevel={stageLevel}
          />
        }
        compare={
          <CompareStage
            compare={compare}
            headingLevel={stageLevel}
            labels={{
              yes: t("compare.yes"),
              no: t("compare.no"),
              partial: t("compare.partial"),
            }}
          />
        }
        hero={
          <div className="flex min-h-(--size-first-screen) flex-col items-center justify-center px-(--container-gutter) pb-28 text-center">
            {hero.eyebrow ? (
              <p
                style={delay(0)}
                className="flex animate-rise items-center gap-4 mono-label text-label tracking-(--tracking-eyebrow) text-accent-text"
              >
                <span aria-hidden="true" className="h-px w-10 bg-accent-text" />
                {hero.eyebrow}
              </p>
            ) : null}

            <Heading
              id="hero-title"
              style={delay(1)}
              className="mt-6 animate-rise text-display font-bold text-text"
            >
              {lines.map((line, index) => (
                <span key={index} className="block">
                  {line.map((segment, i) =>
                    segment.highlight ? (
                      <span
                        key={i}
                        className="relative inline-block text-gradient"
                      >
                        {segment.text}
                        {/* A hand-drawn-looking underline under the highlighted word (design detail). */}
                        <SvgIcon
                          src="/assets/icons/underline.svg"
                          className="absolute inset-x-0 -bottom-1 h-2 w-full text-accent-text"
                        />
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

            {hero.text ? (
              <p
                style={delay(2)}
                className="mt-7 max-w-xl animate-rise text-lead text-text-muted"
              >
                {hero.text}
              </p>
            ) : null}

            <div
              style={delay(3)}
              className="mt-9 flex animate-rise flex-wrap justify-center gap-3"
            >
              <ButtonLink href={hero.primary.href} arrow>
                {hero.primary.label}
              </ButtonLink>
              <ButtonLink href={hero.secondary.href} variant="ghost">
                {hero.secondary.label}
              </ButtonLink>
            </div>
          </div>
        }
      />
    </section>
  );
}
