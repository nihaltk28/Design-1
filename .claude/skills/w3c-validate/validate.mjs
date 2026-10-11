// W3C markup check for the w3c-validate skill: validates the server-rendered HTML of each URL with
// html-validate and the project's .htmlvalidate.json (the same rules as tests/e2e/markup.spec.ts).
// Runs locally — page HTML is never sent to an outside service.
//
//   node .claude/skills/w3c-validate/validate.mjs http://localhost:3300/en http://localhost:3300/ar/news
//
// Prints JSON: errors per URL, grouped by rule, each with line:column, the element selector and message.
import { FileSystemConfigLoader, HtmlValidate } from "html-validate/node";

const urls = process.argv.slice(2);
if (urls.length === 0) {
  console.error("Usage: node .claude/skills/w3c-validate/validate.mjs <url> [<url> …]");
  process.exit(2);
}

const htmlvalidate = new HtmlValidate(new FileSystemConfigLoader());
const results = [];

for (const url of urls) {
  const response = await fetch(url, { redirect: "manual" });
  if (response.status !== 200) {
    results.push({ url, status: response.status, error: "not 200 — check the URL / server" });
    continue;
  }
  const html = await response.text();
  const report = await htmlvalidate.validateString(html, url);
  const messages = report.results.flatMap((r) => r.messages);
  const byRule = {};
  for (const m of messages) {
    (byRule[m.ruleId] ??= { count: 0, ruleUrl: m.ruleUrl, samples: [] }).count += 1;
    if (byRule[m.ruleId].samples.length < 5) {
      byRule[m.ruleId].samples.push({ at: `${m.line}:${m.column}`, selector: m.selector, message: m.message });
    }
  }
  results.push({ url, status: 200, valid: messages.length === 0, errorCount: messages.length, byRule });
}

console.log(JSON.stringify({ allValid: results.every((r) => r.valid), results }, null, 2));
