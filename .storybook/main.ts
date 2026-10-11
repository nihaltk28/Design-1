import type { StorybookConfig } from "@storybook/nextjs";

// Stories live next to components/ui primitives only (CLAUDE.md §1).
const config: StorybookConfig = {
  stories: ["../components/ui/**/*.stories.@(ts|tsx)"],
  addons: ["@storybook/addon-a11y"],
  framework: "@storybook/nextjs",
  staticDirs: ["../public"],
};
export default config;
