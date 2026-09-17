import React, { useEffect, useState } from "react";
import { ArrowLeft, ChevronDown } from "lucide-react";
import { LogoFull } from "./Logo";
import ThemeToggle from "./ThemeToggle.jsx";
import { usePageMeta } from "./lib/seo";

/* ============================================================
   SHARED LEGAL PAGE FURNITURE

   Layout: compact hero, then a two-column grid on desktop
   (sticky numbered TOC + a ~760px reading column) that collapses
   to a single column with an expandable TOC on mobile. Colors,
   fonts and borders all come from the existing theme variables in
   index.css, so these pages inherit light/dark automatically and
   stay visually part of the product rather than a bolted-on
   template.
   ============================================================ */

const SUB_NAV = [
  { label: "Home", href: "/" },
  { label: "Privacy Policy", href: "/privacy" },
  { label: "Terms of Service", href: "/terms" },
  { label: "Pricing", href: "/pricing" },
  { label: "Changelog", href: "/changelog" },
];

const pad = (n) => String(n).padStart(2, "0");

/* Highlights the TOC entry for whichever section is currently in
   view. Uses IntersectionObserver against a band near the top of
   the viewport so the active item changes as a heading reaches the
   reading position, not when it leaves the screen entirely. */
function useActiveSection(ids) {
  const [active, setActive] = useState(ids[0]);
  const key = ids.join("|");
  useEffect(() => {
    const nodes = ids.map((id) => document.getElementById(id)).filter(Boolean);
    if (!nodes.length || typeof IntersectionObserver === "undefined") return;
    const visible = new Map();
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => visible.set(e.target.id, e.isIntersecting));
        const firstVisible = ids.find((id) => visible.get(id));
        if (firstVisible) setActive(firstVisible);
      },
      { rootMargin: "-88px 0px -65% 0px", threshold: 0 }
    );
    nodes.forEach((n) => observer.observe(n));
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return active;
}

const TocLink = ({ section, index, active, onNavigate }) => (
  <a
    href={`#${section.id}`}
    onClick={onNavigate}
    aria-current={active ? "true" : undefined}
    className={`group flex gap-2.5 py-1.5 text-[13px] leading-snug rounded-md transition-colors
      focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]
      ${active
        ? "text-[var(--text-primary)] font-semibold"
        : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"}`}
  >
    <span className={`tabular-nums text-[11px] pt-px shrink-0 ${active ? "text-[var(--accent)]" : "text-[var(--text-faint)]"}`}>
      {pad(index + 1)}
    </span>
    <span>{section.title}</span>
  </a>
);

const LegalShell = ({ title, subtitle, updated, path, sections, children }) => {
  usePageMeta({ title, description: subtitle, path });
  const active = useActiveSection(sections.map((s) => s.id));
  const [mobileTocOpen, setMobileTocOpen] = useState(false);

  return (
    <div className="lp-root min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        .lp-root { font-family: 'Inter', ui-sans-serif, system-ui, sans-serif; }
        .legal-body { font-size: 14.5px; line-height: 1.75; }
        .legal-body p + p { margin-top: 0.85rem; }
      `}</style>

      <a
        href="#legal-content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-[60] focus:top-3 focus:left-3 focus:px-3 focus:py-2 focus:rounded-lg focus:bg-[var(--bg-tertiary)] focus:text-[var(--text-primary)] focus:text-sm focus:font-semibold"
      >
        Skip to content
      </a>

      {/* ---------- header, matching the landing page's nav ---------- */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-[var(--bg-primary)]/85 border-b border-[var(--border-primary)]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <a
            href="/"
            aria-label="Strike Journal home"
            className="flex items-center gap-2 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
          >
            <LogoFull size={26} textClass="text-sm" />
          </a>
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <a
              href="/"
              className="hidden sm:flex items-center gap-1.5 text-sm font-medium text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
            >
              <ArrowLeft size={14} aria-hidden="true" /> Back to site
            </a>
          </div>
        </div>
      </header>

      {/* ---------- compact hero ---------- */}
      <div className="border-b border-[var(--border-primary)] bg-[var(--bg-secondary)]/40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 md:py-12">
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--text-muted)] mb-3">Legal</p>
          <h1 className="text-[26px] md:text-4xl font-extrabold tracking-tight mb-2.5">{title}</h1>
          <p className="text-sm md:text-[15px] text-[var(--text-tertiary)] max-w-2xl leading-relaxed">{subtitle}</p>
          <p className="text-xs text-[var(--text-faint)] mt-5">Last updated: {updated}</p>

          <nav aria-label="Legal pages" className="flex flex-wrap items-center gap-x-5 gap-y-2 mt-6">
            {SUB_NAV.map((l) => {
              const current = typeof window !== "undefined" ? window.location.pathname.replace(/\/+$/, "") : "";
              const isActive = current === l.href.replace(/\/+$/, "");
              return (
                <a
                  key={l.href}
                  href={l.href}
                  aria-current={isActive ? "page" : undefined}
                  className={`text-xs font-semibold uppercase tracking-wide transition-colors rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] ${
                    isActive ? "text-[var(--accent)]" : "text-[var(--text-faint)] hover:text-[var(--text-primary)]"
                  }`}
                >
                  {l.label}
                </a>
              );
            })}
          </nav>
        </div>
      </div>

      {/* ---------- TOC + content ---------- */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 md:py-12 lg:grid lg:grid-cols-[224px_minmax(0,1fr)] lg:gap-12">
        {/* Mobile: collapsible TOC */}
        <div className="lg:hidden mb-8">
          <button
            type="button"
            onClick={() => setMobileTocOpen((o) => !o)}
            aria-expanded={mobileTocOpen}
            aria-controls="legal-toc-mobile"
            className="w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl border text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
            style={{ backgroundColor: "var(--card-bg)", borderColor: "var(--card-border)" }}
          >
            <span>Contents</span>
            <ChevronDown size={16} aria-hidden="true" className={`transition-transform ${mobileTocOpen ? "rotate-180" : ""}`} />
          </button>
          {mobileTocOpen && (
            <nav
              id="legal-toc-mobile"
              aria-label="Table of contents"
              className="mt-2 px-4 py-3 rounded-xl border flex flex-col"
              style={{ backgroundColor: "var(--card-bg)", borderColor: "var(--card-border)" }}
            >
              {sections.map((s, i) => (
                <TocLink key={s.id} section={s} index={i} active={active === s.id} onNavigate={() => setMobileTocOpen(false)} />
              ))}
            </nav>
          )}
        </div>

        {/* Desktop: sticky TOC */}
        <nav aria-label="Table of contents" className="hidden lg:block">
          <div className="sticky top-24 max-h-[calc(100vh-8rem)] overflow-y-auto pr-2">
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--text-muted)] mb-3">Contents</p>
            <div className="flex flex-col border-l border-[var(--border-primary)] pl-3">
              {sections.map((s, i) => (
                <TocLink key={s.id} section={s} index={i} active={active === s.id} />
              ))}
            </div>
          </div>
        </nav>

        <main id="legal-content" className="min-w-0 max-w-[760px]">
          <div className="legal-body text-[var(--text-tertiary)]">{children}</div>

          <div className="mt-14 pt-8 border-t border-[var(--border-primary)] flex flex-wrap gap-x-6 gap-y-2 text-sm">
            <a href="/privacy" className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors">Privacy Policy</a>
            <a href="/terms" className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors">Terms of Service</a>
            <a href="mailto:support@strikejournal.com" className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors">Contact</a>
            <a href="/" className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors">Home</a>
          </div>
        </main>
      </div>

      <footer className="border-t border-[var(--border-primary)] py-8 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-[var(--text-faint)]">© {new Date().getFullYear()} Strike Journal. All rights reserved.</p>
          <nav aria-label="Footer" className="flex items-center gap-5 text-xs">
            <a href="/privacy" className="text-[var(--text-faint)] hover:text-[var(--text-primary)] transition-colors">Privacy Policy</a>
            <a href="/terms" className="text-[var(--text-faint)] hover:text-[var(--text-primary)] transition-colors">Terms of Service</a>
            <a href="mailto:support@strikejournal.com" className="text-[var(--text-faint)] hover:text-[var(--text-primary)] transition-colors">Contact</a>
          </nav>
        </div>
      </footer>
    </div>
  );
};

/* ---------- content primitives ---------- */

const Section = ({ id, index, title, children }) => (
  <section id={id} className="scroll-mt-24 mb-11">
    <h2 className="flex items-baseline gap-2.5 text-[17px] md:text-[19px] font-bold text-[var(--text-primary)] tracking-tight mb-3">
      <span className="text-[12px] tabular-nums font-bold text-[var(--accent)]">{pad(index + 1)}</span>
      {title}
    </h2>
    <div>{children}</div>
  </section>
);

const H3 = ({ children }) => (
  <h3 className="text-[14px] font-semibold text-[var(--text-secondary)] mt-6 mb-2">{children}</h3>
);

const UL = ({ children }) => (
  <ul className="list-disc pl-5 space-y-1.5 my-3 marker:text-[var(--text-faint)]">{children}</ul>
);

const Strong = ({ children }) => <strong className="font-semibold text-[var(--text-secondary)]">{children}</strong>;

/* A value the owner still has to supply. Rendered visibly so it
   can't quietly ship as finished copy. */
const Fill = ({ children }) => (
  <span className="inline-block font-semibold text-[var(--text-primary)] bg-[var(--accent-soft)] border border-[var(--accent)]/25 rounded px-1.5 py-0.5 text-[13px]">
    {children}
  </span>
);

const Callout = ({ label, children }) => (
  <aside
    className="my-6 rounded-xl border-l-2 border-l-[var(--accent)] border-y border-r px-4 sm:px-5 py-4"
    style={{
      backgroundColor: "var(--card-bg)",
      borderTopColor: "var(--card-border)",
      borderRightColor: "var(--card-border)",
      borderBottomColor: "var(--card-border)",
    }}
  >
    <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--text-muted)] mb-2">{label}</p>
    <div className="text-[14px] leading-relaxed text-[var(--text-secondary)]">{children}</div>
  </aside>
);

const Table = ({ head, rows }) => (
  <div className="my-5 overflow-x-auto">
    <table className="w-full min-w-[440px] text-[13.5px] border rounded-xl overflow-hidden" style={{ borderColor: "var(--card-border)" }}>
      <thead>
        <tr style={{ backgroundColor: "var(--card-bg)" }}>
          {head.map((h) => (
            <th
              key={h}
              scope="col"
              className="text-left font-semibold text-[var(--text-secondary)] px-4 py-2.5 border-b"
              style={{ borderColor: "var(--card-border)" }}
            >
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i} className={i !== rows.length - 1 ? "border-b" : ""} style={{ borderColor: "var(--card-border)" }}>
            {r.map((cell, j) => (
              <td key={j} className={`px-4 py-2.5 align-top ${j === 0 ? "text-[var(--text-secondary)] font-medium" : ""}`}>
                {cell}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const UPDATED = "[LAST UPDATED DATE]";

/* ============================================================
   PRIVACY POLICY

   Every factual statement below was checked against the codebase:
   Supabase auth/database/storage/realtime, the trade and journal
   schemas, the community tables, the broker-connection functions,
   the market-data Edge Functions, the embedded chart widget, and
   the settings-page deletion flow. Anything not verifiable from
   the code is left as a visible placeholder.
   ============================================================ */

const PRIVACY_SECTIONS = [
  { id: "introduction", title: "Introduction" },
  { id: "information-you-provide", title: "Information you provide" },
  { id: "trading-data", title: "Trading & journal data" },
  { id: "community-data", title: "Community & messaging content" },
  { id: "broker-data", title: "Connected brokerage data" },
  { id: "automatic-data", title: "Automatically collected information" },
  { id: "cookies", title: "Cookies & local storage" },
  { id: "how-we-use", title: "How we use your information" },
  { id: "visibility", title: "What is private, what is visible" },
  { id: "how-we-share", title: "How we share information" },
  { id: "third-parties", title: "Third-party services" },
  { id: "ai", title: "Automated analysis & AI features" },
  { id: "security", title: "Data storage & security" },
  { id: "retention", title: "Data retention" },
  { id: "your-rights", title: "Your privacy rights" },
  { id: "deletion", title: "Account & data deletion" },
  { id: "children", title: "Children's privacy" },
  { id: "transfers", title: "International data transfers" },
  { id: "changes", title: "Changes to this policy" },
  { id: "contact", title: "Contact us" },
];

export const PrivacyPolicy = () => (
  <LegalShell
    title="Privacy Policy"
    subtitle="How Strike Journal collects, uses, and protects your information."
    updated={UPDATED}
    path="/privacy"
    sections={PRIVACY_SECTIONS}
  >
    <Section id="introduction" index={0} title="Introduction">
      <p>
        Strike Journal is a trading journal, analytics, and funding challenge tracking platform. This
        policy explains what information the service collects, why it is collected, who it is shared
        with, and the choices available to you.
      </p>
      <p>
        In this policy, "Strike Journal", "we", and "us" refer to <Fill>[COMPANY LEGAL NAME]</Fill> of{" "}
        <Fill>[LEGAL ADDRESS]</Fill>. "You" refers to anyone who visits the site or holds an account.
        This policy covers the Strike Journal web application and the pages published at
        strikejournal.com. It does not cover brokers, prop firms, or other third-party sites you may
        reach from the service.
      </p>
    </Section>

    <Section id="information-you-provide" index={1} title="Information you provide">
      <p>Creating an account asks for a small, fixed set of details:</p>
      <UL>
        <li><Strong>Email address</Strong> — your login identifier, also used for account emails such as password resets.</li>
        <li><Strong>Password</Strong> — handled by our authentication provider. We do not receive, see, or store your password in readable form.</li>
        <li><Strong>Username</Strong> — your display name across the community areas of the service.</li>
        <li><Strong>Age</Strong> — collected at sign-up to confirm you meet the minimum age requirement.</li>
      </UL>
      <p>You may also choose to provide:</p>
      <UL>
        <li>A profile avatar image and other profile details.</li>
        <li>A referral or invite code, which links your account to the member who referred you.</li>
        <li>Preferences such as display currency, timezone, default risk percentage, and theme.</li>
        <li>Messages you send us through the in-app support chat.</li>
      </UL>
    </Section>

    <Section id="trading-data" index={2} title="Trading & journal data">
      <p>
        Trading data is the core of the product, so it is worth being precise. Three different kinds of
        information are involved, and they work differently.
      </p>

      <H3>Information you enter</H3>
      <p>When you log a trade or write in the journal, the service stores what you submit, which may include:</p>
      <UL>
        <li>Trade details — date, asset, direction, entry and exit prices, position size, fees, profit or loss, and holding time.</li>
        <li>Setup and strategy information, including setup names, grades, and trading session.</li>
        <li>Risk information — the amount risked, your risk settings, and pre-trade checklist responses.</li>
        <li>Behavioural notes — the emotion tag attached to a trade and any free-text notes you write.</li>
        <li>Chart screenshots you attach to a trade, stored as part of that trade record.</li>
        <li>Journal entries, notebook notes, market plans, goals, and saved trading setups.</li>
        <li>Funding challenge configurations — the prop firm rules you enter, account size, targets, drawdown limits, profit split, and payouts you record.</li>
        <li>Trading account records you create to organise your trades.</li>
      </UL>

      <H3>Information the service generates from it</H3>
      <p>
        Strike Journal calculates statistics and observations from what you enter — win rate,
        expectancy, drawdown, performance by asset, day and session, psychology summaries, challenge
        compliance estimates, badges, and report cards. These are derived outputs computed from your
        own records. Some are calculated in your browser at the moment you view them; others, such as
        challenge state and badges, are stored alongside your account.
      </p>

      <H3>Information collected automatically</H3>
      <p>
        Separately from anything you type, some technical information is processed simply by using a
        web application. That is described in the "Automatically collected information" section below.
      </p>

      <Callout label="Ownership">
        The trades, notes, screenshots, and journal entries you submit remain yours. Strike Journal
        stores and processes them to operate the service for you. We do not claim ownership of your
        trading records, and we do not sell them.
      </Callout>
    </Section>

    <Section id="community-data" index={3} title="Community & messaging content">
      <p>The service includes community features. If you use them, we store:</p>
      <UL>
        <li>Forum posts and replies, including images you attach to a post.</li>
        <li>Live chat messages.</li>
        <li>Direct messages and any files attached to them, along with read status.</li>
        <li>Emoji reactions, friend requests and friendships, and blocks you create.</li>
        <li>Reports you submit about other users or content, including the reason you give.</li>
        <li>Trade spotlight submissions, if you submit a trade to be featured.</li>
        <li>Notifications generated for you by activity in the service.</li>
        <li>Online presence — while the app is open, your account is broadcast as "online" so features such as the friends list can show availability. Presence is transient and is not kept as a history.</li>
      </UL>
      <p>
        Administrative actions taken inside the service, such as moderation decisions and role changes,
        are recorded in an internal audit log for accountability.
      </p>
    </Section>

    <Section id="broker-data" index={4} title="Connected brokerage data">
      <p>
        Strike Journal includes optional broker sync functionality. It is used only if you actively
        connect an account, and what is involved depends on the connection type:
      </p>
      <UL>
        <li>
          <Strong>Brokerage connections</Strong> — you authorise the connection on a portal hosted by
          our brokerage connectivity provider, where you sign in to your brokerage directly. Strike
          Journal does not receive your brokerage login credentials. A connection identifier and a
          credential issued by that provider are stored server-side so future syncs can run; they are
          not reachable from your browser or by other users.
        </li>
        <li>
          <Strong>MT4/MT5 connections</Strong> — you supply a server name, login, and investor
          password. As implemented, the investor password is used once to provision the connection
          with our platform provider and is not written to our database; only the resulting reference
          identifier is stored.
        </li>
        <li>
          <Strong>Synced activity</Strong> — where sync is enabled, trade activity retrieved from the
          connected account (such as symbol, quantity, price, and timestamps) is written into your
          journal as trades, the same as if you had entered them yourself.
        </li>
      </UL>
      <Callout label="Requires owner input">
        <Fill>[REQUIRES LEGAL/OWNER INPUT]</Fill> — broker sync exists in the codebase but is
        configured per deployment. Confirm which providers are live in production and name them
        explicitly here before publishing.
      </Callout>
    </Section>

    <Section id="automatic-data" index={5} title="Automatically collected information">
      <p>
        Running a web application involves some information being processed automatically, even where we
        do not deliberately collect it:
      </p>
      <UL>
        <li>
          <Strong>Technical request data</Strong> — our hosting provider and backend provider process
          standard connection information such as IP address, browser user agent, and the requested
          URL in order to serve the site and protect it from abuse.
        </li>
        <li><Strong>Timestamps</Strong> — records you create carry creation and update times.</li>
        <li>
          <Strong>Embedded content</Strong> — the market heatmap page loads a widget from a third-party
          charting provider, and the site loads a web font from a third-party font service. Loading
          these resources reveals your IP address to those providers.
        </li>
      </UL>
      <p>
        The application code does not include a third-party product analytics or advertising tracker.
        If usage analytics are enabled at the hosting level for the production deployment, that should
        be stated here: <Fill>[REQUIRES LEGAL/OWNER INPUT — hosting analytics]</Fill>.
      </p>
    </Section>

    <Section id="cookies" index={6} title="Cookies & local storage">
      <p>
        Strike Journal does not set advertising or cross-site tracking cookies. It does use your
        browser's local and session storage, which serves a similar purpose to a cookie, for the
        following:
      </p>
      <Table
        head={["What is stored", "Purpose", "Where"]}
        rows={[
          ["Session token", "Keeps you signed in between page loads", "Local storage, or session storage if you do not choose \u201ckeep me signed in\u201d"],
          ["Keep-signed-in preference", "Remembers which of those two stores your session should use", "Local storage"],
          ["Theme preference", "Remembers light or dark mode", "Local storage"],
          ["Economic calendar filters", "Remembers your currency, impact, and past-event filters", "Local storage"],
          ["Weekly recap dismissal", "Stops a recap you dismissed from reappearing", "Local storage"],
          ["Pending profile details", "Short-lived fallback used during sign-up if profile creation needs retrying", "Local storage"],
        ]}
      />
      <p>
        Clearing your browser storage removes these and signs you out. Third-party resources embedded in
        the site — the market heatmap widget and the web font service — may set their own storage under
        their own policies, which we do not control.
      </p>
    </Section>

    <Section id="how-we-use" index={7} title="How we use your information">
      <UL>
        <li>To operate the journal, challenge tracker, analytics, goals, notebook, and planning tools.</li>
        <li>To authenticate you, keep you signed in, and secure your account.</li>
        <li>To run community features, including the forum, chat, direct messages, friends, and notifications.</li>
        <li>To calculate the statistics, insights, and report cards the product exists to provide.</li>
        <li>To respond to support requests you send us.</li>
        <li>To moderate content, investigate reports, and enforce our Terms of Service.</li>
        <li>To diagnose faults, maintain the service, and improve how it works.</li>
        <li>To meet legal obligations that apply to us.</li>
      </UL>
      <p>
        We do not sell your personal information. We do not use your trade data to trade on your behalf,
        and we do not send your journal contents to prop firms.
      </p>
    </Section>

    <Section id="visibility" index={8} title="What is private, what is visible">
      <p>Not everything in the service has the same visibility, so it is worth separating clearly:</p>
      <Table
        head={["Content", "Who can see it"]}
        rows={[
          ["Trades, P&L, journal entries, notes, plans, goals, screenshots, challenges", "You only"],
          ["Support conversations", "You and Strike Journal administrators"],
          ["Username, avatar, profile details", "Other members"],
          ["Forum posts and replies, chat messages, reactions", "Other members"],
          ["Direct messages and attachments", "You and the recipient"],
          ["Leaderboard placement", "Other members — only if you opt in; off by default"],
          ["Public Report Card at /u/your-username", "Anyone with the link, controlled by your public stats setting"],
          ["Trade spotlight submissions", "Administrators for review; the community if approved and featured"],
        ]}
      />
      <p>
        Access rules are enforced at the database level, so other users cannot read your private records
        through the API, not just through what the interface chooses to display.
      </p>
    </Section>

    <Section id="how-we-share" index={9} title="How we share information">
      <p>We share information in a limited set of circumstances:</p>
      <UL>
        <li><Strong>With other users</Strong> — only the content you publish or send, as set out in the table above.</li>
        <li><Strong>With service providers</Strong> — the infrastructure and connectivity providers listed below, which process data on our behalf to run the service.</li>
        <li><Strong>Where you direct it</Strong> — for example by connecting a brokerage, opting into the leaderboard, or enabling your public report card.</li>
        <li><Strong>For legal reasons</Strong> — where required by law, or where necessary to investigate abuse, fraud, or threats to safety.</li>
        <li><Strong>In a business transfer</Strong> — if the service is acquired or transferred, information may move with it, subject to this policy.</li>
      </UL>
    </Section>

    <Section id="third-parties" index={10} title="Third-party services">
      <p>
        The following external services are used by the application. Each operates under its own terms
        and privacy policy, which we do not control and do not restate here.
      </p>
      <Table
        head={["Provider", "Role", "What it involves"]}
        rows={[
          ["Supabase", "Authentication, database, file storage, realtime", "Stores your account, journal and community records, and uploaded images; sends account emails such as password resets"],
          [<Fill key="host">[HOSTING PROVIDER]</Fill>, "Hosting and delivery", "Serves the application and processes standard request data. The repository is configured for Vercel — confirm the live host"],
          ["Brokerage connectivity provider", "Optional broker sync", "Hosts the connection portal and returns account activity where you connect a brokerage"],
          ["MetaTrader platform provider", "Optional MT4/MT5 sync", "Provisions the connection from the details you supply"],
          ["TradingView", "Embedded market heatmaps", "Widget loaded in your browser on the heatmaps page"],
          ["Google Fonts", "Web font delivery", "Font file loaded in your browser"],
        ]}
      />
      <p>
        The service also retrieves market and macroeconomic data — an economic calendar feed, central
        bank and reference-rate data, exchange rates, positioning reports, and retail sentiment. Those
        requests are made from our servers using our own credentials, and your personal information is
        not sent to those data sources.
      </p>
    </Section>

    <Section id="ai" index={11} title="Automated analysis & AI features">
      <p>
        Strike Journal generates written observations about your trading — for example noting that a
        particular session or setup performs differently from your baseline, or summarising patterns in
        your emotion tags.
      </p>
      <p>
        As the application is currently built, this analysis is produced by fixed rules and statistical
        calculations applied to your own data, largely in your browser. It does not involve a
        third-party AI or large language model provider, and your trades, notes, or screenshots are not
        sent to an AI provider for processing.
      </p>
      <Callout label="If this changes">
        If an AI-powered feature such as AI Trade Review is added later, this section must be updated
        before launch to name the provider, state what information is sent, why, whether outputs are
        stored, and what the provider's terms permit. Do not describe AI processing here until it
        actually exists: <Fill>[REQUIRES LEGAL/OWNER INPUT]</Fill>.
      </Callout>
    </Section>

    <Section id="security" index={12} title="Data storage & security">
      <p>
        We implement reasonable technical and organisational measures designed to protect your
        information. In this application, those measures include:
      </p>
      <UL>
        <li>Row-level security policies in the database, so records are readable only by the account they belong to, or by the parties a shared feature intends.</li>
        <li>Password handling by our authentication provider; passwords are never stored by us in readable form.</li>
        <li>Privileged credentials held server-side only and never exposed to the browser, including the credential used for brokerage connectivity.</li>
        <li>Server-side functions that act using your own session rather than elevated permissions when reading your data.</li>
        <li>Transport encryption (HTTPS) for traffic to the application, and restricted origins for server functions.</li>
        <li>An internal audit log of administrative actions.</li>
      </UL>
      <p>
        No online service can be completely secure. These measures reduce risk but cannot eliminate it,
        and we do not claim that your information is guaranteed against unauthorised access. Use a
        strong, unique password and keep your credentials to yourself.
      </p>
    </Section>

    <Section id="retention" index={13} title="Data retention">
      <p>
        We keep your information for as long as your account exists, because the product's value depends
        on a continuous history of your trading. You can delete individual trades, journal entries,
        notes, posts, and other records at any time from within the app.
      </p>
      <p>
        When an account is deleted, records linked to that account are removed with it under the
        database's deletion rules. Some content may persist where it exists in another person's context —
        a direct message already delivered to its recipient, for example, or a moderation record kept
        for safety purposes. Backups and provider-level logs may retain data for a period after deletion
        under our providers' own schedules.
      </p>
      <p>
        Defined retention periods for backups, support conversations, and moderation records are not set
        in the application itself: <Fill>[DATA RETENTION PERIODS — REQUIRES OWNER INPUT]</Fill>.
      </p>
    </Section>

    <Section id="your-rights" index={14} title="Your privacy rights">
      <p>
        Depending on your location and applicable law, you may have some or all of the following rights
        over your personal information:
      </p>
      <UL>
        <li>Access — to obtain a copy of the information we hold about you.</li>
        <li>Correction — to have inaccurate information corrected.</li>
        <li>Deletion — to have your information erased, subject to any legal obligation we have to retain it.</li>
        <li>Portability — to receive certain information in a portable format.</li>
        <li>Restriction or objection — to limit or object to certain processing, where applicable law provides for it.</li>
        <li>Withdrawal of consent — where processing relies on consent, to withdraw it at any time, without affecting processing that already took place.</li>
      </UL>
      <p>
        Not every right applies to every user in every jurisdiction. Several you can exercise directly:
        you can edit your profile and preferences, edit or delete your own records, control your
        leaderboard and public report card settings, and disconnect any connected brokerage. For anything
        else, contact us using the details below. We may need to verify your identity before acting on a
        request.
      </p>
    </Section>

    <Section id="deletion" index={15} title="Account & data deletion">
      <p>
        You can delete individual records at any time from within the app. To delete your entire account,
        use the deletion request option under Settings → Danger zone, which sends a request to our support
        address, or email us directly.
      </p>
      <p>
        Account deletion is currently handled as a request rather than an instant, automated action, so
        there is a processing delay between your request and the removal of your data. As described above,
        some residual copies may remain in backups or in other users' message histories for a period
        afterwards. A target timeframe for completing deletion requests has not been set in the
        application: <Fill>[DELETION TIMEFRAME — REQUIRES OWNER INPUT]</Fill>.
      </p>
    </Section>

    <Section id="children" index={16} title="Children's privacy">
      <p>
        Strike Journal is intended for adults. Account creation requires you to confirm that you are at
        least 18 years old, and the service is not directed to children. We do not knowingly collect
        personal information from anyone under 18. If you believe a minor has created an account, contact
        us and we will take steps to remove it.
      </p>
    </Section>

    <Section id="transfers" index={17} title="International data transfers">
      <p>
        Strike Journal relies on cloud infrastructure and may process or store information in countries
        other than the one you live in, including countries whose data protection laws differ from your
        own. Where that happens, we rely on our providers' contractual and technical arrangements for
        such transfers.
      </p>
      <p>
        The hosting regions for the production database and storage are a deployment setting rather than
        something visible in the application code:{" "}
        <Fill>[HOSTING REGION / TRANSFER MECHANISM — REQUIRES LEGAL/OWNER INPUT]</Fill>.
      </p>
    </Section>

    <Section id="changes" index={18} title="Changes to this policy">
      <p>
        We may update this policy as the product changes — for example if payments go live, or if an
        AI-powered feature is introduced. When we make material changes we will update the "last updated"
        date at the top of this page and, where appropriate, notify you in the app. Continuing to use the
        service after an update takes effect means the updated policy applies to you.
      </p>
    </Section>

    <Section id="contact" index={19} title="Contact us">
      <p>
        For questions about this policy, or to make a privacy request, contact us at{" "}
        <a
          href="mailto:support@strikejournal.com"
          className="text-[var(--accent)] hover:text-[var(--accent-hover)] font-medium underline underline-offset-2"
        >
          support@strikejournal.com
        </a>
        .
      </p>
      <p>
        Postal address: <Fill>[COMPANY LEGAL NAME]</Fill>, <Fill>[LEGAL ADDRESS]</Fill>.
      </p>
    </Section>
  </LegalShell>
);

/* ============================================================
   TERMS OF SERVICE
   ============================================================ */

const TERMS_SECTIONS = [
  { id: "acceptance", title: "Acceptance of these terms" },
  { id: "service", title: "What Strike Journal is" },
  { id: "eligibility", title: "Eligibility" },
  { id: "accounts", title: "Accounts & security" },
  { id: "responsibilities", title: "Your responsibilities" },
  { id: "your-content", title: "Your content & ownership" },
  { id: "community", title: "Community content & conduct" },
  { id: "disclaimer", title: "Trading & financial disclaimer" },
  { id: "no-advice", title: "No investment advice" },
  { id: "analytics", title: "Analytics & automated insights" },
  { id: "challenges", title: "Funding challenge tracking" },
  { id: "broker", title: "Connected brokerage accounts" },
  { id: "market-data", title: "Market data & third-party content" },
  { id: "payments", title: "Plans, subscriptions & payments" },
  { id: "ip", title: "Intellectual property" },
  { id: "prohibited", title: "Prohibited uses" },
  { id: "termination", title: "Suspension & termination" },
  { id: "availability", title: "Service availability & changes" },
  { id: "warranties", title: "Disclaimer of warranties" },
  { id: "liability", title: "Limitation of liability" },
  { id: "indemnity", title: "Indemnification" },
  { id: "changes", title: "Changes to these terms" },
  { id: "governing-law", title: "Governing law & disputes" },
  { id: "contact", title: "Contact information" },
];

export const TermsOfService = () => (
  <LegalShell
    title="Terms of Service"
    subtitle="The terms that govern your use of Strike Journal."
    updated={UPDATED}
    path="/terms"
    sections={TERMS_SECTIONS}
  >
    <Section id="acceptance" index={0} title="Acceptance of these terms">
      <p>
        These Terms of Service ("Terms") form an agreement between you and <Fill>[COMPANY LEGAL NAME]</Fill>{" "}
        ("Strike Journal", "we", "us") covering your use of the Strike Journal application and website
        (the "Service"). By creating an account or using the Service, you agree to these Terms. If you do
        not agree, please do not use the Service.
      </p>
      <p>
        Our{" "}
        <a href="/privacy" className="text-[var(--accent)] hover:text-[var(--accent-hover)] font-medium underline underline-offset-2">
          Privacy Policy
        </a>{" "}
        explains how we handle information and forms part of this agreement.
      </p>
    </Section>

    <Section id="service" index={1} title="What Strike Journal is">
      <p>
        Strike Journal is a self-service tool for recording and reviewing your own trading. It lets you
        log trades, attach notes and chart screenshots, write journal entries and market plans, set
        goals, track prop firm funding challenges against rules you enter, view statistics calculated
        from your records, and take part in a member community.
      </p>
      <Callout label="Trading disclaimer">
        Strike Journal is a journaling and analytics platform. It does not execute trades, does not manage
        money, does not guarantee trading results, and does not replace professional financial advice.
      </Callout>
    </Section>

    <Section id="eligibility" index={2} title="Eligibility">
      <p>
        You must be at least 18 years old to create an account. By registering, you confirm that you meet
        that requirement, that the information you provide is accurate, and that you are not barred from
        using the Service under any law that applies to you. You are responsible for complying with the
        laws of your own country regarding trading and the use of this kind of tool.
      </p>
    </Section>

    <Section id="accounts" index={3} title="Accounts & security">
      <p>
        You need an account to use most of the Service. Keep your password confidential and do not share
        your account. You are responsible for activity that occurs under it. If you believe someone else
        has gained access, change your password and contact us promptly.
      </p>
      <p>
        Choose a username that does not impersonate another person or organisation. We may reclaim
        usernames that are impersonating, misleading, or abusive.
      </p>
    </Section>

    <Section id="responsibilities" index={4} title="Your responsibilities">
      <p>You are responsible for:</p>
      <UL>
        <li>The accuracy of the trades, figures, and rules you enter. The Service calculates from what you give it, and incorrect inputs produce incorrect outputs.</li>
        <li>Keeping your own records where you need them for tax, regulatory, or prop firm purposes. The Service is not a system of record for those obligations.</li>
        <li>Having the right to upload anything you submit, including screenshots and images.</li>
        <li>Your own trading decisions and their outcomes.</li>
      </UL>
    </Section>

    <Section id="your-content" index={5} title="Your content & ownership">
      <p>
        You keep ownership of everything you submit — trades, journal entries, notes, plans, goals,
        screenshots, posts, and messages ("Your Content"). We do not claim ownership of it.
      </p>
      <p>
        To operate the Service we need permission to handle it. You grant us a non-exclusive, worldwide,
        royalty-free licence to host, store, back up, reproduce, and display Your Content solely to
        provide and maintain the Service for you — for example to store a trade, render a screenshot back
        to you, calculate your statistics, or deliver a message to its recipient. Where you publish
        content to community areas, that licence extends to displaying it to other members as the feature
        intends. The licence exists only to run the Service; it does not allow us to sell Your Content or
        use it for unrelated purposes, and it ends when you delete the content or your account, subject to
        the retention described in the Privacy Policy.
      </p>
    </Section>

    <Section id="community" index={6} title="Community content & conduct">
      <p>
        The forum, live chat, direct messages, reactions, and trade spotlights are shared spaces. You are
        responsible for what you post in them. Content posted publicly can be seen, quoted, and
        screenshotted by other members, so treat it as public.
      </p>
      <p>
        We may review, moderate, remove, or refuse content, and may act on reports from other members.
        Trade spotlight submissions are reviewed before they are featured. Moderation is carried out at
        our discretion, and we are not obliged to monitor all content.
      </p>
    </Section>

    <Section id="disclaimer" index={7} title="Trading & financial disclaimer">
      <p>
        Trading foreign exchange, indices, commodities, equities, derivatives, and other leveraged
        instruments carries substantial risk, including in some circumstances the risk of losing more than
        your initial capital. It is not suitable for everyone.
      </p>
      <UL>
        <li>Strike Journal does not guarantee trading profits or any particular outcome.</li>
        <li>Past performance — yours or anyone else's shown in the Service — does not guarantee or indicate future results.</li>
        <li>Statistics, insights, badges, report cards, and leaderboard positions are informational summaries of past activity.</li>
        <li>Results published by other members are self-reported and are not verified by us.</li>
        <li>You remain solely responsible for your own trading decisions and their consequences.</li>
      </UL>
    </Section>

    <Section id="no-advice" index={8} title="No investment advice">
      <p>
        Nothing in the Service is financial, investment, tax, or legal advice, and nothing in it is a
        recommendation or solicitation to buy, sell, or hold any instrument. Strike Journal does not
        provide personalised investment advice and does not act as a broker, dealer, investment adviser,
        or fund manager. Educational material such as blog posts and guides is general information only.
        If you need advice for your own situation, speak to a qualified professional authorised in your
        jurisdiction.
      </p>
    </Section>

    <Section id="analytics" index={9} title="Analytics & automated insights">
      <p>
        The Service generates written observations and statistics from the data you enter — for example,
        how a setup or session has performed across your logged trades. These are produced by calculations
        applied to your own historical records.
      </p>
      <Callout label="Automated analysis">
        Automated analysis describes your past, self-reported data. It may be incomplete, may rest on small
        sample sizes, and may miss the context behind a trade. Treat it as informational, check it against
        your own records, and do not treat it as a prediction of future results or as personalised
        financial advice.
      </Callout>
      <p>
        If AI-powered features are introduced in future, the same principles apply: AI-generated content can
        contain errors and misunderstandings, should be reviewed by you before you act on it, is not a
        guarantee of future performance, and is not personalised financial advice. The Privacy Policy will
        be updated at that point to describe what information is processed and by whom.
      </p>
    </Section>

    <Section id="challenges" index={10} title="Funding challenge tracking">
      <p>
        The funding challenge tracker lets you enter a prop firm's published rules — account size, profit
        target, drawdown limits, minimum trading days, profit split — so the Service can estimate where you
        stand against them based on the trades you have logged.
      </p>
      <p>
        Strike Journal is independent. It is not affiliated with, endorsed by, sponsored by, or acting on
        behalf of any prop firm or funding provider. Calculations are estimates based on the rules and
        trades you enter, and firms apply their own rules, data, and interpretations. Passing a challenge,
        keeping funded status, and receiving payouts are never guaranteed by anything shown here. Always
        confirm your standing directly with your firm before acting on it.
      </p>
    </Section>

    <Section id="broker" index={11} title="Connected brokerage accounts">
      <p>
        Where broker sync is available, connecting an account is optional and initiated by you. You are
        responsible for having the right to connect that account and for complying with your broker's
        terms. Synced data is imported on a best-effort basis and may be incomplete, delayed, or
        mismatched — your broker's own statements remain authoritative. You can disconnect a connection at
        any time from the app.
      </p>
    </Section>

    <Section id="market-data" index={12} title="Market data & third-party content">
      <p>
        The Service displays economic calendar events, macroeconomic indicators, positioning and sentiment
        data, and embedded market charts sourced from third parties. This content is provided for general
        information, may be delayed, incomplete, or inaccurate, and we do not endorse or guarantee it.
        Third-party content and embedded widgets are governed by the terms of the providers that supply
        them.
      </p>
    </Section>

    <Section id="payments" index={13} title="Plans, subscriptions & payments">
      <p>
        Strike Journal currently offers a free plan that includes the journal, funding challenge tracker,
        dashboard and core analytics, community access, and the public report card, with certain limits
        such as the number of trading accounts.
      </p>
      <p>
        A paid "Pro" plan is described in the product as upcoming. Billing is not live in the Service at
        the time of writing, and no payment details are collected or charged through it. Where a paid plan
        is enabled, the following terms will apply and must be completed before launch:
      </p>
      <UL>
        <li>Pricing and billing intervals: <Fill>[PRICING & BILLING INTERVALS]</Fill></li>
        <li>Payment processing and accepted methods: <Fill>[PAYMENT PROCESSOR]</Fill></li>
        <li>Renewal and cancellation: <Fill>[RENEWAL & CANCELLATION TERMS]</Fill></li>
        <li>Refunds: <Fill>[REFUND POLICY]</Fill></li>
        <li>Taxes: <Fill>[TAX TREATMENT]</Fill></li>
        <li>Price changes and notice given: <Fill>[PRICE CHANGE POLICY]</Fill></li>
      </UL>
      <p>
        Free features are provided as they are, and we may change, limit, or discontinue what the free plan
        includes.
      </p>
    </Section>

    <Section id="ip" index={14} title="Intellectual property">
      <p>
        The Service itself — its software, interface, design, branding, name, logo, and the material we
        publish — belongs to us or our licensors and is protected by intellectual property law. These Terms
        give you a limited, personal, non-transferable, revocable licence to use the Service for your own
        trading and journaling. They do not transfer ownership to you, and they do not permit you to copy,
        resell, or build competing products from our software or content.
      </p>
    </Section>

    <Section id="prohibited" index={15} title="Prohibited uses">
      <p>When using the Service, you agree not to:</p>
      <UL>
        <li>Use it for any unlawful purpose, or to promote unlawful activity.</li>
        <li>Attempt to access another user's account, private records, or data.</li>
        <li>Probe, circumvent, or defeat security or access controls, or test them without our written permission.</li>
        <li>Upload malware, or content designed to damage or disrupt systems or other users.</li>
        <li>Scrape, crawl, or bulk-extract content from the Service, or use automated means to overload it.</li>
        <li>Reverse engineer or copy the Service's software, except where the law expressly permits it.</li>
        <li>Impersonate any person or organisation, or misrepresent your affiliation or trading results.</li>
        <li>Engage in fraud, including using fabricated results to solicit money or followers from other members.</li>
        <li>Post harassing, hateful, threatening, or sexually explicit content, or content that infringes someone else's rights.</li>
        <li>Spam or advertise unrelated products, signal services, managed account schemes, or unregulated financial offerings.</li>
        <li>Interfere with the Service's operation or with other members' use of it.</li>
      </UL>
    </Section>

    <Section id="termination" index={16} title="Suspension & termination">
      <p>
        You may stop using the Service at any time. You can request deletion of your account from Settings →
        Danger zone, or by emailing us. As described in the Privacy Policy, deletion is processed as a
        request rather than an instant automated action, and some data may persist in backups or in other
        users' message histories for a period afterwards.
      </p>
      <p>
        We may remove content, restrict features, temporarily suspend, or terminate an account where we
        reasonably believe these Terms have been breached, where it is necessary to protect members or the
        Service, or where we are required to by law. Where circumstances allow, we will aim to give notice
        and, for less serious matters, an opportunity to put the problem right. Provisions that by their
        nature should survive termination — including licences already exercised, disclaimers, limitation of
        liability, and indemnification — continue to apply.
      </p>
    </Section>

    <Section id="availability" index={17} title="Service availability & changes">
      <p>
        We aim for a reliable service but do not guarantee that it will be uninterrupted, timely,
        error-free, or available at any particular time. Maintenance, provider outages, and faults can
        interrupt access. We may add, change, or remove features as the product develops, and may
        discontinue the Service; if we discontinue it entirely, we will give reasonable notice where
        practical so you can export your data.
      </p>
    </Section>

    <Section id="warranties" index={18} title="Disclaimer of warranties">
      <p>
        To the fullest extent permitted by law, the Service is provided "as is" and "as available", without
        warranties of any kind, express or implied, including implied warranties of merchantability, fitness
        for a particular purpose, accuracy, and non-infringement. We do not warrant that the Service, its
        calculations, its imported data, or its third-party content will be accurate, complete, or suitable
        for your purposes. Some jurisdictions do not allow certain warranties to be excluded, in which case
        those exclusions may not apply to you.
      </p>
    </Section>

    <Section id="liability" index={19} title="Limitation of liability">
      <p>
        To the fullest extent permitted by law, Strike Journal and its operators will not be liable for
        trading losses, lost profits, lost opportunities, loss of data, failed funding challenges, or any
        indirect, incidental, special, consequential, or punitive damages arising from your use of the
        Service — including reliance on analytics, insights, challenge calculations, synced data, or
        third-party market content.
      </p>
      <p>
        Where liability cannot be excluded, our total aggregate liability arising out of or relating to the
        Service is limited to the greater of the amount you paid us for the Service in the twelve months
        before the claim, or <Fill>[LIABILITY CAP — REQUIRES LEGAL INPUT]</Fill>. Nothing in these Terms
        excludes liability that cannot lawfully be excluded, such as liability for fraud or for death or
        personal injury caused by negligence.
      </p>
    </Section>

    <Section id="indemnity" index={20} title="Indemnification">
      <p>
        You agree to indemnify and hold harmless Strike Journal and its operators from claims, damages,
        losses, and reasonable costs arising from your breach of these Terms, your misuse of the Service,
        content you submit, or your violation of a third party's rights. We will notify you of any such
        claim, and you may participate in its defence.
      </p>
    </Section>

    <Section id="changes" index={21} title="Changes to these terms">
      <p>
        We may update these Terms as the Service changes — for example when paid plans launch. We will
        update the "last updated" date at the top of this page and, for material changes, aim to notify you
        in the app before they take effect. Continuing to use the Service after an update takes effect means
        you accept the revised Terms. If you do not accept them, stop using the Service and request deletion
        of your account.
      </p>
    </Section>

    <Section id="governing-law" index={22} title="Governing law & disputes">
      <p>
        These Terms are governed by the laws of <Fill>[GOVERNING LAW / JURISDICTION]</Fill>, without regard
        to its conflict-of-law rules. Any dispute arising out of or relating to these Terms or the Service
        will be subject to <Fill>[DISPUTE RESOLUTION FORUM / PROCESS — REQUIRES LEGAL INPUT]</Fill>.
      </p>
      <p>
        If you are a consumer, this section does not affect mandatory protections or court access available
        to you under the law of your country of residence. Before starting formal proceedings, we ask that
        you contact us so we can try to resolve the matter directly.
      </p>
    </Section>

    <Section id="contact" index={23} title="Contact information">
      <p>
        Questions about these Terms can be sent to{" "}
        <a
          href="mailto:support@strikejournal.com"
          className="text-[var(--accent)] hover:text-[var(--accent-hover)] font-medium underline underline-offset-2"
        >
          support@strikejournal.com
        </a>
        .
      </p>
      <p>
        Operated by <Fill>[COMPANY LEGAL NAME]</Fill>, <Fill>[LEGAL ADDRESS]</Fill>.
      </p>
    </Section>
  </LegalShell>
);
