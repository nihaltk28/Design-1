"use client";

import { Moon, Sun } from "lucide-react";
import { useSyncExternalStore } from "react";

type Theme = "light" | "dark";
const STORAGE_KEY = "theme";
const CHANGE = "themechange";

/** The theme in use: the visitor's choice (data-theme on <html>), otherwise their system setting. */
function currentTheme(): Theme {
  const chosen = document.documentElement.dataset.theme;
  if (chosen === "light" || chosen === "dark") return chosen;
  return window.matchMedia("(prefers-color-scheme: light)").matches
    ? "light"
    : "dark";
}

function subscribe(onChange: () => void) {
  const scheme = window.matchMedia("(prefers-color-scheme: light)");
  scheme.addEventListener("change", onChange);
  window.addEventListener(CHANGE, onChange);
  return () => {
    scheme.removeEventListener("change", onChange);
    window.removeEventListener(CHANGE, onChange);
  };
}

/**
 * Light / dark switch. The choice is stored and applied before the page paints by the script in the locale
 * layout, so there's no flash. Its label names the theme it switches *to*. On the server the theme isn't known,
 * so the first render uses a neutral label and both icons are hidden until hydration.
 */
export function ThemeToggle({
  labels,
}: {
  /** Translated on the server — no translation library in the browser. */
  labels: { theme: string; toLight: string; toDark: string };
}) {
  const theme = useSyncExternalStore(subscribe, currentTheme, () => null);
  const next: Theme = theme === "light" ? "dark" : "light";

  const toggle = () => {
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Storage blocked (private mode): the choice lasts for this page only.
    }
    window.dispatchEvent(new Event(CHANGE));
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={
        theme ? labels[next === "light" ? "toLight" : "toDark"] : labels.theme
      }
      className="inline-flex size-(--size-icon-button) items-center justify-center rounded-(--radius-pill) border border-border bg-surface-raised text-text focus-ring transition-colors hover:border-accent-text"
    >
      {theme === "dark" ? <Sun aria-hidden="true" className="size-4" /> : null}
      {theme === "light" ? (
        <Moon aria-hidden="true" className="size-4" />
      ) : null}
    </button>
  );
}
