import type { Thing, WithContext } from "schema-dts";

/**
 * Structured data. The ONE allowed dangerouslySetInnerHTML in the project (CLAUDE.md §3):
 * the payload is our own JSON, and `<` is escaped so a value can't close the script tag.
 */
export function JsonLd<T extends Thing>({ data }: { data: WithContext<T> }) {
  const json = JSON.stringify(data).replace(/</g, "\\u003c");
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: json }}
    />
  );
}
