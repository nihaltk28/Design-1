// Project rules from CLAUDE.md §3–§7, enforced by ESLint so humans and Claude both get a hard failure.
//
// Wire into eslint.config.mjs:
//   import projectRules from "./eslint.project-rules.mjs";
//   export default [ ...existingConfig, ...projectRules ];
//
// Put it LAST: in flat config, a later block that sets the same rule replaces the earlier setting.
// If your existing config already sets no-restricted-imports / no-restricted-syntax / no-restricted-globals
// for these files, merge those entries into the blocks below instead.
//
// eslint-config-next already registers the `jsx-a11y` and `react` plugins; this file only turns rules on.
// Without eslint-config-next, add `plugins: { "jsx-a11y": jsxA11y, react }` to block 1.

import jsxA11y from "eslint-plugin-jsx-a11y";

const UI_FILES = ["components/**/*.{ts,tsx,js,jsx}", "app/**/*.{ts,tsx,js,jsx}"];

// Next's generated-image routes render with ImageResponse, which requires a raw <img>.
const IMAGE_RESPONSE_FILES = [
  "app/**/opengraph-image.{ts,tsx,js,jsx}",
  "app/**/twitter-image.{ts,tsx,js,jsx}",
  "app/**/icon.{ts,tsx,js,jsx}",
  "app/**/apple-icon.{ts,tsx,js,jsx}",
];

// Modules that must never reach the browser bundle (secrets, auth, server-only env).
const SERVER_ONLY_FILES = ["lib/api/**/*.{ts,tsx}", "lib/auth/**/*.{ts,tsx}", "lib/security/**/*.{ts,tsx}"];
const TEST_FILES = ["**/*.test.{ts,tsx}", "**/*.spec.{ts,tsx}"];

const MOCK_IMPORT_MESSAGE =
  "Mock data reaches the UI only through MSW (lib/mocks). Call getPublic / getPrivate from @/lib/api instead. See CLAUDE.md §3.";
const CONTAINER_MESSAGE =
  "No hardcoded container width. Use <Container> or CONTAINER_CLASSNAME (components/ui/Container.tsx). See CLAUDE.md §7.";
const CDN_MESSAGE =
  "No CDN-hosted libraries or assets. Install with pnpm (or put the file in public/) so it's self-hosted. See CLAUDE.md §5.";
const LOGICAL_MESSAGE =
  "Physical direction class breaks RTL. Use logical ones: ps-/pe-, ms-/me-, start-/end-, text-start/end, rounded-s/e, border-s/e. See CLAUDE.md §7.";
const RAW_VALUE_MESSAGE =
  "No raw hex / rgb / px / rem in Tailwind arbitrary values. Add a token in styles/tokens.css and use var(--token). See CLAUDE.md §3.";
const OUTLINE_MESSAGE =
  "outline-none removes the focus indicator. Use the shared focus-ring utility from styles/tokens.css. See CLAUDE.md §4.";

const CDN_HOSTS = "(cdn\\.jsdelivr\\.net|cdnjs\\.cloudflare\\.com|unpkg\\.com)";

// Class-string patterns. `(^|[\\s:])` = start of a class, incl. after a variant like `md:`.
const PHYSICAL_CLASS =
  "(^|[\\s:])(-?(pl|pr|ml|mr|left|right|scroll-ml|scroll-mr|scroll-pl|scroll-pr)-|(text|float|clear)-(left|right)(\\s|$)|(rounded-(l|r|tl|tr|bl|br)|border-(l|r))(-|\\s|$))";
const RAW_ARBITRARY_VALUE = "\\[[^\\]]*(#[0-9a-fA-F]{3,8}|rgba?\\(|hsla?\\(|\\d(px|rem))";
const OUTLINE_NONE = "(^|[\\s:])outline-none(\\s|$)";

// Match a pattern in both plain strings and template literals.
const inStrings = (pattern, message) => [
  { selector: `Literal[value=/${pattern}/]`, message },
  { selector: `TemplateElement[value.raw=/${pattern}/]`, message },
];

// Shared restricted-syntax entries (every UI file)
const BASE_SYNTAX = [
  {
    selector: "JSXAttribute[name.name='dangerouslySetInnerHTML']",
    message:
      "No dangerouslySetInnerHTML. CMS rich-text goes through the rehype pipeline in lib/content; JSON-LD goes through the component in lib/seo. See CLAUDE.md §3.",
  },
  ...inStrings("max-w-\\[\\d", CONTAINER_MESSAGE),
  ...inStrings(CDN_HOSTS, CDN_MESSAGE),
  ...inStrings(PHYSICAL_CLASS, LOGICAL_MESSAGE),
  ...inStrings(RAW_ARBITRARY_VALUE, RAW_VALUE_MESSAGE),
  ...inStrings(OUTLINE_NONE, OUTLINE_MESSAGE),
  {
    selector: "JSXOpeningElement[name.name='script']:has(JSXAttribute[name.name='src'])",
    message:
      "No raw <script src>. Load third-party scripts with next/script (strategy=\"lazyOnload\" or \"afterInteractive\"). See CLAUDE.md §5.",
  },
];

const NO_RAW_IMG = {
  selector: "JSXOpeningElement[name.name='img']",
  message:
    "No raw <img>. Use next/image with width/height (or fill) and sizes; add priority only on the LCP image. See CLAUDE.md §5.",
};

const projectRules = [
  // 1. Components + app: no mock imports, restricted syntax above plus no raw <img>, strict jsx-a11y
  {
    files: UI_FILES,
    rules: {
      ...jsxA11y.flatConfigs.strict.rules,
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/lib/mocks", "@/lib/mocks/**", "**/lib/mocks", "**/lib/mocks/**"],
              message: MOCK_IMPORT_MESSAGE,
            },
          ],
        },
      ],
      "no-restricted-syntax": ["error", ...BASE_SYNTAX, NO_RAW_IMG],
    },
  },

  // 2. Generated-image routes: same rules, but raw <img> is required by ImageResponse
  {
    files: IMAGE_RESPONSE_FILES,
    rules: {
      "no-restricted-syntax": ["error", ...BASE_SYNTAX],
    },
  },

  // 3. No hardcoded UI text in JSX — every string comes from messages/*.json via next-intl.
  //    global-error renders outside the locale layout (no provider), and image routes aren't UI.
  {
    files: UI_FILES,
    // Stories are dev-only demos: sample text inline is fine there.
    ignores: ["app/global-error.{ts,tsx,js,jsx}", "**/*.stories.tsx", ...IMAGE_RESPONSE_FILES],
    rules: {
      "react/jsx-no-literals": [
        "error",
        {
          ignoreProps: true,
          allowedStrings: ["·", "|", "/", "—", "–", "-", ":", "×", "*", "(", ")", "&nbsp;"],
        },
      ],
    },
  },

  // 4. Components never call fetch
  {
    files: ["components/**/*.{ts,tsx,js,jsx}"],
    rules: {
      "no-restricted-globals": [
        "error",
        {
          name: "fetch",
          message: "Components never call fetch. Use getPublic / getPrivate from @/lib/api (CLAUDE.md §2–3).",
        },
      ],
    },
  },

  // 5. lib/content builds class names for CMS HTML — same RTL / token / focus rules as components
  {
    files: ["lib/content/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-syntax": [
        "error",
        ...inStrings(PHYSICAL_CLASS, LOGICAL_MESSAGE),
        ...inStrings(RAW_ARBITRARY_VALUE, RAW_VALUE_MESSAGE),
        ...inStrings(OUTLINE_NONE, OUTLINE_MESSAGE),
      ],
    },
  },

  // 6. Server modules start with `import "server-only"`, so importing one into client code fails the build
  {
    files: SERVER_ONLY_FILES,
    ignores: TEST_FILES,
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector: "Program:not(:has(ImportDeclaration[source.value='server-only']))",
          message:
            'Server module without `import "server-only"`. Add it as the first import so a client import fails the build (CLAUDE.md §3).',
        },
      ],
    },
  },

  // 7. Generated contract types are build output — don't lint them
  {
    ignores: ["lib/api/generated.ts", "lib/api/generated/**"],
  },
];

export default projectRules;
