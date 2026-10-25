// The header navigation: one list for the desktop dropdowns and the mobile menu. Labels are UI text in
// messages/*.json ("Header.nav.groups.<key>", "Header.nav.items.<key>"). Only "/" exists so far — every other route needs its CLAUDE.md §2
// route-table row before it's built.

type NavLinkItem = { readonly key: string; readonly href: string };
type NavGroup =
  | { readonly key: string; readonly href: string; readonly items?: undefined }
  | {
      readonly key: string;
      readonly href?: undefined;
      readonly items: readonly NavLinkItem[];
    };

export const NAV = [
  {
    key: "exhibitions",
    items: [
      { key: "galleries", href: "/exhibitions/galleries" },
      { key: "planetarium", href: "/exhibitions/planetarium" },
      { key: "temporary", href: "/exhibitions/temporary" },
    ],
  },
  {
    key: "visit",
    items: [
      { key: "tickets", href: "/visit/tickets" },
      { key: "gettingHere", href: "/visit/getting-here" },
      { key: "accessibility", href: "/visit/accessibility" },
    ],
  },
  {
    key: "learn",
    items: [
      { key: "schools", href: "/learn/schools" },
      { key: "events", href: "/learn/events" },
      { key: "research", href: "/learn/research" },
    ],
  },
  { key: "membership", href: "/membership" },
  {
    key: "about",
    items: [
      { key: "story", href: "/about" },
      { key: "press", href: "/about/press" },
      { key: "contact", href: "/contact" },
    ],
  },
] as const satisfies readonly NavGroup[];

/** The navigation's labels, translated on the server (SiteHeader) and passed to the client components. */
export type NavLabels = {
  groups: Record<string, string>;
  items: Record<string, string>;
};
