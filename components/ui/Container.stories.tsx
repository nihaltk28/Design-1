import type { Meta, StoryObj } from "@storybook/nextjs";
import { Container } from "./Container";

const meta = {
  title: "UI/Container",
  component: Container,
  args: {
    children: (
      <p className="bg-accent p-4 text-on-accent">
        Content sits inside the container: centred, capped at --container-max-w,
        with the side gutter.
      </p>
    ),
  },
} satisfies Meta<typeof Container>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const RTL: Story = {
  globals: { direction: "rtl" },
  args: {
    children: (
      <p className="bg-accent p-4 text-on-accent">
        يقع المحتوى داخل الحاوية: في المنتصف، بعرض أقصى محدد، مع هامش جانبي.
      </p>
    ),
  },
};
