import { expect, test } from "vitest";
import { splitHighlight } from "./highlight";

test("splits lines and highlighted words", () => {
  expect(splitHighlight("Explore. Wonder.\nStay [Curious].")).toEqual([
    [{ text: "Explore. Wonder.", highlight: false }],
    [
      { text: "Stay ", highlight: false },
      { text: "Curious", highlight: true },
      { text: ".", highlight: false },
    ],
  ]);
});

test("works for Arabic and for a title without a highlight", () => {
  expect(splitHighlight("وابقَ [فضوليًا].")).toEqual([
    [
      { text: "وابقَ ", highlight: false },
      { text: "فضوليًا", highlight: true },
      { text: ".", highlight: false },
    ],
  ]);
  expect(splitHighlight("Hello")).toEqual([
    [{ text: "Hello", highlight: false }],
  ]);
});
