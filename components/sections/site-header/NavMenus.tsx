"use client";

import { ChevronDown } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { Link, usePathname } from "@/lib/i18n/navigation";
import { cn } from "@/lib/utils/cn";
import { NAV, type NavLabels } from "./nav";

/**
 * Desktop navigation. Groups are disclosure buttons (aria-expanded + aria-controls — the APG "disclosure
 * navigation" pattern, not an ARIA menu), so links stay links and Tab moves through them. One group open at a
 * time; Escape closes it and returns focus to its button; clicking outside or moving focus out closes it;
 * following a link closes it (open state is remembered per path).
 */
export function NavMenus({
  label,
  labels,
}: {
  label: string;
  /** Translated on the server — no translation library in the browser. */
  labels: NavLabels;
}) {
  const pathname = usePathname();
  const baseId = useId();
  const [open, setOpen] = useState<{ key: string; path: string } | null>(null);
  const openKey = open?.path === pathname ? open.key : null;
  const nav = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!openKey) return;
    const close = (returnFocus: boolean) => {
      if (returnFocus)
        nav.current
          ?.querySelector<HTMLButtonElement>(`[data-group="${openKey}"]`)
          ?.focus();
      setOpen(null);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") close(true);
    };
    const onPointer = (event: PointerEvent) => {
      if (!nav.current?.contains(event.target as Node)) close(false);
    };
    const onFocus = (event: FocusEvent) => {
      if (!nav.current?.contains(event.target as Node)) close(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("focusin", onFocus);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("focusin", onFocus);
    };
  }, [openKey]);

  const itemClass =
    "group flex items-center gap-1.5 rounded-sm px-3 py-2 text-nav font-semibold text-text focus-ring transition-colors hover:text-accent-text";

  return (
    <nav ref={nav} aria-label={label} className="hidden nav:block">
      <ul className="flex items-center gap-2">
        {NAV.map((group) => {
          if (!("items" in group)) {
            const isCurrent = pathname === group.href;
            return (
              <li key={group.key}>
                <Link
                  href={group.href}
                  aria-current={isCurrent ? "page" : undefined}
                  className={itemClass}
                >
                  {labels.groups[group.key]}
                </Link>
              </li>
            );
          }
          const panelId = `${baseId}-${group.key}`;
          const expanded = openKey === group.key;
          return (
            <li key={group.key} className="relative">
              <button
                type="button"
                data-group={group.key}
                aria-expanded={expanded}
                aria-controls={panelId}
                onClick={() =>
                  setOpen(expanded ? null : { key: group.key, path: pathname })
                }
                className={itemClass}
              >
                {labels.groups[group.key]}
                <ChevronDown
                  aria-hidden="true"
                  className="size-4 text-text-muted transition-transform duration-300 group-aria-expanded:rotate-180"
                />
              </button>
              <div
                id={panelId}
                hidden={!expanded}
                className="absolute start-0 top-full z-50 mt-3 min-w-56 rounded-(--radius-md) border border-border bg-surface p-2 shadow-2xl"
              >
                <ul>
                  {group.items.map((item) => (
                    <li key={item.key}>
                      <Link
                        href={item.href}
                        aria-current={
                          pathname === item.href ? "page" : undefined
                        }
                        className={cn(
                          "block rounded-sm px-3 py-2.5 text-sm text-text focus-ring transition-colors hover:bg-surface-raised hover:text-accent-text",
                        )}
                      >
                        {labels.items[item.key]}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
