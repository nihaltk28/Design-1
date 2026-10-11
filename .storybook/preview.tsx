import type { Decorator, Preview } from "@storybook/nextjs";
import "../app/globals.css";

// Every story can be switched to right-to-left from the toolbar, and a story can pin it with
// `globals: { direction: "rtl" }` (CLAUDE.md §7 i18n & RTL).
const withDirection: Decorator = (Story, context) => {
  const rtl = context.globals.direction === "rtl";
  document.documentElement.dir = rtl ? "rtl" : "ltr";
  document.documentElement.lang = rtl ? "ar" : "en";
  return <Story />;
};

const preview: Preview = {
  parameters: {
    // axe runs on every story; violations show as errors in the Accessibility panel.
    a11y: { test: "error" },
  },
  globalTypes: {
    direction: {
      description: "Text direction",
      toolbar: {
        title: "Direction",
        icon: "transfer",
        items: [
          { value: "ltr", title: "LTR (English)" },
          { value: "rtl", title: "RTL (Arabic)" },
        ],
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: { direction: "ltr" },
  decorators: [withDirection],
};

export default preview;
