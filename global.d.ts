import type { routing } from "@/lib/i18n/routing";
import type messages from "./messages/en.json";

// Typed translation keys: a wrong t() key fails `pnpm typecheck` (CLAUDE.md §7).
declare module "next-intl" {
  interface AppConfig {
    Locale: (typeof routing.locales)[number];
    Messages: typeof messages;
  }
}
