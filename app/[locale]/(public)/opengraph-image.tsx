import { ImageResponse } from "next/og";
import { hasLocale } from "next-intl";
import { getTranslations } from "next-intl/server";
import { getSiteSettings } from "@/lib/api/site-settings";
import { routing } from "@/lib/i18n/routing";
import { OG_COLORS as C } from "@/lib/seo/og-colors";

// Share image for the home page (Open Graph / X) — drawn in code like the page's black hole, no image file.
// Next adds og:image (absolute, via metadataBase) and its alt to the page automatically.
//
// Language-neutral on purpose: the image renderer only has a Latin font (Geist), so Arabic text would draw as
// boxes. The wordmark is the brand's Latin name (English site settings); the alt text is localised. To show
// Arabic in the image, add an Arabic .ttf/.otf font file and pass it to ImageResponse `fonts`.

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

type Params = { params: Promise<{ locale: string }> };

// Image routes don't inherit the layout's static params — list the locales here too, so both images are built.
export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateImageMetadata({ params }: Params) {
  // Next calls this once at build with no params (to list the image ids), then with the page's locale when it
  // builds each page's metadata — so an unknown locale falls back instead of 404ing.
  const value = (await params)?.locale;
  const locale = hasLocale(routing.locales, value)
    ? value
    : routing.defaultLocale;
  const t = await getTranslations({ locale, namespace: "Metadata" });
  return [{ id: "share", alt: t("shareImageAlt"), size, contentType }];
}

/** Orbit rings around the hole: diameter in px. */
const ORBITS = [380, 520, 660, 800];
const HOLE = 250;
const CENTRE = { x: 860, y: 315 };

export default async function Image() {
  const settings = await getSiteSettings("en").catch(() => null);
  const wordmark = (settings?.siteName ?? "Event Horizon").toUpperCase();

  const circle = (diameter: number) => ({
    position: "absolute" as const,
    left: CENTRE.x - diameter / 2,
    top: CENTRE.y - diameter / 2,
    width: diameter,
    height: diameter,
    borderRadius: diameter,
  });

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        position: "relative",
        background: C.page,
        overflow: "hidden",
      }}
    >
      {/* Glow behind the hole */}
      <div
        style={{
          ...circle(620),
          backgroundImage: `radial-gradient(circle, ${C.accent}55 0%, ${C.accent2}22 45%, ${C.page}00 70%)`,
        }}
      />
      {ORBITS.map((d) => (
        <div key={d} style={{ ...circle(d), border: `1px solid ${C.orbit}` }} />
      ))}
      {/* The hole: a bright ring around a dark shadow */}
      <div
        style={{
          ...circle(HOLE),
          background: C.page,
          border: `5px solid ${C.text}`,
          boxShadow: `0 0 40px 14px ${C.accent}, 0 0 110px 40px ${C.accent2}66`,
        }}
      />
      {/* The disk, edge-on across the middle */}
      <div
        style={{
          position: "absolute",
          left: CENTRE.x - 300,
          top: CENTRE.y - 9,
          width: 600,
          height: 18,
          borderRadius: 18,
          backgroundImage: `linear-gradient(90deg, ${C.accent}00, ${C.text}dd 45%, ${C.text}dd 55%, ${C.accent}00)`,
          transform: "rotate(-14deg)",
        }}
      />
      {/* Wordmark */}
      <div
        style={{
          position: "absolute",
          left: 80,
          top: 0,
          bottom: 0,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          gap: 28,
        }}
      >
        <div style={{ width: 72, height: 4, background: C.accent }} />
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            fontSize: 76,
            lineHeight: 1.05,
            letterSpacing: 6,
            color: C.text,
          }}
        >
          {wordmark.split(" ").map((word) => (
            <span key={word}>{word}</span>
          ))}
        </div>
      </div>
    </div>,
    size,
  );
}
