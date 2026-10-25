// @vitest-environment node
// Every components/ui primitive has a Storybook story next to it (CLAUDE.md §3).
// Opt out only for primitives with nothing to see (e.g. a screen-reader-only announcer) by putting
//   // no-story: <reason>
// in the file's first 5 lines.
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { expect, test } from "vitest";

const UI_DIR = path.join(process.cwd(), "components", "ui");
const NOT_COMPONENTS = /\.(stories|test|spec)\.tsx$/;

function componentFiles(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return componentFiles(full);
    return entry.name.endsWith(".tsx") && !NOT_COMPONENTS.test(entry.name)
      ? [full]
      : [];
  });
}

const optedOut = (file: string) =>
  readFileSync(file, "utf8")
    .split("\n")
    .slice(0, 5)
    .some((line) => /\/\/\s*no-story:\s*\S/.test(line));

test("every components/ui primitive has a .stories.tsx", () => {
  const missing = componentFiles(UI_DIR)
    .filter(
      (file) =>
        !existsSync(file.replace(/\.tsx$/, ".stories.tsx")) && !optedOut(file),
    )
    .map((file) => path.relative(process.cwd(), file));

  expect(
    missing,
    "Add a <Name>.stories.tsx next to each (or a `// no-story: <reason>` comment)",
  ).toEqual([]);
});
