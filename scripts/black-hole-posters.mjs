// Renders the black hole's still images (lite mode on phones, and the placeholder before WebGL starts) from the
// live shader in components/sections/home/BlackHole.tsx, with the theme's glow colours from styles/tokens.css
// (dark) and styles/theme-light.css (light). Run after changing the shader or the glow tokens:
//
//   pnpm hole:posters
//
// Writes public/assets/black-hole-dark.webp and black-hole-light.webp (transparent background, like the canvas).
import { readFileSync } from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { chromium } = require("@playwright/test");
const sharp = require("sharp");

const root = path.resolve(
  path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Z]:)/, "$1")),
  "..",
);
const read = (file) => readFileSync(path.join(root, file), "utf8");

const source = read("components/sections/home/BlackHole.tsx");
const shader = (name) => {
  const match = source.match(new RegExp(`const ${name} = \`([\\s\\S]*?)\`;`));
  if (!match) throw new Error(`${name} not found in BlackHole.tsx`);
  return match[1];
};
const VERTEX = shader("VERTEX");
const FRAGMENT = shader("FRAGMENT");

const token = (css, name) => {
  const match = css
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .match(new RegExp(`${name}\\s*:\\s*(#[0-9a-fA-F]{6})`));
  if (!match) throw new Error(`${name} not found`);
  return match[1];
};
const rgb = (hex) =>
  [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
const tokens = read("styles/tokens.css");
const light = read("styles/theme-light.css");

const THEMES = {
  dark: {
    glow: rgb(token(tokens, "--color-glow")),
    glow2: rgb(token(tokens, "--color-glow-2")),
    ink: 0,
  },
  light: {
    glow: rgb(token(light, "--color-glow")),
    glow2: rgb(token(light, "--color-glow-2")),
    ink: 1,
  },
};
// The hole element's aspect ratio (1152 / 728), at a size that stays sharp on phones (2–3× screens).
const WIDTH = 1400;
const HEIGHT = Math.round((WIDTH * 728) / 1152);
// The same moment the reduced-motion still frame shows.
const TIME = 6;

const browser = await chromium.launch();
const page = await browser.newPage();
for (const [name, theme] of Object.entries(THEMES)) {
  const dataUrl = await page.evaluate(
    ({ VERTEX, FRAGMENT, WIDTH, HEIGHT, TIME, theme }) => {
      const canvas = document.createElement("canvas");
      canvas.width = WIDTH;
      canvas.height = HEIGHT;
      const gl = canvas.getContext("webgl", {
        premultipliedAlpha: false,
        preserveDrawingBuffer: true,
      });
      const compile = (type, src) => {
        const s = gl.createShader(type);
        gl.shaderSource(s, src);
        gl.compileShader(s);
        if (!gl.getShaderParameter(s, gl.COMPILE_STATUS))
          throw new Error(gl.getShaderInfoLog(s));
        return s;
      };
      const program = gl.createProgram();
      gl.attachShader(program, compile(gl.VERTEX_SHADER, VERTEX));
      gl.attachShader(program, compile(gl.FRAGMENT_SHADER, FRAGMENT));
      gl.linkProgram(program);
      gl.useProgram(program);
      gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
      gl.bufferData(
        gl.ARRAY_BUFFER,
        new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
        gl.STATIC_DRAW,
      );
      const aPos = gl.getAttribLocation(program, "aPos");
      gl.enableVertexAttribArray(aPos);
      gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
      const u = (n) => gl.getUniformLocation(program, n);
      gl.viewport(0, 0, WIDTH, HEIGHT);
      gl.uniform2f(u("uRes"), WIDTH, HEIGHT);
      gl.uniform1f(u("uTime"), TIME);
      gl.uniform3f(u("uAccent"), ...theme.glow);
      gl.uniform3f(u("uAccent2"), ...theme.glow2);
      gl.uniform1f(u("uInk"), theme.ink);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      return canvas.toDataURL("image/png");
    },
    { VERTEX, FRAGMENT, WIDTH, HEIGHT, TIME, theme },
  );
  const png = Buffer.from(dataUrl.split(",")[1], "base64");
  const out = path.join(root, "public/assets", `black-hole-${name}.webp`);
  const info = await sharp(png)
    .webp({ quality: 80, alphaQuality: 90, effort: 6 })
    .toFile(out);
  console.log(
    `${path.relative(root, out)}  ${WIDTH}×${HEIGHT}  ${(info.size / 1024).toFixed(0)} KB`,
  );
}
await browser.close();
