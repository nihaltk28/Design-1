import { setupServer } from "msw/node";
import { handlers } from "./handlers";

/** Node-side MSW — started lazily by lib/api/client.ts when NEXT_PUBLIC_USE_MOCKS=true (also in `next build` workers). */
export const server = setupServer(...handlers);
