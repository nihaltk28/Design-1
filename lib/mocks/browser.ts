import { setupWorker } from "msw/browser";
import { handlers } from "./handlers";

/** Browser-side MSW (service worker in public/mockServiceWorker.js) — for client-side fetches and Storybook. */
export const worker = setupWorker(...handlers);
