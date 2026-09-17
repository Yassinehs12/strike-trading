import { describe, it, expect } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { PrivacyPolicy, TermsOfService } from "./LegalPages.jsx";

describe("legal pages", () => {
  const p = renderToStaticMarkup(<PrivacyPolicy />);
  const t = renderToStaticMarkup(<TermsOfService />);

  it("renders headings and hero copy", () => {
    expect(p).toContain("Privacy Policy");
    expect(p).toContain("How Strike Journal collects, uses, and protects your information.");
    expect(t).toContain("The terms that govern your use of Strike Journal.");
  });

  it("has an anchor target for every TOC link", () => {
    for (const html of [p, t]) {
      const hrefs = [...html.matchAll(/href="#([a-z-]+)"/g)].map((m) => m[1]);
      const ids = new Set([...html.matchAll(/id="([a-z-]+)"/g)].map((m) => m[1]));
      const missing = hrefs.filter((h) => !ids.has(h));
      expect(missing).toEqual([]);
      expect(hrefs.length).toBeGreaterThan(20);
    }
  });

  it("links privacy, terms, contact and home", () => {
    for (const html of [p, t]) {
      expect(html).toContain('href="/privacy"');
      expect(html).toContain('href="/terms"');
      expect(html).toContain('href="/"');
      expect(html).toContain("mailto:support@strikejournal.com");
    }
  });

  it("does not contradict itself about AI processing", () => {
    expect(p).toContain("does not involve a third-party AI");
    expect(t).not.toMatch(/never send|guarantee(s)? (profit|future)/i);
  });

  it("avoids absolute security claims", () => {
    for (const html of [p, t]) {
      expect(html).not.toMatch(/(is|are|100%) (completely |totally )?secure\b(?! )|guaranteed secure|fully compliant|GDPR certified|ISO ?27001/i);
    }
    expect(p).toMatch(/reasonable technical and organisational measures/i);
  });
});
