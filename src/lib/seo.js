import { useEffect } from "react";

const SITE = "https://www.strikejournal.com";
const DEFAULT_TITLE = "Strike Journal — Trading Journal & Funding Challenge Tracker";
const DEFAULT_DESCRIPTION =
  "Strike Journal is a trading journal and prop firm funding challenge tracker — log trades, monitor evaluation rules in real time, and see the analytics that explain your edge.";

function setMeta(name, content, attr = "name") {
  let tag = document.querySelector(`meta[${attr}="${name}"]`);
  if (!tag) {
    tag = document.createElement("meta");
    tag.setAttribute(attr, name);
    document.head.appendChild(tag);
  }
  tag.setAttribute("content", content);
}

function setCanonical(href) {
  let link = document.querySelector('link[rel="canonical"]');
  if (!link) {
    link = document.createElement("link");
    link.setAttribute("rel", "canonical");
    document.head.appendChild(link);
  }
  link.setAttribute("href", href);
}

// Sets document.title, the meta description, canonical link, and the
// Open Graph / Twitter title+description for the current route.
//
// Why this exists: Strike Journal is a client-rendered SPA with a single
// index.html, so without this every route (blog posts, pricing, changelog,
// legal pages) would serve the exact same title/description as the
// homepage — which flattens keyword targeting for anything but "/".
// Google does execute JS and picks up tags set this way on re-crawl.
//
// path should be the route's pathname, e.g. "/blog/my-post-slug".
// Falls back to the site-wide defaults when unmounted/navigated away.
export function usePageMeta({ title, description, path = "" }) {
  useEffect(() => {
    const fullTitle = !title ? DEFAULT_TITLE : title.includes("Strike Journal") ? title : `${title} — Strike Journal`;
    const desc = description || DEFAULT_DESCRIPTION;
    const url = `${SITE}${path}`;

    document.title = fullTitle;
    setMeta("description", desc);
    setCanonical(url);

    setMeta("og:title", fullTitle, "property");
    setMeta("og:description", desc, "property");
    setMeta("og:url", url, "property");
    setMeta("twitter:title", fullTitle);
    setMeta("twitter:description", desc);
    setMeta("twitter:url", url);

    return () => {
      // Reset to site defaults when this page unmounts so a subsequent
      // page that doesn't call this hook (or hasn't mounted its own
      // meta yet) doesn't inherit stale tags from wherever the user was.
      document.title = DEFAULT_TITLE;
      setMeta("description", DEFAULT_DESCRIPTION);
      setCanonical(`${SITE}/`);
      setMeta("og:title", DEFAULT_TITLE, "property");
      setMeta("og:description", DEFAULT_DESCRIPTION, "property");
      setMeta("og:url", `${SITE}/`, "property");
      setMeta("twitter:title", DEFAULT_TITLE);
      setMeta("twitter:description", DEFAULT_DESCRIPTION);
      setMeta("twitter:url", `${SITE}/`);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, description, path]);
}
