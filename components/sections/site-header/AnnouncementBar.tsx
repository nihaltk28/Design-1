"use client";

import { Telescope, X } from "lucide-react";
import { useSyncExternalStore } from "react";
import { ButtonLink } from "@/components/ui/ButtonLink";
import type { SiteSettings } from "@/lib/schemas/site-settings";
import { ANNOUNCEMENT_DISMISSED_KEY as STORAGE_KEY } from "./announcement";

const CHANGE = "announcementchange";

/** The text of the announcement the visitor closed this session, if any. */
function dismissedText() {
  try {
    return sessionStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}
function subscribe(onChange: () => void) {
  window.addEventListener(CHANGE, onChange);
  return () => window.removeEventListener(CHANGE, onChange);
}

type AnnouncementBarProps = {
  announcement: NonNullable<SiteSettings["announcement"]>;
  labels: { region: string; close: string };
};

/**
 * The bar under the header. It sticks to the top while the page scrolls (the header scrolls away). Closing it
 * hides it for the rest of the session — a new announcement (different text) shows again.
 */
export function AnnouncementBar({
  announcement,
  labels,
}: AnnouncementBarProps) {
  const dismissed = useSyncExternalStore(subscribe, dismissedText, () => null);
  if (dismissed === announcement.text) return null;

  const close = () => {
    try {
      sessionStorage.setItem(STORAGE_KEY, announcement.text);
    } catch {
      // Storage blocked: hide for this page only.
    }
    window.dispatchEvent(new Event(CHANGE));
    document.getElementById("main")?.focus();
  };

  return (
    <section
      aria-label={labels.region}
      // Hidden before the first paint when closed this session (announcement.ts, tokens.css).
      data-announcement=""
      className="sticky top-0 z-40 border-b border-border bg-page/90 backdrop-blur"
    >
      <div className="relative flex min-h-(--size-bar) items-center justify-center gap-4 px-(--container-gutter) py-2 pe-14">
        <Telescope
          aria-hidden="true"
          className="hidden size-4 shrink-0 text-accent-text sm:block"
        />
        <p className="text-sm font-semibold text-text">{announcement.text}</p>
        <ButtonLink href={announcement.cta.href} size="sm" className="shrink-0">
          {announcement.cta.label}
        </ButtonLink>
        <button
          type="button"
          onClick={close}
          aria-label={labels.close}
          className="absolute end-(--container-gutter) inline-flex size-8 items-center justify-center rounded-(--radius-pill) text-accent-text focus-ring hover:bg-surface-raised"
        >
          <X aria-hidden="true" className="size-4" />
        </button>
      </div>
    </section>
  );
}
