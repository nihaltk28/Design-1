import { notFound } from "next/navigation";

// Unknown paths under a locale render app/[locale]/not-found.tsx (with the locale layout) as a real 404.
export default function CatchAll() {
  notFound();
}
