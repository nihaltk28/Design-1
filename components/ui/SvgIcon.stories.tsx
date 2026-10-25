import type { Meta, StoryObj } from "@storybook/nextjs";
import { SvgIcon } from "./SvgIcon";

const meta = {
  title: "UI/SvgIcon",
  component: SvgIcon,
  args: { src: "/assets/icons/logo.svg", className: "size-9 text-accent-text" },
  render: (args) => (
    <div className="flex items-center gap-3 bg-page p-10 text-text">
      <SvgIcon {...args} />
      <span>Event Horizon</span>
    </div>
  ),
} satisfies Meta<typeof SvgIcon>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** Colour comes from the text colour class. */
export const Muted: Story = {
  args: { className: "size-9 text-text-muted" },
};

/** A wide drawing: give it the file's aspect ratio. */
export const GalleryDrawing: Story = {
  args: {
    src: "/assets/icons/gallery-spectrum.svg",
    className: "aspect-[140/46] w-36 text-accent-text",
  },
};

/** Stretched to fit, like the underline under the hero's highlighted word. */
export const Stretched: Story = {
  args: {
    src: "/assets/icons/underline.svg",
    className: "h-2 w-48 text-accent-text",
  },
};

export const RTL: Story = {
  globals: { direction: "rtl" },
  render: (args) => (
    <div className="flex items-center gap-3 bg-page p-10 text-text">
      <SvgIcon {...args} />
      <span>أفق الحدث</span>
    </div>
  ),
};
