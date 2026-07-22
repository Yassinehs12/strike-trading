import React from "react";
import { ArrowLeft } from "lucide-react";
import { LogoFull } from "./Logo";
import ThemeToggle from "./ThemeToggle.jsx";

/* ============================================================
   Shared shell for legal pages — matches the landing page's
   nav (sticky, blurred, theme toggle) so these don't feel like
   a bolted-on page from a template.
   ============================================================ */
const SUB_NAV = [
  { label: "Blog", href: "#/blog" },
  { label: "Privacy Policy", href: "#/privacy" },
  { label: "Terms of Service", href: "#/terms" },
  { label: "Changelog", href: "#/changelog" },
];

const LegalShell = ({ title, updated, children }) => (
  <div className="lp-root min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
      .lp-root { font-family: 'Inter', ui-sans-serif, system-ui, sans-serif; }
    `}</style>

    <header className="sticky top-0 z-50 backdrop-blur-md bg-[var(--bg-primary)]/70 border-b border-white/10">
      <div className="max-w-3xl mx-auto px-4 h-16 flex items-center justify-between">
        <a href="#/" className="flex items-center gap-2">
          <LogoFull size={26} textClass="text-sm" />
        </a>
        <div className="flex items-center gap-4">
          <ThemeToggle />
          <a
            href="#/"
            className="hidden sm:flex items-center gap-1.5 text-sm font-medium text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors"
          >
            <ArrowLeft size={14} /> Back to site
          </a>
        </div>
      </div>
    </header>

    <main className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="text-2xl md:text-3xl font-extrabold mb-1">{title}</h1>
      <p className="text-xs text-[var(--text-faint)] mb-8">Last updated: {updated}</p>

      <nav className="flex flex-wrap items-center gap-x-5 gap-y-2 mb-10 pb-8 border-b border-white/10">
        {SUB_NAV.map((l) => {
          const isActive = typeof window !== "undefined" && window.location.hash.replace(/^#\/?/, "") === l.href.replace("#/", "");
          return (
            <a
              key={l.href}
              href={l.href}
              className={`text-xs font-semibold uppercase tracking-wide transition-colors ${
                isActive ? "text-[var(--accent)]" : "text-[var(--text-faint)] hover:text-[var(--text-primary)]"
              }`}
            >
              {l.label}
            </a>
          );
        })}
      </nav>

      <div className="space-y-8 text-sm leading-relaxed text-[var(--text-tertiary)]">
        {children}
      </div>
    </main>

    <footer className="border-t border-white/5 py-8 px-4 mt-8">
      <div className="max-w-3xl mx-auto text-xs text-[var(--text-faint)] text-center">
        © {new Date().getFullYear()} Strike Journal. All rights reserved.
      </div>
    </footer>
  </div>
);

const Section = ({ id, title, children }) => (
  <section id={id} className="scroll-mt-24">
    <h2 className="text-base font-bold text-[var(--text-primary)] mb-2 tracking-tight">{title}</h2>
    <div className="space-y-2">{children}</div>
  </section>
);

/* ============================================================
   PRIVACY POLICY
   ============================================================ */
export const PrivacyPolicy = () => (
  <LegalShell title="Privacy Policy" updated="July 19, 2026">
    <p>
      This Privacy Policy explains what information Strike Journal ("Strike Journal," "we," "us")
      collects when you use the app, how we use it, and the choices you have. By creating an
      account, you agree to the practices described here.
    </p>

    <Section id="info-we-collect" title="1. Information we collect">
      <p><strong className="text-[var(--text-primary)]">Account information:</strong> email address, username, and password (handled by our authentication provider — we never see or store your raw password).</p>
      <p><strong className="text-[var(--text-primary)]">Trading data you enter:</strong> trades, journal entries, screenshots you attach, prop firm challenge rules, goals, and notes you choose to log.</p>
      <p><strong className="text-[var(--text-primary)]">Community content:</strong> forum posts, comments, live chat messages, direct messages, and profile info (avatar, bio) you choose to add.</p>
      <p><strong className="text-[var(--text-primary)]">Usage data:</strong> basic analytics such as pages visited and general usage patterns, used to understand how the app is used and to fix bugs.</p>
    </Section>

    <Section id="how-we-use" title="2. How we use your information">
      <p>We use your information to:</p>
      <ul className="list-disc pl-5 space-y-1">
        <li>Provide and operate the journal, challenge tracker, analytics, and community features</li>
        <li>Authenticate you and keep your account secure</li>
        <li>Respond to support requests</li>
        <li>Improve the app and fix issues</li>
        <li>Enforce our Terms of Service and keep the community safe</li>
      </ul>
      <p>We do not sell your personal information, and we do not use your trade data to trade on your behalf or share it with prop firms.</p>
    </Section>

    <Section id="visibility" title="3. What's private vs. public">
      <p>
        Your individual trades, P&amp;L, and journal entries are private by default and only visible
        to you. Your profile, forum posts, and live chat messages are visible to other members of the
        community. Whether your stats appear on the public leaderboard is controlled by an opt-in
        setting — it's off unless you turn it on.
      </p>
    </Section>

    <Section id="storage" title="4. How we store and protect your data">
      <p>
        Data is stored with Supabase, our database and authentication provider, using row-level
        security so that other users cannot access your private data through the API. No method of
        transmission or storage is 100% secure, but we take reasonable steps to protect your
        information.
      </p>
    </Section>

    <Section id="third-parties" title="5. Third-party services">
      <p>We rely on a small number of service providers to run Strike Journal:</p>
      <ul className="list-disc pl-5 space-y-1">
        <li><strong className="text-[var(--text-primary)]">Supabase</strong> — database, authentication, and file storage</li>
        <li><strong className="text-[var(--text-primary)]">Vercel</strong> — hosting and basic, privacy-friendly usage analytics</li>
      </ul>
      <p>These providers process data on our behalf and are not permitted to use it for their own purposes.</p>
    </Section>

    <Section id="cookies" title="6. Cookies & local storage">
      <p>
        We use essential cookies/local storage to keep you signed in and remember preferences like
        your theme (light/dark). We don't use third-party advertising trackers.
      </p>
    </Section>

    <Section id="your-rights" title="7. Your rights & choices">
      <p>You can, at any time:</p>
      <ul className="list-disc pl-5 space-y-1">
        <li>Edit or delete your trades, journal entries, and profile information</li>
        <li>Opt in or out of the public leaderboard</li>
        <li>Request an export or deletion of your account and associated data</li>
      </ul>
      <p>To request a data export or full account deletion, contact us using the details below.</p>
    </Section>

    <Section id="children" title="8. Children's privacy">
      <p>Strike Journal is not directed to children under 16, and we do not knowingly collect information from them.</p>
    </Section>

    <Section id="changes" title="9. Changes to this policy">
      <p>
        We may update this Privacy Policy from time to time. If we make material changes, we'll
        update the "last updated" date above and, where appropriate, notify you in-app.
      </p>
    </Section>

    <Section id="contact" title="10. Contact us">
      <p>
        Questions about this policy or your data? Reach out at{" "}
        <span className="text-[var(--text-primary)] font-medium">[your contact email]</span>{" "}
        or via the Strike Discord community.
      </p>
    </Section>
  </LegalShell>
);

/* ============================================================
   TERMS OF SERVICE
   ============================================================ */
export const TermsOfService = () => (
  <LegalShell title="Terms of Service" updated="July 19, 2026">
    <p>
      These Terms of Service ("Terms") govern your use of Strike Journal (the "Service"). By
      creating an account or using the Service, you agree to these Terms. If you don't agree,
      please don't use the Service.
    </p>

    <Section id="eligibility" title="1. Eligibility & accounts">
      <p>
        You must be at least 16 years old to use Strike Journal. You're responsible for
        safeguarding your account credentials and for all activity that happens under your account.
        Let us know right away if you suspect unauthorized use.
      </p>
    </Section>

    <Section id="not-advice" title="2. Not financial or investment advice">
      <p>
        Strike Journal is a self-tracking and analytics tool. Nothing in the app — including
        journal insights, analytics, risk gauges, or challenge tracking — constitutes financial,
        investment, or trading advice, and it is not a recommendation to buy, sell, or hold any
        asset. Trading foreign exchange, indices, commodities, and other leveraged instruments
        carries a high level of risk and may not be suitable for everyone. You are solely
        responsible for your own trading decisions.
      </p>
    </Section>

    <Section id="prop-firm" title="3. Funding challenge tracker">
      <p>
        The funding challenge tracker is an independent tool that lets you enter a prop firm's
        published rules so the app can estimate compliance. Strike Journal is not affiliated with,
        endorsed by, or acting on behalf of any prop firm. We don't guarantee the accuracy of
        challenge calculations — always confirm your standing with your prop firm directly before
        making decisions based on it.
      </p>
    </Section>

    <Section id="acceptable-use" title="4. Acceptable use">
      <p>When using the community features (forum, live chat, direct messages, trade spotlights), you agree not to:</p>
      <ul className="list-disc pl-5 space-y-1">
        <li>Post content that is illegal, harassing, hateful, or abusive</li>
        <li>Impersonate any person or entity, or misrepresent trading results</li>
        <li>Spam, solicit, or advertise unrelated products or services, including unregulated financial schemes</li>
        <li>Attempt to access another user's account or private data</li>
        <li>Interfere with or disrupt the Service, including through scraping, reverse engineering, or attacks on our infrastructure</li>
      </ul>
      <p>We may remove content or suspend accounts that violate these rules, at our discretion.</p>
    </Section>

    <Section id="content" title="5. Your content">
      <p>
        You retain ownership of the trades, journal entries, screenshots, and posts you submit. By
        posting in community areas, you grant us a limited license to display that content within
        the Service. You're responsible for making sure you have the rights to anything you upload.
      </p>
    </Section>

    <Section id="availability" title="6. Service availability">
      <p>
        Strike Journal is provided on an "as is" and "as available" basis. We aim for high
        reliability but don't guarantee the Service will be uninterrupted, error-free, or available
        at all times, and features may change as the product evolves.
      </p>
    </Section>

    <Section id="liability" title="7. Limitation of liability">
      <p>
        To the fullest extent permitted by law, Strike Journal and its creators are not liable for
        any trading losses, missed profits, or indirect, incidental, or consequential damages
        arising from your use of the Service, including reliance on analytics, insights, or
        challenge-tracking calculations.
      </p>
    </Section>

    <Section id="termination" title="8. Termination">
      <p>
        You may stop using the Service and delete your account at any time. We may suspend or
        terminate accounts that violate these Terms or the acceptable use rules above.
      </p>
    </Section>

    <Section id="changes" title="9. Changes to these Terms">
      <p>
        We may update these Terms occasionally. Continuing to use the Service after changes take
        effect means you accept the updated Terms.
      </p>
    </Section>

    <Section id="governing-law" title="10. Governing law">
      <p>These Terms are governed by the laws of <span className="text-[var(--text-primary)] font-medium">[your jurisdiction]</span>, without regard to conflict-of-law principles.</p>
    </Section>

    <Section id="contact" title="11. Contact us">
      <p>
        Questions about these Terms? Reach out at{" "}
        <span className="text-[var(--text-primary)] font-medium">[your contact email]</span>{" "}
        or via the Strike Discord community.
      </p>
    </Section>
  </LegalShell>
);
