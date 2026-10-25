import type { Meta, StoryObj } from "@storybook/nextjs";
import { ButtonLink } from "./ButtonLink";

const meta = {
  title: "UI/ButtonLink",
  component: ButtonLink,
  args: { href: "/exhibitions", children: "Explore exhibitions", arrow: true },
  render: (args) => (
    <div className="bg-page p-10">
      <ButtonLink {...args} />
    </div>
  ),
} satisfies Meta<typeof ButtonLink>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Solid: Story = {};

export const Ghost: Story = {
  args: { variant: "ghost", children: "Plan your visit", arrow: false },
};

export const Small: Story = {
  args: { size: "sm", children: "Book a place", arrow: false },
};

/** Keyboard focus shows the shared focus-ring. */
export const Focus: Story = {
  play: async ({ canvasElement }) => {
    canvasElement.querySelector("a")?.focus();
  },
};

export const RTL: Story = {
  globals: { direction: "rtl" },
  args: { children: "استكشف المعارض" },
};
