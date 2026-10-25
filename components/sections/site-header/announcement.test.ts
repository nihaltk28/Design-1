import { afterEach, describe, expect, test } from "vitest";
import { ANNOUNCEMENT_DISMISSED_KEY, announcementScript } from "./announcement";

// The layout runs this as plain script text before the first paint; here it runs the same way, as an inline
// <script> that jsdom executes (Vitest's jsdom environment sets runScripts: "dangerously").
const run = (script: string) => {
  const element = document.createElement("script");
  element.textContent = script;
  document.head.append(element);
  element.remove();
};

afterEach(() => {
  sessionStorage.clear();
  delete document.documentElement.dataset.announcementDismissed;
});

describe("announcementScript", () => {
  test("marks <html> when this announcement was closed this session", () => {
    sessionStorage.setItem(
      ANNOUNCEMENT_DISMISSED_KEY,
      "Free stargazing tonight",
    );
    run(announcementScript("Free stargazing tonight"));
    expect(document.documentElement.dataset.announcementDismissed).toBe("");
  });

  test("leaves a new announcement visible", () => {
    sessionStorage.setItem(ANNOUNCEMENT_DISMISSED_KEY, "An older announcement");
    run(announcementScript("Free stargazing tonight"));
    expect(
      document.documentElement.dataset.announcementDismissed,
    ).toBeUndefined();
  });

  test("can't be broken out of by the text (no </script>, quotes are escaped)", () => {
    const text = `</script><script>alert("x")</script> "quoted" 'single'`;
    const script = announcementScript(text);
    expect(script).not.toContain("<");
    sessionStorage.setItem(ANNOUNCEMENT_DISMISSED_KEY, text);
    run(script);
    expect(document.documentElement.dataset.announcementDismissed).toBe("");
  });
});
