import { SvgIcon } from "@/components/ui/SvgIcon";

/**
 * Our own wordmark (not the reference site's): a ring with a tilted orbit and a small star
 * (public/assets/icons/logo.svg), then the name and the tagline. Placeholder until the museum's real logo arrives.
 */
export function Logo({ name, tagline }: { name: string; tagline: string }) {
  return (
    <span className="flex items-center gap-2.5">
      <SvgIcon
        src="/assets/icons/logo.svg"
        className="size-9 text-accent-text"
      />
      <span className="flex flex-col leading-none">
        <span className="text-lg font-extrabold tracking-tight text-text uppercase">
          {name}
        </span>
        <span className="mt-1 font-mono text-micro tracking-(--tracking-label) text-text-muted uppercase">
          {tagline}
        </span>
      </span>
    </span>
  );
}
