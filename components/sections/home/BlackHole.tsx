"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils/cn";

// A black hole drawn live in WebGL — no image or video. Shadow, photon ring, the lensed glow around it and a
// turbulent accretion disk crossing the middle, tinted with the theme's two glow colours (the ring in the first,
// the outer glow and the disk's warm side in the second). For the light theme (--hole-ink,
// styles/theme-light.css) it draws dark ink in the same hues instead, so one shader serves both themes.

const VERTEX = `
attribute vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }
`;

const FRAGMENT = `
precision highp float;
uniform vec2 uRes;
uniform float uTime;
uniform vec3 uAccent;
uniform vec3 uAccent2;
uniform float uInk;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
}
float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  // 4 octaves: a 5th adds detail the glow and blur hide, at a quarter more cost per pixel.
  for (int i = 0; i < 4; i++) { v += a * noise(p); p *= 2.03; a *= 0.5; }
  return v;
}

void main() {
  vec2 uv = (gl_FragCoord.xy - 0.5 * uRes) / uRes.y;
  float r = length(uv);
  float a = atan(uv.y, uv.x);
  vec3 core = vec3(0.93, 0.99, 1.0);
  float R = 0.21;
  float swirl = fbm(vec2(a * 2.5 + uTime * 0.12, r * 14.0 - uTime * 0.3));

  // Photon ring: thin and crisp, just outside the shadow.
  float photon = smoothstep(0.008, 0.0, abs(r - R * 1.06));
  // The far side of the disk, lensed into a ring around the shadow: a sharp inner edge, fading outwards, with
  // fine concentric streaks — strongest above and below.
  float t = (r - R * 1.12) / (R * 0.36);
  float lensMask = smoothstep(-0.04, 0.04, t) * smoothstep(1.0, 0.7, t);
  float streaks = 0.86 + 0.14 * sin(r * 220.0 + swirl * 5.0);
  float lens = lensMask * exp(-t * 1.8) * streaks * (0.45 + 0.55 * pow(abs(sin(a)), 0.6)) * (0.7 + 0.6 * swirl);
  // A wide, saturated glow around the ring.
  float aura = exp(-pow((r - R * 1.3) / (R * 0.32), 2.0));
  // The near side of the disk, edge-on across the middle: crisp-edged, cloudy, thicker in the centre.
  float th = 0.014 + 0.04 * smoothstep(0.5, 0.0, abs(uv.x));
  float clouds = fbm(vec2(uv.x * 7.0 - uTime * 0.2, uv.y * 46.0 + uTime * 0.05));
  float yb = uv.y + 0.006 + 0.008 * (clouds - 0.5);
  float band = smoothstep(th, th * 0.55, abs(yb)) * smoothstep(0.5, 0.05, abs(uv.x)) * (0.3 + 1.25 * clouds);
  // One side of the disk moves towards us and looks brighter (Doppler beaming).
  float beaming = 1.0 + 0.4 * clamp(-uv.x / 0.6, -1.0, 1.0);
  float glow = exp(-r * 4.0) * 0.25;
  float shadow = smoothstep(R * 1.01, R * 0.97, r);

  // The glow shades from the ring's colour into the second accent towards its outer edge.
  vec3 auraCol = mix(uAccent, uAccent2, smoothstep(R * 1.1, R * 1.7, r));
  vec3 col = mix(uAccent, uAccent2, 0.35) * glow * 0.7 + auraCol * aura * 0.4;
  col += mix(uAccent, core, 0.3) * lens * 1.6;
  col += mix(uAccent, core, 0.75) * photon * 1.5;
  col = col * (1.0 - shadow) + uAccent * 0.08 * shadow;
  // The disk: ice-white, brighter on the side moving towards us.
  vec3 diskCol = mix(mix(uAccent2, core, 0.45), mix(uAccent, core, 0.35), smoothstep(-0.3, 0.3, uv.x));
  col += diskCol * band * 1.35 * beaming;

  // Fade to black at the canvas edges, so the canvas never shows a seam.
  vec2 q = gl_FragCoord.xy / uRes;
  col *= smoothstep(0.0, 0.16, q.x) * smoothstep(1.0, 0.84, q.x) * smoothstep(0.0, 0.2, q.y) * smoothstep(1.0, 0.8, q.y);
  col = 1.0 - exp(-col * 1.3);
  // Transparent where there's no light, so the page and stars show around the hole whatever the page colour
  // (light over the background ≈ screen blending); the shadow stays opaque, so the hole itself is black.
  float light = max(col.r, max(col.g, col.b));
  vec3 hue = light > 0.0 ? col / light : vec3(0.0);
  if (uInk > 0.5) {
    // Light theme: dark ink in the same hue (brightest parts darkest), and no shadow — the page shows through.
    // Pulled towards the glow colour so the white highlights don't turn grey.
    vec3 base = mix(hue, mix(uAccent, uAccent2, 0.3), 0.6);
    vec3 ink = base * (1.0 - 0.6 * dot(base, vec3(0.299, 0.587, 0.114)));
    gl_FragColor = vec4(ink, min(1.0, light * 1.15));
  } else {
    float alpha = max(light, shadow * 0.96);
    gl_FragColor = vec4(alpha > 0.0 ? col / alpha : vec3(0.0), alpha);
  }
}
`;

/** A theme colour token (--color-glow, --color-glow-2) as 0–1 RGB, for the shader. */
function tokenRgb(
  el: Element,
  token: string,
  fallback: [number, number, number],
): [number, number, number] {
  const value = getComputedStyle(el).getPropertyValue(token).trim();
  const hex = value.replace("#", "");
  if (!/^[0-9a-f]{6}$/i.test(hex)) return fallback;
  return [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255) as [
    number,
    number,
    number,
  ];
}

/** Starts compiling a shader. Its status is checked later (checking now would wait for the compile). */
function compile(gl: WebGLRenderingContext, type: number, source: string) {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  return shader;
}

type BlackHoleProps = {
  className?: string;
  /** Called once the first frame is drawn — HeroJourney then hides the still image under the canvas. */
  onReady?: () => void;
};

export function BlackHole({ className, onReady }: BlackHoleProps) {
  const onReadyRef = useRef(onReady);
  useEffect(() => {
    onReadyRef.current = onReady;
  });
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const gl = canvas?.getContext("webgl", {
      antialias: false,
      premultipliedAlpha: false,
    });
    if (!canvas || !gl) return; // No WebGL: the stars and orbits stay, without the black hole.

    // The shader compiles in the background where the browser supports it (KHR_parallel_shader_compile), checked
    // once per frame — compiling it in one go blocked the page for hundreds of milliseconds (Windows compiles
    // through Direct3D). Until it's ready, HeroJourney shows the still image.
    const vs = compile(gl, gl.VERTEX_SHADER, VERTEX);
    const fs = compile(gl, gl.FRAGMENT_SHADER, FRAGMENT);
    const program = gl.createProgram();
    if (!vs || !fs || !program) return;
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    const parallel = gl.getExtension("KHR_parallel_shader_compile");
    let disposed = false;
    let pending = 0;
    let teardown = () => {};
    const release = () => {
      gl.deleteProgram(program);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
    };
    const whenLinked = () => {
      if (disposed) return;
      if (
        parallel &&
        !gl.getProgramParameter(program, parallel.COMPLETION_STATUS_KHR)
      ) {
        pending = requestAnimationFrame(whenLinked);
        return;
      }
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        // The still image stays.
        console.error(
          "[black-hole] shader",
          gl.getShaderInfoLog(vs),
          gl.getShaderInfoLog(fs),
          gl.getProgramInfoLog(program),
        );
        return;
      }
      teardown = start();
    };

    const start = () => {
      gl.useProgram(program);

      const buffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(
        gl.ARRAY_BUFFER,
        new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
        gl.STATIC_DRAW,
      );
      const aPos = gl.getAttribLocation(program, "aPos");
      gl.enableVertexAttribArray(aPos);
      gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
      const uRes = gl.getUniformLocation(program, "uRes");
      const uTime = gl.getUniformLocation(program, "uTime");
      const uAccent = gl.getUniformLocation(program, "uAccent");
      const uAccent2 = gl.getUniformLocation(program, "uAccent2");
      const uInk = gl.getUniformLocation(program, "uInk");

      const reduceMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;
      let frame = 0;
      let visible = true;
      const start = performance.now();

      // Theme colours, read once and again only when the theme changes — reading styles on every frame forced a
      // style recalculation per frame.
      const readTheme = () => ({
        glow: tokenRgb(canvas, "--color-glow", [0.18, 0.83, 0.75]),
        glow2: tokenRgb(canvas, "--color-glow-2", [0.22, 0.74, 0.97]),
        ink:
          getComputedStyle(canvas).getPropertyValue("--hole-ink").trim() === "1"
            ? 1
            : 0,
      });
      let theme = readTheme();

      const draw = () => {
        gl.uniform2f(uRes, canvas.width, canvas.height);
        gl.uniform1f(
          uTime,
          reduceMotion ? 6 : (performance.now() - start) / 1000,
        );
        gl.uniform3f(uAccent, ...theme.glow);
        gl.uniform3f(uAccent2, ...theme.glow2);
        gl.uniform1f(uInk, theme.ink);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      };
      const onThemeChange = () => {
        theme = readTheme();
        draw();
      };
      // The swirl moves slowly, so 30 redraws a second look the same as 60 and leave the GPU free for smooth
      // scrolling. Nothing is drawn while the hole is invisible (opacity 0 at the end of the dive).
      const FRAME_MS = 1000 / 30;
      let lastDraw = 0;
      const holeLayer = canvas.parentElement;
      const loop = (now: number) => {
        frame = requestAnimationFrame(loop);
        if (now - lastDraw < FRAME_MS - 2) return;
        if (holeLayer && Number(holeLayer.style.opacity || 1) < 0.01) return;
        lastDraw = now;
        draw();
      };
      const run = () => {
        cancelAnimationFrame(frame);
        if (reduceMotion) draw();
        else if (visible && !document.hidden)
          frame = requestAnimationFrame(loop);
      };

      // Capped at 1.5× device pixels and at about a million pixels in all — the glow is soft, so more pixels
      // cost GPU time (and scroll smoothness, on laptop graphics) without looking sharper.
      const MAX_PIXELS = 1_000_000;
      const resize = () => {
        const area = Math.max(1, canvas.clientWidth * canvas.clientHeight);
        const scale = Math.min(
          window.devicePixelRatio || 1,
          1.5,
          Math.sqrt(MAX_PIXELS / area),
        );
        canvas.width = Math.max(1, Math.round(canvas.clientWidth * scale));
        canvas.height = Math.max(1, Math.round(canvas.clientHeight * scale));
        gl.viewport(0, 0, canvas.width, canvas.height);
        draw();
      };
      const sizeObserver = new ResizeObserver(resize);
      sizeObserver.observe(canvas);
      const viewObserver = new IntersectionObserver(([entry]) => {
        visible = entry.isIntersecting;
        run();
      });
      viewObserver.observe(canvas);
      const themeObserver = new MutationObserver(onThemeChange);
      themeObserver.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ["data-theme"],
      });
      const systemTheme = window.matchMedia("(prefers-color-scheme: light)");
      systemTheme.addEventListener("change", onThemeChange);
      document.addEventListener("visibilitychange", run);
      resize();
      run();
      onReadyRef.current?.();

      return () => {
        cancelAnimationFrame(frame);
        sizeObserver.disconnect();
        viewObserver.disconnect();
        themeObserver.disconnect();
        systemTheme.removeEventListener("change", onThemeChange);
        document.removeEventListener("visibilitychange", run);
        gl.deleteBuffer(buffer);
      };
    };

    whenLinked();
    return () => {
      disposed = true;
      cancelAnimationFrame(pending);
      teardown();
      release();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={cn("block hole", className)}
    />
  );
}
