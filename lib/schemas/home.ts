import { z } from "zod";

// GET /pages/home?locale=<locale> — placeholder contract until the .NET spec exists (PROJECT-SETUP §5.3).
// Agree this shape with the backend owner before building more on it.

export const GALLERY_VISUALS = ["bars", "spectrum", "orbit", "rings"] as const;
export const STEP_ICONS = [
  "bang",
  "stars",
  "galaxy",
  "sun",
  "earth",
  "life",
  "telescope",
] as const;
export const PLACE_ICONS = [
  "gallery",
  "star",
  "planetarium",
  "observatory",
  "lab",
  "library",
] as const;
export const EXHIBIT_ICONS = [
  "meteorite",
  "moon",
  "capsule",
  "satellite",
  "dish",
  "clock",
] as const;
/** A comparison table cell: included, not included, or partly included. */
export const COMPARE_MARKS = ["yes", "no", "partial"] as const;

const link = z.object({
  label: z.string().min(1),
  href: z.string().startsWith("/"),
});

export const homePageSchema = z.object({
  /** Search-result title and description. Optional: falls back to the site name. */
  seo: z
    .object({ title: z.string().min(1), description: z.string().min(1) })
    .optional(),

  hero: z.object({
    eyebrow: z.string(),
    /**
     * Headline. A line break is "\n"; the word in [square brackets] is highlighted in the accent colour,
     * e.g. "Explore. Wonder.\nStay [Curious]."
     */
    title: z.string().min(1),
    text: z.string(),
    primary: link,
    secondary: link,
  }),

  /** Stage 2 of the journey: four gallery cards around the black hole and a tagline. */
  galleries: z.object({
    eyebrow: z.string(),
    cards: z
      .array(
        z.object({
          id: z.string(),
          /** Short title after the number, e.g. "Begin." */
          title: z.string().min(1),
          /** Which small code-drawn graphic the card shows. */
          visual: z.enum(GALLERY_VISUALS),
          link,
        }),
      )
      .length(4),
    tagline: z.string(),
  }),

  /**
   * Stage 3: seven stops from the Big Bang to today, each with the museum places where you can see it. Places
   * are listed once and referenced by id from the steps (CLAUDE.md §5: shared objects by id, not repeated).
   */
  journey: z
    .object({
      eyebrow: z.string(),
      title: z.string().min(1),
      text: z.string(),
      places: z.array(
        z.object({
          id: z.string(),
          label: z.string().min(1),
          icon: z.enum(PLACE_ICONS),
          href: z.string().startsWith("/"),
        }),
      ),
      steps: z
        .array(
          z.object({
            id: z.string(),
            icon: z.enum(STEP_ICONS),
            title: z.string().min(1),
            text: z.string(),
            /** Place ids shown above the step's card (desktop) … */
            above: z.array(z.string()),
            /** … and below it. */
            below: z.array(z.string()),
          }),
        )
        .length(7),
    })
    .refine(
      (journey) => {
        const ids = new Set(journey.places.map((place) => place.id));
        return journey.steps.every((step) =>
          [...step.above, ...step.below].every((id) => ids.has(id)),
        );
      },
      { message: "every place id in a step must be one of journey.places" },
    ),

  /**
   * Stage 4: the planetarium. Text on one side while the black hole tilts and moves to the other. The title
   * marks highlighted words with [square brackets] and line breaks with "
", like the hero's.
   */
  dome: z.object({
    eyebrow: z.string(),
    title: z.string().min(1),
    text: z.string(),
  }),

  /**
   * Stage 5: six featured objects around the black hole, three either side, each joined to it by a line; the
   * title and a one-line text sit below.
   */
  exhibits: z.object({
    eyebrow: z.string(),
    title: z.string().min(1),
    text: z.string(),
    items: z
      .array(
        z.object({
          id: z.string(),
          icon: z.enum(EXHIBIT_ICONS),
          /** Short name, shown in capitals, e.g. "Meteorite". */
          name: z.string().min(1),
          text: z.string(),
          link,
        }),
      )
      .length(6),
  }),

  /**
   * Stage 6: tickets compared — a title and a table, with the first column (the recommended ticket)
   * highlighted. The title marks highlighted words with [square brackets] and line breaks with "\n".
   */
  compare: z.object({
    eyebrow: z.string(),
    title: z.string().min(1),
    /** Heading of the row-label column, e.g. "Ticket". */
    corner: z.string(),
    /** Exactly three ticket columns; the first is highlighted. */
    columns: z
      .array(z.object({ id: z.string(), label: z.string().min(1) }))
      .length(3),
    rows: z.array(
      z.object({
        id: z.string(),
        label: z.string().min(1),
        /** One cell per column: a short text (`large` for a price), or a mark. */
        cells: z
          .array(
            z.union([
              z.object({
                text: z.string().min(1),
                large: z.boolean().optional(),
              }),
              z.object({ mark: z.enum(COMPARE_MARKS) }),
            ]),
          )
          .length(3),
      }),
    ),
  }),

  /**
   * Stage 7: six links around the black hole, three either side — the last stop before the page dives into
   * it. `text` is a short line under each link's title.
   */
  explore: z.object({
    eyebrow: z.string(),
    links: z
      .array(
        z.object({
          id: z.string(),
          title: z.string().min(1),
          text: z.string(),
          href: z.string().startsWith("/"),
        }),
      )
      .length(6),
  }),

  /**
   * The scroll journey's stages, in order — listed in the side menu and the stage readout. The first is the
   * hero itself.
   */
  stages: z
    .array(
      z.object({
        id: z.string().regex(/^[a-z0-9-]+$/),
        /** Short label in the side menu, e.g. "Galleries". */
        label: z.string().min(1),
        /** Longer name in the readout, e.g. "Stay curious". */
        name: z.string().min(1),
      }),
    )
    .min(1),
});

export type HomePage = z.infer<typeof homePageSchema>;
