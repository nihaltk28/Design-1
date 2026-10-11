// Every key in every locale (CLAUDE.md §7). Typed keys (global.d.ts) catch typos against the
// default locale; this catches a key that exists in one messages file but not another.
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, test } from "vitest";

const MESSAGES_DIR = path.join(process.cwd(), "messages");

type Messages = { [key: string]: string | Messages };

function flatKeys(obj: Messages, prefix = ""): string[] {
  return Object.entries(obj).flatMap(([key, value]) =>
    typeof value === "string" ? [`${prefix}${key}`] : flatKeys(value, `${prefix}${key}.`),
  );
}

function emptyKeys(obj: Messages, prefix = ""): string[] {
  return Object.entries(obj).flatMap(([key, value]) =>
    typeof value === "string"
      ? value.trim() === "" ? [`${prefix}${key}`] : []
      : emptyKeys(value, `${prefix}${key}.`),
  );
}

const locales = readdirSync(MESSAGES_DIR)
  .filter((file) => file.endsWith(".json"))
  .map((file) => ({
    locale: file.replace(/\.json$/, ""),
    messages: JSON.parse(readFileSync(path.join(MESSAGES_DIR, file), "utf8")) as Messages,
  }));

const allKeys = [...new Set(locales.flatMap(({ messages }) => flatKeys(messages)))].sort();

describe("messages", () => {
  test("at least one locale file exists", () => {
    expect(locales.length).toBeGreaterThan(0);
  });

  test.each(locales)("$locale has every key used in any locale", ({ messages }) => {
    const keys = new Set(flatKeys(messages));
    expect(allKeys.filter((key) => !keys.has(key))).toEqual([]);
  });

  test.each(locales)("$locale has no empty values", ({ messages }) => {
    expect(emptyKeys(messages)).toEqual([]);
  });
});
