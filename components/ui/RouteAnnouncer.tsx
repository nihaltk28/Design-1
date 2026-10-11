"use client";
// no-story: screen-reader-only live region with nothing visual to show

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

/**
 * On client-side navigation: move focus to the new page's <h1> (or <main>) and announce it
 * through a polite live region (CLAUDE.md §4). The first render is skipped — the browser handles initial load.
 */
export function RouteAnnouncer() {
  const pathname = usePathname();
  const previous = useRef(pathname);
  const region = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (previous.current === pathname) return;
    previous.current = pathname;

    const target =
      document.querySelector<HTMLElement>("main h1") ??
      document.getElementById("main");
    if (target) {
      if (!target.hasAttribute("tabindex"))
        target.setAttribute("tabindex", "-1");
      target.focus();
    }
    if (region.current)
      region.current.textContent =
        target?.textContent?.trim() || document.title;
  }, [pathname]);

  return (
    <div
      ref={region}
      aria-live="polite"
      aria-atomic="true"
      className="sr-only"
    />
  );
}
