"use client";

import { Menu, X } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { Link, usePathname } from "@/lib/i18n/navigation";
import { NAV, type NavLabels } from "./nav";

/**
 * The navigation below the `nav` breakpoint: a disclosure (aria-expanded) that opens a panel under the header.
 * The panel fills the rest of the screen and scrolls on its own; the page behind is locked while it's open, so
 * scrolling the menu never moves the page underneath. Not a modal, so no focus trap. Escape closes it and returns focus to the button; following a link closes it
 * (open state is remembered per path).
 */
export function MobileMenu({
  label,
  navLabel,
  labels,
}: {
  label: string;
  navLabel: string;
  /** Translated on the server — no translation library in the browser. */
  labels: NavLabels;
}) {
  const pathname = usePathname();
  const [openOn, setOpenOn] = useState<string | null>(null);
  const open = openOn === pathname;
  const button = useRef<HTMLButtonElement>(null);
  const panelId = useId();

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpenOn(null);
      button.current?.focus();
    };
    document.addEventListener("keydown", onKey);
    // Lock the page while the menu is open (restored on close).
    const root = document.documentElement;
    const previous = root.style.overflow;
    root.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      root.style.overflow = previous;
    };
  }, [open]);

  const linkClass =
    "block rounded-sm px-3 py-2.5 text-base text-text focus-ring hover:text-accent-text";

  return (
    <div className="nav:hidden">
      <button
        ref={button}
        type="button"
        aria-label={label}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpenOn(open ? null : pathname)}
        className="inline-flex size-(--size-icon-button) items-center justify-center rounded-(--radius-pill) border border-border bg-surface-raised text-text focus-ring"
      >
        {open ? (
          <X aria-hidden="true" className="size-4" />
        ) : (
          <Menu aria-hidden="true" className="size-4" />
        )}
      </button>
      <nav
        id={panelId}
        aria-label={navLabel}
        hidden={!open}
        className="absolute inset-x-0 top-full z-50 h-[calc(100svh-var(--size-header))] overflow-y-auto overscroll-contain bg-surface px-(--container-gutter) py-4"
      >
        <ul className="flex flex-col gap-4">
          {NAV.map((group) => (
            <li key={group.key}>
              {"items" in group ? (
                <>
                  <p className="px-3 pb-1 mono-label text-micro text-accent-text">
                    {labels.groups[group.key]}
                  </p>
                  <ul>
                    {group.items.map((item) => (
                      <li key={item.key}>
                        <Link
                          href={item.href}
                          aria-current={
                            pathname === item.href ? "page" : undefined
                          }
                          className={linkClass}
                        >
                          {labels.items[item.key]}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </>
              ) : (
                <Link
                  href={group.href}
                  aria-current={pathname === group.href ? "page" : undefined}
                  className={linkClass}
                >
                  {labels.groups[group.key]}
                </Link>
              )}
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
