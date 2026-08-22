// Regenerates the FAQPage JSON-LD block in index.html from the single
// source of truth at src/faqData.js, so the structured data can never
// drift out of sync with what's actually rendered on the page. Run
// automatically as a "prebuild" step (see package.json) and can also be
// run manually with `node scripts/generate-faq-schema.js`.

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const indexPath = path.join(root, "index.html");
const faqDataPath = path.join(root, "src", "faqData.js");

// faqData.js is a plain ES module (`export const FAQS = [...]`), so pull
// the array out via dynamic import rather than re-parsing it by hand.
const { FAQS } = await import(`file://${faqDataPath}`);

const schema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQS.map(({ q, a }) => ({
    "@type": "Question",
    name: q,
    acceptedAnswer: {
      "@type": "Answer",
      text: a,
    },
  })),
};

const html = readFileSync(indexPath, "utf8");
const openTag = '<script type="application/ld+json" id="faq-schema">';
const openIdx = html.indexOf(openTag);
if (openIdx === -1) {
  console.error("Could not find faq-schema block in index.html — check the id attribute wasn't removed.");
  process.exit(1);
}
const contentStart = openIdx + openTag.length;
const closeIdx = html.indexOf("</script>", contentStart);
if (closeIdx === -1) {
  console.error("Found faq-schema opening tag but no matching </script> — index.html may be malformed.");
  process.exit(1);
}

const indentedJson = JSON.stringify(schema, null, 2).split("\n").join("\n    ");
const updated =
  html.slice(0, contentStart) +
  `\n    ${indentedJson}\n    ` +
  html.slice(closeIdx);

writeFileSync(indexPath, updated);
console.log(`FAQPage schema regenerated with ${FAQS.length} questions.`);