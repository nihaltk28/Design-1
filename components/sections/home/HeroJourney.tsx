"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
  type ReactNode,
} from "react";
import type { HomePage } from "@/lib/schemas/home";
import { cn } from "@/lib/utils/cn";
import { isLiteDevice } from "./lite";
import { HOLE_STILLS } from "./stills";
import { Starfield } from "./Starfield";

// WebGL is client-only and the heaviest part of the page → loaded on its own, after the text (CLAUDE.md §5).
const BlackHole = dynamic(
  () => import("./BlackHole").then((m) => m.BlackHole),
  {
    ssr: false,
  },
);

type HeroJourneyProps = {
  stages: HomePage["stages"];
  labels: { menu: string; stage: string; progress: string; scroll: string };
  /** Stage 1 — the hero text (server-rendered), over the first screen; it scrolls away normally. */
  hero: ReactNode;
  /** Stage 2 — the gallery cards (server-rendered, GalleriesStage). */
  galleries: ReactNode;
  /** Stage 3 — the timeline panel (server-rendered, JourneyStage). */
  journey: ReactNode;
  /** Stage 4 — the planetarium text block (server-rendered, DomeStage). */
  dome: ReactNode;
  /** Stage 5 — the featured objects around the black hole (server-rendered, ExhibitsStage). */
  exhibits: ReactNode;
  /** Stage 6 — the ticket comparison (server-rendered, CompareStage). */
  compare: ReactNode;
  /** Stage 7 — the links around the black hole before the dive (server-rendered, ExploreStage). */
  explore: ReactNode;
};

/**
 * The scroll timeline, in screen heights scrolled from the top of the page (the hero is the first thing on it).
 * Stage 1: the black hole comes into focus. Stage 2: cards fly in, hold, drift up and fade. Stage 3: a frosted
 * panel scrolls up over the scene like normal content, and its heading and steps rise in as they come on screen.
 * Stage 4: the black hole tilts and moves aside while the planetarium text rises in on the other side.
 * Stage 5: the black hole shrinks back to the middle, six cards fly out of it and lines join them to it; the
 * group then scrolls on, the black hole following it a little way before it settles back.
 * Stage 6: the black hole grows and slides to the start side while the ticket comparison rises in on the end
 * side; it drifts up with the table, then comes back to the middle.
 * Stage 7: six links fly out of the black hole; then the page dives into it — the hole rushes up to fill the
 * screen, its light floods everything, and the scene fades into the page colour.
 */
const FOCUS_END = 0.3;
const STAGE_2 = { start: 0.52, visible: 0.95, end: 1.7 };
/**
 * Where each stage begins — for the side menu and the readout. Stages 1–2 live in the fixed scene, so they're
 * scroll positions (screen heights); stages 3–4 are in the page flow, and begin when their element's top passes
 * 60% of the screen (their position depends on the panel's height).
 */
const STAGE_STARTS: (number | string)[] = [
  0,
  0.5,
  "journey",
  "dome",
  "exhibits",
  "compare",
  "explore",
];
/** How many stages are built so far; the rest show in the menu but don't link anywhere yet. */
const BUILT = STAGE_STARTS.length;

/** Orbit rings around the black hole: radius in viewBox units (the box is 1000 wide, centred on the hole). */
const ORBITS = [235, 300, 365, 430, 495, 560, 625, 690];

/** Floating dust: position (% of the scene), size step and animation delay. */
const DUST = [
  { x: 61, y: 14, size: "size-4", delay: "0s" },
  { x: 23, y: 77, size: "size-6", delay: "-4s" },
  { x: 33, y: 96, size: "size-5", delay: "-9s" },
  { x: 67, y: 91, size: "size-4", delay: "-2s" },
  { x: 86, y: 31, size: "size-3", delay: "-12s" },
  { x: 8, y: 47, size: "size-3", delay: "-6s" },
];

// Centred by a flex wrapper (it centres even an element larger than the screen, in LTR and RTL alike), so GSAP
// owns the element's `transform` alone. These are its values at the top of the page, so the server render
// doesn't jump when the animation takes over.
const HOLE_START = {
  transform: "translateY(-10vh) scale(1.3)",
  opacity: 0.5,
  "--hole-blur": "16px",
} as CSSProperties;
const ORBITS_START = { transform: "scale(1.08)", opacity: 0.55 } as const;

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));
const noSubscribe = () => () => {};

/**
 * Lite mode (lite.ts — phones, tablets, low-power machines): the scene stays settled and the black hole is a
 * still image; stage content fades up with CSS as it comes on screen ([data-journey=lite] in tokens.css); one
 * passive, frame-throttled scroll handler shows the galleries, runs the dive's fade and updates the readout.
 * Returns the cleanup.
 */
function liteJourney(el: HTMLElement, onStage: (index: number) => void) {
  const one = (selector: string) => el.querySelector<HTMLElement>(selector);
  const hole = one("[data-scene=hole]");
  const orbits = one("[data-scene=orbits]");
  const cue = one("[data-scene=cue]");
  const layer2 = one("[data-stage=galleries]");
  const explore = one("[data-stage=explore]");
  const dive = one("[data-scene=dive]");
  const flood = one("[data-scene=flood]");
  const fade = one("[data-scene=fade]");
  const progressText = one("[data-hud=progress]");
  const progressBar = one("[data-hud=bar]");

  // The settled scene — the hero's focus animation is skipped.
  hole?.style.setProperty("--hole-blur", "0px");
  if (hole) Object.assign(hole.style, { transform: "none", opacity: "1" });
  if (orbits) Object.assign(orbits.style, { transform: "none", opacity: "1" });
  if (layer2) layer2.style.transition = "opacity 0.4s ease-out";
  el.dataset.journey = "lite";

  const reveal = new IntersectionObserver(
    (entries) =>
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        (entry.target as HTMLElement).dataset.shown = "";
        reveal.unobserve(entry.target);
      }),
    { rootMargin: "0px 0px -8% 0px" },
  );
  el.querySelectorAll("[data-anim]").forEach((node) => reveal.observe(node));

  let frame = 0;
  const update = () => {
    frame = 0;
    // Reads first, then writes (no forced layouts).
    const vh = window.innerHeight;
    const y = window.scrollY;
    const box = el.getBoundingClientRect();
    const exploreBox = explore?.getBoundingClientRect();
    const diveBox = dive?.getBoundingClientRect();
    const stageTops = STAGE_STARTS.map((start) =>
      typeof start === "number"
        ? null
        : (el.querySelector(`[data-stage=${start}]`)?.getBoundingClientRect()
            .top ?? Infinity),
    );

    const galleriesOn = y >= STAGE_2.start * vh && y <= STAGE_2.end * vh;
    if (layer2) {
      layer2.style.opacity = galleriesOn ? "1" : "0";
      layer2.style.pointerEvents = galleriesOn ? "auto" : "none";
    }
    if (cue) cue.style.opacity = String(clamp01(1 - y / (0.15 * vh)));

    // The dive, as on desktop: from the links' centre at 30% of the screen to the end of the runway.
    if (exploreBox && diveBox) {
      const start = exploreBox.top + exploreBox.height / 2 - 0.3 * vh;
      const end = diveBox.bottom - vh;
      const p = clamp01(-start / Math.max(1, end - start));
      if (flood) flood.style.opacity = String(clamp01((p - 0.15) / 0.35));
      if (fade) fade.style.opacity = String(clamp01((p - 0.75) / 0.25));
      if (hole) hole.style.opacity = String(1 - clamp01((p - 0.3) / 0.25));
    }

    const progress = clamp01(-box.top / Math.max(1, box.height - vh));
    if (progressText) progressText.textContent = progress.toFixed(3);
    if (progressBar) progressBar.style.transform = `scaleX(${progress})`;
    let index = 0;
    STAGE_STARTS.forEach((start, i) => {
      const top = stageTops[i];
      if (
        typeof start === "number"
          ? y >= start * vh
          : (top ?? Infinity) <= vh * 0.6
      )
        index = i;
    });
    onStage(index);
  };
  const onScroll = () => {
    if (!frame) frame = requestAnimationFrame(update);
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll, { passive: true });
  update();

  // Keyboard: focusing a gallery card while the galleries aren't on screen scrolls them into view.
  const onFocus = (event: FocusEvent) => {
    if (!layer2?.contains(event.target as Node)) return;
    const y = window.scrollY / window.innerHeight;
    if (y < STAGE_2.start + 0.35 || y > STAGE_2.end - 0.6)
      window.scrollTo({ top: STAGE_2.visible * window.innerHeight });
  };
  el.addEventListener("focusin", onFocus);

  return () => {
    cancelAnimationFrame(frame);
    window.removeEventListener("scroll", onScroll);
    window.removeEventListener("resize", onScroll);
    el.removeEventListener("focusin", onFocus);
    reveal.disconnect();
    delete el.dataset.journey;
  };
}

/**
 * The scroll journey at the top of the home page. A sticky scene (stars, orbits, dust, the black hole) stays on
 * screen through a tall runway; each stage's content is animated over it by GSAP ScrollTrigger, scrubbed to the
 * scroll position. Content stays in the page for screen readers at all times; focusing something in a stage
 * that isn't on screen scrolls that stage into view. With reduced motion, stages switch without animating.
 */
export function HeroJourney({
  stages,
  labels,
  hero,
  galleries,
  journey,
  dome,
  exhibits,
  compare,
  explore,
}: HeroJourneyProps) {
  const root = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const activeRef = useRef(0);
  // "lite" or "full" once on the client; null on the server and while hydrating (no mismatch).
  const mode = useSyncExternalStore(
    noSubscribe,
    () => (isLiteDevice() ? "lite" : "full"),
    () => null,
  );
  const [webglReady, setWebglReady] = useState(false);
  // The live black hole is mounted on the visitor's first interaction (scroll, pointer, touch, key): until then
  // it would only show a still frame — the same as the still image — and its WebGL setup is the page's single
  // biggest piece of start-up work.
  const [interacted, setInteracted] = useState(false);
  useEffect(() => {
    const events = [
      "scroll",
      "wheel",
      "pointermove",
      "pointerdown",
      "touchstart",
      "keydown",
    ] as const;
    const onFirst = () => {
      setInteracted(true);
      events.forEach((type) => window.removeEventListener(type, onFirst));
    };
    events.forEach((type) =>
      window.addEventListener(type, onFirst, { passive: true }),
    );
    return () =>
      events.forEach((type) => window.removeEventListener(type, onFirst));
  }, []);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const onStage = (index: number) => {
      if (index === activeRef.current) return;
      activeRef.current = index;
      setActive(index);
    };
    if (isLiteDevice()) return liteJourney(el, onStage);

    // Desktop: the full journey. GSAP and ScrollTrigger are loaded here, so lite devices never download them.
    let cancelled = false;
    let teardown: (() => void) | undefined;
    void import("./motion").then(
      ({ gsap, ScrollTrigger, scrollToY, prefersReducedMotion }) => {
        if (cancelled) return;
        const reduce = prefersReducedMotion();
        const vh = () => window.innerHeight;
        const q = gsap.utils.selector(el);
        const [hole] = q("[data-scene=hole]");
        const [orbits] = q("[data-scene=orbits]");
        const [stars] = q("[data-scene=stars]");
        const [cue] = q("[data-scene=cue]");
        const [layer2] = q("[data-stage=galleries]");
        const [inner2] = q("[data-stage=galleries] > *");
        const [progressText] = q("[data-hud=progress]");
        const [progressBar] = q("[data-hud=bar]");

        const ctx = gsap.context(() => {
          // Readout, progress bar and the active stage, from the scroll position.
          ScrollTrigger.create({
            trigger: el,
            start: "top top",
            end: "bottom bottom",
            onUpdate: (self) => {
              if (progressText)
                progressText.textContent = self.progress.toFixed(3);
              gsap.set(progressBar, { scaleX: self.progress });
            },
          });
          ScrollTrigger.create({
            start: 0,
            end: "max",
            onUpdate: () => {
              const y = window.scrollY / vh();
              let index = 0;
              STAGE_STARTS.forEach((start, i) => {
                const reached =
                  typeof start === "number"
                    ? y >= start
                    : (q(`[data-stage=${start}]`)[0]?.getBoundingClientRect()
                        .top ?? Infinity) <=
                      vh() * 0.6;
                if (reached) index = i;
              });
              onStage(index);
            },
          });

          if (reduce) {
            // No motion: the black hole is simply in focus; stage 2 appears and disappears with its scroll range.
            gsap.set(hole, {
              y: 0,
              scale: 1,
              opacity: 1,
              "--hole-blur": "0px",
            });
            gsap.set(orbits, { scale: 1, opacity: 1 });
            gsap.set(layer2, { autoAlpha: 0 });
            ScrollTrigger.create({
              start: () => STAGE_2.start * vh(),
              end: () => STAGE_2.end * vh(),
              onToggle: (self) =>
                gsap.set(layer2, { autoAlpha: self.isActive ? 1 : 0 }),
            });
            return;
          }

          // Stage 1 — focus: sharpen, brighten, shrink to size and settle in the middle.
          const focus = {
            start: 0,
            end: () => FOCUS_END * vh(),
            scrub: true,
            invalidateOnRefresh: true,
          };
          gsap.fromTo(
            hole,
            {
              y: () => -0.1 * vh(),
              scale: 1.3,
              opacity: 0.5,
              "--hole-blur": "16px",
            },
            {
              y: 0,
              scale: 1,
              opacity: 1,
              "--hole-blur": "0px",
              ease: "none",
              scrollTrigger: focus,
            },
          );
          gsap.fromTo(
            orbits,
            { scale: 1.08, opacity: 0.55 },
            { scale: 1, opacity: 1, ease: "none", scrollTrigger: focus },
          );
          gsap.to(cue, {
            opacity: 0,
            ease: "none",
            scrollTrigger: { start: 0, end: () => 0.15 * vh(), scrub: true },
          });
          gsap.to(stars, {
            y: () => -0.06 * vh(),
            ease: "none",
            scrollTrigger: {
              trigger: el,
              start: "top top",
              end: "bottom bottom",
              scrub: true,
            },
          });

          // Stage 2 — galleries. Hide every element first (a scrubbed, staggered fromTo only pre-renders its first
          // target), then show the layer.
          const rtl = document.documentElement.dir === "rtl" ? -1 : 1;
          const eyebrow = q("[data-anim=eyebrow]");
          const cards = q("[data-anim=card]");
          const tagline = q("[data-anim=tagline]");
          gsap.set([eyebrow, cards, tagline], { opacity: 0 });
          gsap.set(layer2, { opacity: 1, pointerEvents: "none" });
          const stage2 = gsap.timeline({
            defaults: { ease: "power2.out" },
            scrollTrigger: {
              start: () => STAGE_2.start * vh(),
              end: () => STAGE_2.end * vh(),
              scrub: 0.6,
              invalidateOnRefresh: true,
              onToggle: (self) =>
                gsap.set(layer2, {
                  pointerEvents: self.isActive ? "auto" : "none",
                }),
            },
          });
          stage2
            .fromTo(
              eyebrow,
              { opacity: 0, y: () => 0.3 * vh() },
              { opacity: 1, y: 0, duration: 0.2 },
              0,
            )
            .fromTo(
              cards,
              {
                opacity: 0,
                // Each card arrives from the black hole's direction (its inner side), a little low and small.
                x: (_i: number, card: Element) =>
                  (card as HTMLElement).dataset.side === "start"
                    ? 90 * rtl
                    : -90 * rtl,
                y: 70,
                scale: 0.92,
              },
              {
                opacity: 1,
                x: 0,
                y: 0,
                scale: 1,
                duration: 0.16,
                stagger: 0.07,
              },
              0.06,
            )
            .fromTo(
              tagline,
              { opacity: 0, y: 40 },
              { opacity: 1, y: 0, duration: 0.14 },
              0.22,
            )
            // Then the whole group scrolls up with the page (1:1) past the fixed black hole, and fades at the end.
            .to(
              inner2,
              {
                y: () => -(STAGE_2.end - STAGE_2.visible) * vh(),
                duration: 0.64,
                ease: "none",
              },
              0.36,
            )
            .to(inner2, { opacity: 0, duration: 0.14, ease: "none" }, 0.86);

          // Stage 3 — the panel scrolls naturally; its heading and steps rise in as they come on screen.
          const [journeyHead] = q("[data-anim=journey-head]");
          const steps = q("[data-anim=step]");
          gsap.fromTo(
            journeyHead,
            { opacity: 0, y: 50 },
            {
              opacity: 1,
              y: 0,
              ease: "power2.out",
              scrollTrigger: {
                trigger: journeyHead,
                start: "top 90%",
                end: "top 55%",
                scrub: 0.5,
              },
            },
          );
          gsap.set(steps, { opacity: 0 });
          gsap
            .timeline({
              scrollTrigger: {
                trigger: steps[0]?.parentElement,
                start: "top 95%",
                end: "top 45%",
                scrub: 0.5,
              },
            })
            .fromTo(
              steps,
              { opacity: 0, y: 60 },
              {
                opacity: 1,
                y: 0,
                duration: 0.3,
                stagger: 0.1,
                ease: "power2.out",
              },
            );

          // Stage 4 — the black hole tilts and moves to the far side (the orbits follow it) while the planetarium
          // text sharpens in as it rises; then the text fades near the top and the hole comes back to the middle.
          const [domeStage] = q("[data-stage=dome]");
          const [domeBlock] = q("[data-anim=dome]");
          const [holeRig] = q("[data-scene=hole-rig]");
          const [orbitsRig] = q("[data-scene=orbits-rig]");
          // Desktop: beside the text, on the far side. Phones and tablets: there's no room beside it, so below it.
          const wide = () => window.innerWidth >= 1024;
          const asideX = () => (wide() ? 0.15 * window.innerWidth * rtl : 0);
          const asideY = () => (wide() ? -0.02 : 0.3) * vh();
          // The camera path — the black hole and the orbits through stages 4–7, and the dive. Each move is an
          // explicit from → to (its "from" is where the previous move ended) and follows the scroll directly
          // (scrub: true; Lenis already smooths the scroll). Moves on the same property never overlap in scroll
          // range. With plain .to() tweens and a scrub lag, a move could record a half-finished starting point or
          // fight the previous one, and the hole jumped or flickered.
          const camera = (
            target: Element | Element[],
            from: gsap.TweenVars,
            to: gsap.TweenVars,
            scrollTrigger: ScrollTrigger.Vars,
            ease = "power1.inOut",
          ) =>
            gsap.fromTo(target, from, {
              ...to,
              ease,
              immediateRender: false,
              scrollTrigger: {
                scrub: true,
                invalidateOnRefresh: true,
                ...scrollTrigger,
              },
            });
          const deg = (value: number) => value * rtl;
          const domeScale = () => (wide() ? 1.05 : 0.8);
          const coreScale = () => (wide() ? 0.62 : 0.7);
          const besideX = () => (wide() ? -0.2 * window.innerWidth * rtl : 0);
          const compareScale = () => (wide() ? 0.85 : 0.7);
          const driftY = () => -0.12 * vh();
          const exploreScale = () => (wide() ? 0.7 : 0.75);
          const domeIn = {
            trigger: domeStage,
            start: "top 150%",
            end: "top 60%",
          };
          camera(
            holeRig,
            { x: 0, y: 0, rotation: 0, scale: 1 },
            { x: asideX, y: asideY, rotation: deg(-20), scale: domeScale },
            domeIn,
          );
          camera(orbitsRig, { x: 0, y: 0 }, { x: asideX, y: asideY }, domeIn);
          const domeOut = {
            trigger: domeStage,
            start: "bottom 75%",
            end: "bottom 15%",
          };
          camera(
            holeRig,
            { x: asideX, y: asideY, scale: domeScale },
            { x: 0, y: 0, scale: 0.85 },
            domeOut,
          );
          camera(orbitsRig, { x: asideX, y: asideY }, { x: 0, y: 0 }, domeOut);
          gsap.fromTo(
            domeBlock,
            { opacity: 0, y: 60, filter: "blur(10px)" },
            {
              opacity: 1,
              y: 0,
              filter: "blur(0px)",
              ease: "power2.out",
              scrollTrigger: {
                trigger: domeBlock,
                start: "top 100%",
                end: "top 55%",
                scrub: 0.5,
              },
            },
          );
          gsap.to(domeBlock, {
            opacity: 0,
            ease: "none",
            immediateRender: false,
            scrollTrigger: {
              trigger: domeBlock,
              start: "top 20%",
              end: "top -10%",
              scrub: 0.5,
            },
          });

          // Stage 5 — the black hole shrinks back into the middle as the group arrives …
          const [exhibitsStage] = q("[data-stage=exhibits]");
          const exhibitsEyebrow = q("[data-anim=exhibits-eyebrow]");
          const exhibitsHead = q("[data-anim=exhibits-head]");
          const exhibitCards = q("[data-anim=exhibit]");
          const [lines] = q("[data-anim=exhibits-lines]");
          camera(
            holeRig,
            { scale: 0.85, rotation: deg(-20) },
            { scale: coreScale, rotation: deg(-32) },
            { trigger: exhibitsStage, start: "top 70%", end: "center center" },
          );
          // … the cards fly out of it, row by row on both sides at once, and the lines grow out to them. Phones and
          // tablets stack everything in a tall column, so each element rises in on its own as it comes on screen.
          const media = gsap.matchMedia();
          media.add("(min-width: 1024px)", () => {
            gsap.set([exhibitsEyebrow, exhibitsHead, exhibitCards], {
              opacity: 0,
            });
            gsap.set(lines, { clipPath: "inset(0% 50% 0% 50%)" });
            const arrive = gsap.timeline({
              defaults: { ease: "power2.out" },
              scrollTrigger: {
                trigger: exhibitsStage,
                start: "top 75%",
                end: "center 55%",
                scrub: 0.6,
                invalidateOnRefresh: true,
              },
            });
            arrive.fromTo(
              exhibitsEyebrow,
              { opacity: 0, y: 40 },
              { opacity: 1, y: 0, duration: 0.25 },
              0,
            );
            exhibitCards.forEach((card, index) => {
              const inward =
                (card as HTMLElement).dataset.side === "start" ? 1 : -1;
              arrive.fromTo(
                card,
                {
                  opacity: 0,
                  x: () => inward * rtl * 0.12 * window.innerWidth,
                  y: 60,
                  scale: 0.85,
                },
                { opacity: 1, x: 0, y: 0, scale: 1, duration: 0.4 },
                0.1 + (index % 3) * 0.12,
              );
            });
            arrive
              .to(
                lines,
                {
                  clipPath: "inset(0% 0% 0% 0%)",
                  duration: 0.35,
                  ease: "power1.out",
                },
                0.45,
              )
              .fromTo(
                exhibitsHead,
                { opacity: 0, y: 50 },
                { opacity: 1, y: 0, duration: 0.3 },
                0.5,
              );
          });
          media.add("(max-width: 1023.98px)", () => {
            [...exhibitsEyebrow, ...exhibitsHead, ...exhibitCards].forEach(
              (item) => {
                gsap.fromTo(
                  item,
                  { opacity: 0, y: 50 },
                  {
                    opacity: 1,
                    y: 0,
                    ease: "power2.out",
                    scrollTrigger: {
                      trigger: item,
                      start: "top 95%",
                      end: "top 70%",
                      scrub: 0.5,
                    },
                  },
                );
              },
            );
          });
          // Then the black hole follows the group up for a quarter of a screen, and settles back as the title
          // passes over it, fading.
          const followY = () => -0.25 * vh();
          camera(
            holeRig,
            { y: 0 },
            { y: followY },
            {
              trigger: exhibitsStage,
              start: "center center",
              end: "center 25%",
            },
            "none",
          );
          camera(
            holeRig,
            { y: followY },
            { y: 0 },
            { trigger: exhibitsStage, start: "center 25%", end: "bottom top" },
          );
          // Desktop: the title fades as it passes over the black hole (phones: it just scrolls away). fromTo: the
          // entrance has hidden it at load, so a plain "to" would fade from 0 to 0.
          media.add("(min-width: 1024px)", () => {
            gsap.fromTo(
              exhibitsHead,
              { opacity: 1, filter: "blur(0px)" },
              {
                opacity: 0,
                filter: "blur(8px)",
                ease: "none",
                immediateRender: false,
                scrollTrigger: {
                  trigger: exhibitsHead,
                  start: "top 55%",
                  end: "top 20%",
                  scrub: 0.5,
                },
              },
            );
          });

          // Stage 6 — the black hole grows and slides to the start side (the orbits follow) as the comparison
          // arrives; stage 5's exit has already brought it back to y 0, so this leaves y alone until it has finished.
          const [compareStage] = q("[data-stage=compare]");
          const [compareBlock] = q("[data-anim=compare]");
          const compareIn = {
            trigger: compareStage,
            start: "top 110%",
            end: "top 30%",
          };
          camera(
            holeRig,
            { x: 0, scale: coreScale, rotation: deg(-32) },
            { x: besideX, scale: compareScale, rotation: deg(-6) },
            compareIn,
          );
          camera(orbitsRig, { x: 0 }, { x: besideX }, compareIn);
          // It drifts up a little with the table …
          camera(
            [holeRig, orbitsRig],
            { y: 0 },
            { y: driftY },
            { trigger: compareStage, start: "top 20%", end: "bottom 70%" },
            "none",
          );
          // … and comes back to the middle as the table leaves.
          const compareOut = {
            trigger: compareStage,
            start: "bottom 70%",
            end: "bottom 35%",
          };
          camera(
            holeRig,
            { x: besideX, y: driftY, scale: compareScale, rotation: deg(-6) },
            { x: 0, y: 0, scale: 0.8, rotation: deg(-24) },
            compareOut,
          );
          camera(
            orbitsRig,
            { x: besideX, y: driftY },
            { x: 0, y: 0 },
            compareOut,
          );
          gsap.fromTo(
            compareBlock,
            { opacity: 0, y: 60, filter: "blur(10px)" },
            {
              opacity: 1,
              y: 0,
              filter: "blur(0px)",
              ease: "power2.out",
              scrollTrigger: {
                trigger: compareBlock,
                start: "top 100%",
                end: "top 50%",
                scrub: 0.5,
              },
            },
          );
          gsap.fromTo(
            compareBlock,
            { opacity: 1 },
            {
              opacity: 0,
              ease: "none",
              immediateRender: false,
              scrollTrigger: {
                trigger: compareBlock,
                start: "bottom 45%",
                end: "bottom 5%",
                scrub: 0.5,
              },
            },
          );

          // Stage 7 — the black hole settles small in the middle, tilted, as the links arrive …
          const [exploreStage] = q("[data-stage=explore]");
          const exploreEyebrow = q("[data-anim=explore-eyebrow]");
          const exploreLinks = q("[data-anim=explore-link]");
          const exploreCue = q("[data-anim=explore-cue]");
          camera(
            holeRig,
            { scale: 0.8, rotation: deg(-24) },
            { scale: exploreScale, rotation: deg(-32) },
            { trigger: exploreStage, start: "top 55%", end: "center center" },
          );
          // … flying out of it row by row (desktop), or rising in one by one on phones and tablets.
          media.add("(min-width: 1024px)", () => {
            gsap.set([exploreEyebrow, exploreLinks, exploreCue], {
              opacity: 0,
            });
            const arrive = gsap.timeline({
              defaults: { ease: "power2.out" },
              scrollTrigger: {
                trigger: exploreStage,
                start: "top 75%",
                end: "center 50%",
                scrub: 0.6,
                invalidateOnRefresh: true,
              },
            });
            arrive.fromTo(
              exploreEyebrow,
              { opacity: 0, y: 40 },
              { opacity: 1, y: 0, duration: 0.25 },
              0,
            );
            exploreLinks.forEach((link, index) => {
              const inward =
                (link as HTMLElement).dataset.side === "start" ? 1 : -1;
              arrive.fromTo(
                link,
                {
                  opacity: 0,
                  x: () => inward * rtl * 0.1 * window.innerWidth,
                  scale: 0.9,
                },
                { opacity: 1, x: 0, scale: 1, duration: 0.4 },
                0.1 + (index % 3) * 0.1,
              );
            });
            arrive.fromTo(
              exploreCue,
              { opacity: 0, y: 30 },
              { opacity: 1, y: 0, duration: 0.25 },
              0.6,
            );
          });
          media.add("(max-width: 1023.98px)", () => {
            [...exploreEyebrow, ...exploreLinks, ...exploreCue].forEach(
              (item) => {
                gsap.fromTo(
                  item,
                  { opacity: 0, y: 50 },
                  {
                    opacity: 1,
                    y: 0,
                    ease: "power2.out",
                    scrollTrigger: {
                      trigger: item,
                      start: "top 95%",
                      end: "top 70%",
                      scrub: 0.5,
                    },
                  },
                );
              },
            );
          });

          // The dive: the black hole rushes up to fill the screen. It's shifted as it grows so that its bright ring,
          // not the dark middle, passes through the centre of the screen. Then its light floods the screen and the
          // page colour covers the scene.
          const [dive] = q("[data-scene=dive]");
          const [flood] = q("[data-scene=flood]");
          const [band] = q("[data-scene=band]");
          const [fade] = q("[data-scene=fade]");
          const DIVE_SCALE = 9;
          // The ring's radius on screen at full size (the shader draws it at 0.21 of the canvas height).
          const ringShift = () =>
            0.21 *
            (hole as HTMLElement).offsetHeight *
            DIVE_SCALE *
            Math.SQRT1_2;
          gsap
            .timeline({
              // It begins while the links are still on screen (they stay over the flood).
              scrollTrigger: {
                trigger: exploreStage,
                start: "center 30%",
                endTrigger: dive,
                end: "bottom bottom",
                scrub: true,
                invalidateOnRefresh: true,
              },
            })
            .fromTo(
              holeRig,
              { scale: exploreScale, rotation: deg(-32), x: 0, y: 0 },
              {
                // Inside a timeline a fromTo applies its "from" at load unless told not to — that would tilt the
                // hole from the first screen on.
                immediateRender: false,
                scale: DIVE_SCALE,
                rotation: -45 * rtl,
                x: () => -ringShift() * rtl,
                y: () => -ringShift(),
                ease: "power2.in",
                duration: 0.6,
              },
              0,
            )
            .to(
              hole,
              { "--hole-blur": "14px", ease: "power1.in", duration: 0.6 },
              0,
            )
            .fromTo(
              orbitsRig,
              { scale: 1 },
              {
                scale: 3,
                ease: "power2.in",
                duration: 0.6,
                immediateRender: false,
              },
              0,
            )
            .to(orbits, { opacity: 0, ease: "none", duration: 0.4 }, 0.1)
            .to(
              stars,
              { scale: 1.6, opacity: 0.3, ease: "power2.in", duration: 0.6 },
              0,
            )
            .fromTo(
              flood,
              { opacity: 0, scale: 0.4 },
              { opacity: 1, scale: 2.4, ease: "power2.in", duration: 0.35 },
              0.15,
            )
            // Under the flood, the hole itself fades, so its dark middle never fills the screen.
            .to(hole, { opacity: 0, ease: "power1.in", duration: 0.25 }, 0.3)
            .fromTo(
              band,
              { opacity: 0, rotation: 0 },
              { opacity: 1, rotation: 12 * rtl, ease: "none", duration: 0.35 },
              0.3,
            )
            .to(fade, { opacity: 1, ease: "none", duration: 0.25 }, 0.75);
        }, el);

        // Keyboard: focusing a link in a stage that isn't on screen scrolls that stage into view.
        const onFocus = (event: FocusEvent) => {
          if (!layer2?.contains(event.target as Node)) return;
          const y = window.scrollY / vh();
          if (y < STAGE_2.start + 0.35 || y > STAGE_2.end - 0.6)
            scrollToY(STAGE_2.visible * vh());
        };
        el.addEventListener("focusin", onFocus);

        teardown = () => {
          el.removeEventListener("focusin", onFocus);
          ctx.revert();
        };
      },
    );

    return () => {
      cancelled = true;
      teardown?.();
    };
  }, []);

  const current = stages[active];

  return (
    <div ref={root} className="relative">
      {/* Stage 1 — the hero text, over the first screen; it scrolls away normally. First in the source, so the
          page's <h1> and the hero buttons come first for screen readers and the keyboard; z-10 keeps it above
          the scene, which follows it in the source. */}
      <div className="absolute inset-x-0 top-0 z-10 min-h-(--size-first-screen)">
        {hero}
        <div
          data-scene="cue"
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-12 flex flex-col items-center gap-3"
        >
          <span className="mono-label text-label text-text">
            {labels.scroll}
          </span>
          <span className="relative h-12 w-px overflow-hidden bg-border">
            <span className="absolute inset-0 animate-cue bg-accent-text" />
          </span>
        </div>
      </div>

      {/* Anchor for the side menu's stage-2 link (lands where the cards are all on screen). */}
      <span
        id={`stage-${stages[1]?.id}`}
        aria-hidden="true"
        className="absolute top-[90svh]"
      />

      {/* Anchor for the stage-3 link: the panel's top. */}
      <span
        id={`stage-${stages[2]?.id}`}
        aria-hidden="true"
        className="absolute top-[185svh]"
      />

      <div className="sticky top-0 h-svh overflow-hidden">
        {/* The scene: decoration only. */}
        <div aria-hidden="true" className="absolute inset-0">
          <div data-scene="stars" className="absolute inset-x-0 -inset-y-[8vh]">
            <Starfield className="size-full" />
          </div>
          <div
            data-scene="orbits-rig"
            className="absolute inset-0 flex items-center justify-center"
          >
            <svg
              data-scene="orbits"
              viewBox="0 0 1000 1000"
              style={ORBITS_START}
              className="size-[max(160vw,160vh)] shrink-0"
            >
              {ORBITS.map((r) => (
                <circle
                  key={r}
                  cx="500"
                  cy="500"
                  r={r * 0.62}
                  fill="none"
                  vectorEffect="non-scaling-stroke"
                  className="stroke-orbit"
                />
              ))}
            </svg>
          </div>
          {DUST.map((d) => (
            <span
              key={`${d.x}-${d.y}`}
              style={{
                left: `${d.x}%`,
                top: `${d.y}%`,
                animationDelay: d.delay,
              }}
              className={cn(
                "absolute animate-drift rounded-sm bg-text-muted/15 blur-xs",
                d.size,
              )}
            />
          ))}
          <div
            data-scene="hole-rig"
            className="absolute inset-0 flex items-center justify-center"
          >
            <div
              data-scene="hole"
              style={HOLE_START}
              className="relative aspect-[1152/728] w-(--size-hole) shrink-0"
            >
              {/* Still images of the black hole (stills.ts), one per theme: what lite devices show, and what
                  desktops show until the live canvas has drawn. This is the page's LCP image: HomeHero preloads
                  the one for the visitor's theme at high priority; the other is never downloaded. */}
              {webglReady ? null : (
                <>
                  <Image
                    src={HOLE_STILLS.dark}
                    alt=""
                    fill
                    sizes={HOLE_STILLS.sizes}
                    className="hole-still-dark hole"
                  />
                  <Image
                    src={HOLE_STILLS.light}
                    alt=""
                    fill
                    sizes={HOLE_STILLS.sizes}
                    className="hole-still-light hole"
                  />
                </>
              )}
              {mode === "full" && interacted ? (
                <BlackHole
                  className="relative size-full"
                  onReady={() => setWebglReady(true)}
                />
              ) : null}
            </div>
          </div>
          {/* The dive (stage 7's end): the hole's light floods the screen, then the page colour covers it. */}
          <div
            data-scene="flood"
            className="absolute inset-0 opacity-0 dive-flood"
          />
          <div
            data-scene="band"
            className="absolute -inset-1/5 opacity-0 dive-band"
          />
          <div
            data-scene="fade"
            className="absolute inset-0 bg-page opacity-0"
          />
        </div>

        {/* Stage 2 — galleries. Invisible in the server HTML (so it doesn't flash over the hero before the
            animation takes over); the effect reveals it with each element set to its starting state. */}
        <section
          data-stage="galleries"
          aria-labelledby="stage-galleries-title"
          className="absolute inset-0 opacity-0"
        >
          {galleries}
        </section>
      </div>

      {/* Stage 3 — the timeline panel: normal content in the page flow, scrolling up over the fixed scene. It
          starts 185svh into the runway (the sticky scene above already takes 100svh of flow), and the runway
          grows with it, so a tall panel — seven stacked steps on a phone — never spills out. */}
      <section
        data-stage="journey"
        aria-labelledby="stage-journey-title"
        className="relative z-20 mt-[85svh] min-h-svh border-t border-border bg-surface-raised/55 backdrop-blur-md"
      >
        {journey}
      </section>
      {/* After the panel, the scene shows on its own again for a moment (stage 4 continues from here). */}
      <div aria-hidden="true" className="h-[10svh]" />

      {/* Stage 4 — the planetarium: normal content in the page flow, over the fixed scene. */}
      <section
        data-stage="dome"
        id={`stage-${stages[3]?.id}`}
        aria-labelledby="stage-dome-title"
        className="relative z-10"
      >
        {dome}
      </section>
      {/* After it, the scene alone again while the black hole returns to the middle. */}
      <div aria-hidden="true" className="h-[40svh]" />

      {/* Stage 5 — the featured objects: normal content in the page flow, around the fixed black hole. */}
      <section
        data-stage="exhibits"
        id={`stage-${stages[4]?.id}`}
        aria-labelledby="stage-exhibits-title"
        className="relative z-10"
      >
        {exhibits}
      </section>
      <div aria-hidden="true" className="h-[20svh]" />

      {/* Stage 6 — the ticket comparison: normal content in the page flow, beside the fixed black hole. */}
      <section
        data-stage="compare"
        id={`stage-${stages[5]?.id}`}
        aria-labelledby="stage-compare-title"
        className="relative z-10"
      >
        {compare}
      </section>
      <div aria-hidden="true" className="h-[20svh]" />

      {/* Stage 7 — the links around the black hole: normal content in the page flow. */}
      <section
        data-stage="explore"
        id={`stage-${stages[6]?.id}`}
        aria-labelledby="stage-explore-title"
        className="relative z-10"
      >
        {explore}
      </section>
      {/* The dive's runway: the scene alone, diving into the black hole. */}
      <div data-scene="dive" aria-hidden="true" className="h-svh" />

      {/* Side menu and readout (desktop) — their own sticky layer, above the stage-3 panel. */}
      <div className="pointer-events-none absolute inset-0 z-30 hidden lg:block">
        <div className="sticky top-0 h-svh">
          <nav
            aria-label={labels.menu}
            className="pointer-events-auto absolute start-8 top-1/2 -translate-y-1/2"
          >
            <ol className="flex flex-col gap-4">
              {stages.map((stage, index) => {
                const isActive = index === active;
                const marker = (
                  <span
                    aria-hidden="true"
                    className={cn(
                      "h-px transition-[width] duration-500",
                      isActive ? "w-8 bg-accent-text" : "w-4 bg-border-strong",
                    )}
                  />
                );
                const text = (
                  <span
                    className={cn(
                      "mono-label text-micro transition-colors duration-500",
                      isActive ? "text-accent-text" : "text-text-muted",
                    )}
                  >
                    {stage.label}
                  </span>
                );
                return (
                  <li key={stage.id}>
                    {index < BUILT ? (
                      <a
                        href={`#stage-${stage.id}`}
                        aria-current={isActive ? "step" : undefined}
                        className="flex items-center gap-3 rounded-sm focus-ring"
                      >
                        {marker}
                        {text}
                      </a>
                    ) : (
                      <span className="flex items-center gap-3">
                        {marker}
                        {text}
                      </span>
                    )}
                  </li>
                );
              })}
            </ol>
          </nav>

          <div aria-hidden="true" className="absolute start-8 bottom-8">
            <div className="grid grid-cols-[auto_auto] gap-x-8 gap-y-1 border-s border-border-strong ps-3 pb-2">
              <span className="mono-label text-micro text-accent-text">
                {labels.stage}
              </span>
              <span className="mono-label text-micro text-text">
                {String(active + 1).padStart(2, "0")} {current?.name}
              </span>
              <span className="mono-label text-micro text-accent-text">
                {labels.progress}
              </span>
              <span
                data-hud="progress"
                className="mono-label text-micro text-text"
              >
                {(0).toFixed(3)}
              </span>
            </div>
            <div className="ms-3 h-px w-36 bg-border">
              <div
                data-hud="bar"
                className="h-full origin-left scale-x-0 bg-accent-text rtl:origin-right"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
