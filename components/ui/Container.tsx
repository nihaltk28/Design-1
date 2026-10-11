import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

/** Page width + side gutter. The only place width lives besides --container-max-w (CLAUDE.md §7). */
export const CONTAINER_CLASSNAME =
  "mx-auto w-full max-w-(--container-max-w) px-(--container-gutter)";

type ContainerProps = {
  as?: "div" | "section" | "header" | "footer" | "nav" | "article" | "aside";
  className?: string;
  children: ReactNode;
};

export function Container({
  as: Tag = "div",
  className,
  children,
}: ContainerProps) {
  return <Tag className={cn(CONTAINER_CLASSNAME, className)}>{children}</Tag>;
}
