// @vitest-environment node
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { homePageSchema } from "@/lib/schemas/home";
import { siteSettingsSchema } from "@/lib/schemas/site-settings";
import { createMockApi } from "./server.mjs";

// The mock API must answer exactly what the website accepts: the same Zod schemas the site validates with.
let base = "";
const server = createMockApi();
beforeAll(
  () =>
    new Promise<void>((resolve) =>
      server.listen(0, () => {
        base = `http://localhost:${(server.address() as AddressInfo).port}`;
        resolve();
      }),
    ),
);
afterAll(() => new Promise<void>((resolve) => server.close(() => resolve())));

describe("mock API", () => {
  test.each(["en", "ar"])(
    "/pages/home?locale=%s passes the home schema",
    async (locale) => {
      const response = await fetch(`${base}/pages/home?locale=${locale}`);
      expect(response.status).toBe(200);
      expect(homePageSchema.safeParse(await response.json()).success).toBe(
        true,
      );
    },
  );

  test.each(["en", "ar"])(
    "/site/settings?locale=%s passes the settings schema",
    async (locale) => {
      const response = await fetch(`${base}/site/settings?locale=${locale}`);
      expect(response.status).toBe(200);
      expect(siteSettingsSchema.safeParse(await response.json()).success).toBe(
        true,
      );
    },
  );

  test("refuses an unknown locale, path and method", async () => {
    expect((await fetch(`${base}/pages/home?locale=fr`)).status).toBe(400);
    expect((await fetch(`${base}/pages/nothing?locale=en`)).status).toBe(404);
    expect(
      (await fetch(`${base}/pages/home?locale=en`, { method: "POST" })).status,
    ).toBe(405);
  });

  test("simulates a failing endpoint", async () => {
    const failing = createMockApi({ fail: "home" });
    await new Promise<void>((resolve) => failing.listen(0, () => resolve()));
    const port = (failing.address() as AddressInfo).port;
    expect(
      (await fetch(`http://localhost:${port}/pages/home?locale=en`)).status,
    ).toBe(500);
    expect(
      (await fetch(`http://localhost:${port}/site/settings?locale=en`)).status,
    ).toBe(200);
    await new Promise<void>((resolve) => failing.close(() => resolve()));
  });
});
