// Pre-commit (Husky → .husky/pre-commit): fix and check only the staged files, so bad code never reaches CI.
// Typecheck and e2e are whole-project and slow — they run in azure-pipelines.pr.yml instead.
const config = {
  // Every staged file: block API keys, tokens, private keys and passwords before they reach git history.
  "*": "secretlint",
  "*.{ts,tsx,js,jsx,mjs}": [
    "eslint --fix --max-warnings=0 --no-warn-ignored",
    "prettier --write",
  ],
  "*.{json,css,yml,yaml}": "prettier --write",
  // Any messages file changed → re-check key parity across all locales (ignores the file list).
  "messages/*.json": () => "vitest run lib/i18n/messages.test.ts",
  // Token change → re-check contrast pairs.
  "styles/tokens.css": () => "vitest run styles/contrast.test.ts",
  // A components/ui file changed → every primitive must still have a story.
  "components/ui/**/*.tsx": () => "vitest run tests/unit/stories.test.ts",
};

export default config;
