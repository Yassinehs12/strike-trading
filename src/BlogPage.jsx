import React from "react";
import { ArrowLeft, Clock, Tag as TagIcon, Newspaper } from "lucide-react";
import { LogoFull } from "./Logo";
import ThemeToggle from "./ThemeToggle.jsx";

/* ============================================================
   BLOG POSTS
   Add a new object to the TOP of this array to publish a post.
   `slug` becomes the URL: #/blog/your-slug-here
   `content` is a list of simple blocks — no markdown needed:
     { type: "p", text: "..." }
     { type: "h2", text: "..." }
     { type: "list", items: ["...", "..."] }
     { type: "quote", text: "..." }
   Word count from `content` drives the auto-computed read time.
   ============================================================ */
export const POSTS = [
  {
    slug: "welcome-to-strike-journal",
    title: "Why we built Strike Journal",
    excerpt: "Most trading journals are either a spreadsheet nobody keeps updating, or a bloated platform that has nothing to do with prop firm challenges. We wanted something in between.",
    date: "2026-07-19",
    tags: ["Announcement"],
    content: [
      { type: "p", text: "Every trader we talked to had the same two tools open at once: a trading journal they stopped updating after week two, and a separate spreadsheet tracking their prop firm challenge rules by hand — max daily loss, max drawdown, minimum trading days, all recalculated manually after every session." },
      { type: "p", text: "That gap is exactly what Strike Journal is built to close." },
      { type: "h2", text: "One place for the whole picture" },
      { type: "p", text: "Instead of journaling trades in one app and tracking challenge compliance in another, Strike Journal ties them together. Log a trade, and it automatically updates your challenge's drawdown gauge, your win rate, and your analytics — no manual recalculating, no second spreadsheet." },
      { type: "list", items: [
        "Trade journal with setup tags, session, and psychology notes",
        "Funding challenge tracker with live rule compliance, works with any prop firm",
        "Analytics that actually explain your edge, not just raw P&L",
        "A community built around accountability, not just flexing wins",
      ] },
      { type: "h2", text: "Built by a trader, for traders" },
      { type: "p", text: "This isn't a generic SaaS template with \"trading\" branding slapped on. Every feature exists because it was missing from our own daily workflow — the CHoCH retest setups, the New York session focus, the actual discipline of sticking to a challenge's rules under pressure." },
      { type: "quote", text: "If it doesn't help you trade better tomorrow than you did today, it doesn't belong in the app." },
      { type: "p", text: "That's the bar for everything we ship. If you've got feedback, bugs, or a feature you wish existed, the Discord link in the footer goes straight to us — we read everything." },
    ],
  },
];

const readTime = (content) => {
  const words = content.reduce((acc, block) => {
    if (block.text) return acc + block.text.split(/\s+/).length;
    if (block.items) return acc + block.items.join(" ").split(/\s+/).length;
    return acc;
  }, 0);
  return Math.max(1, Math.round(words / 200));
};

const formatDate = (iso) =>
  new Date(iso + "T00:00:00").toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

const Shell = ({ children, maxW = "max-w-2xl" }) => (
  <div className="blog-root min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
      .blog-root { font-family: 'Inter', ui-sans-serif, system-ui, sans-serif; }
    `}</style>

    <header className="sticky top-0 z-50 backdrop-blur-md bg-[var(--bg-primary)]/70 border-b border-white/10">
      <div className={`${maxW} mx-auto px-4 h-16 flex items-center justify-between`}>
        <a href="#/" className="flex items-center gap-2">
          <LogoFull size={26} textClass="text-sm" />
        </a>
        <div className="flex items-center gap-4">
          <ThemeToggle />
          <a href="#/" className="hidden sm:flex items-center gap-1.5 text-sm font-medium text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors">
            <ArrowLeft size={14} /> Back to site
          </a>
        </div>
      </div>
    </header>

    <main className={`${maxW} mx-auto px-4 py-10 md:py-14`}>{children}</main>

    <footer className="border-t border-white/5 py-8 px-4 mt-8">
      <div className={`${maxW} mx-auto text-xs text-[var(--text-faint)] text-center`}>
        © {new Date().getFullYear()} Strike Journal. All rights reserved.
      </div>
    </footer>
  </div>
);

const PostCard = ({ post }) => (
  <a href={`#/blog/${post.slug}`} className="block group">
    <div className="border border-white/10 rounded-xl p-5 hover:border-[var(--accent)]/40 hover:bg-white/[0.02] transition-colors">
      <div className="flex items-center gap-2 mb-2 flex-wrap">
        {post.tags?.map((t) => (
          <span key={t} className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[var(--accent)]/10 text-[var(--accent)] border border-[var(--accent)]/20">
            <TagIcon size={10} /> {t}
          </span>
        ))}
      </div>
      <h2 className="text-lg font-extrabold mb-1.5 group-hover:text-[var(--accent)] transition-colors">{post.title}</h2>
      <p className="text-sm text-[var(--text-tertiary)] leading-relaxed mb-3 line-clamp-2">{post.excerpt}</p>
      <div className="flex items-center gap-3 text-xs text-[var(--text-faint)]">
        <span>{formatDate(post.date)}</span>
        <span className="flex items-center gap-1"><Clock size={11} /> {readTime(post.content)} min read</span>
      </div>
    </div>
  </a>
);

export const BlogListPage = () => (
  <Shell>
    <div className="flex items-center gap-2 mb-1">
      <Newspaper size={20} className="text-[var(--accent)]" />
      <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">Blog</h1>
    </div>
    <p className="text-sm text-[var(--text-faint)] mb-8">Notes on trading, building Strike Journal, and the community.</p>

    <nav className="flex flex-wrap items-center gap-x-5 gap-y-2 mb-10 pb-8 border-b border-white/10">
      <a href="#/blog" className="text-xs font-semibold uppercase tracking-wide text-[var(--accent)]">Blog</a>
      <a href="#/changelog" className="text-xs font-semibold uppercase tracking-wide text-[var(--text-faint)] hover:text-[var(--text-primary)] transition-colors">Changelog</a>
      <a href="#/privacy" className="text-xs font-semibold uppercase tracking-wide text-[var(--text-faint)] hover:text-[var(--text-primary)] transition-colors">Privacy Policy</a>
      <a href="#/terms" className="text-xs font-semibold uppercase tracking-wide text-[var(--text-faint)] hover:text-[var(--text-primary)] transition-colors">Terms of Service</a>
    </nav>

    {POSTS.length === 0 ? (
      <p className="text-sm text-[var(--text-faint)]">No posts yet — check back soon.</p>
    ) : (
      <div className="space-y-4">
        {POSTS.map((post) => <PostCard key={post.slug} post={post} />)}
      </div>
    )}
  </Shell>
);

const Block = ({ block }) => {
  switch (block.type) {
    case "h2":
      return <h2 className="text-lg font-bold text-[var(--text-primary)] mt-8 mb-3 tracking-tight">{block.text}</h2>;
    case "list":
      return (
        <ul className="list-disc pl-5 space-y-1.5 mb-4">
          {block.items.map((item, i) => (
            <li key={i} className="text-sm text-[var(--text-tertiary)] leading-relaxed">{item}</li>
          ))}
        </ul>
      );
    case "quote":
      return (
        <blockquote className="border-l-2 border-[var(--accent)] pl-4 py-1 my-5 text-[var(--text-primary)] italic text-[15px] leading-relaxed">
          {block.text}
        </blockquote>
      );
    default:
      return <p className="text-sm text-[var(--text-tertiary)] leading-relaxed mb-4">{block.text}</p>;
  }
};

export const BlogPostPage = ({ slug }) => {
  const post = POSTS.find((p) => p.slug === slug);

  if (!post) {
    return (
      <Shell>
        <div className="flex flex-col items-center text-center py-16">
          <h1 className="text-lg font-bold mb-1.5">Post not found</h1>
          <p className="text-sm text-[var(--text-muted)] mb-6">This post may have been moved or doesn't exist.</p>
          <a href="#/blog" className="inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--accent)] hover:underline">
            <ArrowLeft size={14} /> Back to Blog
          </a>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <a href="#/blog" className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--text-faint)] hover:text-[var(--text-primary)] transition-colors mb-6">
        <ArrowLeft size={12} /> All posts
      </a>

      <div className="flex items-center gap-2 mb-3 flex-wrap">
        {post.tags?.map((t) => (
          <span key={t} className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[var(--accent)]/10 text-[var(--accent)] border border-[var(--accent)]/20">
            <TagIcon size={10} /> {t}
          </span>
        ))}
      </div>

      <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight mb-3">{post.title}</h1>

      <div className="flex items-center gap-3 text-xs text-[var(--text-faint)] mb-8 pb-8 border-b border-white/10">
        <span>{formatDate(post.date)}</span>
        <span className="flex items-center gap-1"><Clock size={11} /> {readTime(post.content)} min read</span>
      </div>

      <article>
        {post.content.map((block, i) => <Block key={i} block={block} />)}
      </article>

      <div className="mt-10 pt-8 border-t border-white/10 flex items-center justify-between">
        <a href="#/blog" className="text-sm font-semibold text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors">
          ← All posts
        </a>
        <a href="#/" className="text-sm font-semibold text-[var(--accent)] hover:underline">
          Start your journal →
        </a>
      </div>
    </Shell>
  );
};
