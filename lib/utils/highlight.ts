export type Segment = { text: string; highlight: boolean };

/**
 * Splits a headline from the API into lines ("\n") and highlighted runs ("[…]"):
 * "Explore. Wonder.\nStay [Curious]." → [[Explore. Wonder.], [Stay , *Curious*, .]]
 * The brackets live in the content, so each language can highlight its own word in its own place.
 */
export function splitHighlight(title: string): Segment[][] {
  return title.split("\n").map((line) =>
    line
      .split(/(\[[^\]]+\])/)
      .filter(Boolean)
      .map((part) =>
        part.startsWith("[") && part.endsWith("]")
          ? { text: part.slice(1, -1), highlight: true }
          : { text: part, highlight: false },
      ),
  );
}
