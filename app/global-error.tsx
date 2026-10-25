"use client";

import { useEffect } from "react";
import { CONTAINER_CLASSNAME } from "@/components/ui/Container";
import { cn } from "@/lib/utils/cn";
import "./globals.css";

// Last-resort boundary when the root layout itself fails. It replaces <html>, so there's no locale
// provider here — the message is shown in both languages. Never render error.message (CLAUDE.md §6).
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Monitoring: none — logged to the browser console; server errors go through instrumentation.ts.
    console.error(error);
  }, [error]);

  return (
    <html lang="en" dir="ltr">
      <body>
        <main className={cn(CONTAINER_CLASSNAME, "py-24")}>
          <h1 className="text-display font-bold">Something went wrong</h1>
          <p className="mt-4 text-lg" lang="ar" dir="rtl">
            حدث خطأ ما
          </p>
          <button
            type="button"
            onClick={reset}
            className="mt-6 rounded-md bg-accent px-4 py-2 text-on-accent focus-ring"
          >
            Try again · <span lang="ar">حاول مرة أخرى</span>
          </button>
        </main>
      </body>
    </html>
  );
}
