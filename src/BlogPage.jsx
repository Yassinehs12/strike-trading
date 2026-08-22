import React from "react";
import { ArrowLeft, Clock, Tag as TagIcon, Newspaper } from "lucide-react";
import { LogoFull } from "./Logo";
import ThemeToggle from "./ThemeToggle.jsx";
import { usePageMeta } from "./lib/seo";

/* ============================================================
   BLOG POSTS
   Add a new object to the TOP of this array to publish a post.
   `slug` becomes the URL: /blog/your-slug-here
   `content` is a list of simple blocks — no markdown needed:
     { type: "p", text: "..." }
     { type: "h2", text: "..." }
     { type: "list", items: ["...", "..."] }
     { type: "quote", text: "..." }
   Word count from `content` drives the auto-computed read time.
   ============================================================ */
export const POSTS = [
  {
    slug: "trading-journal-habits-that-actually-stick",
    title: "Trading journal habits that actually stick (and the ones that don't)",
    excerpt: "Almost everyone starts a trading journal. Almost everyone stops updating it within a month. Here's what separates the traders who keep the habit from the ones who quietly let it die.",
    date: "2026-08-15",
    tags: ["Habits"],
    content: [
      { type: "p", text: "Ask ten traders if they journal and nine will say yes. Ask to see last week's entries and the honest answer usually gets quieter. A journal you started and abandoned isn't a journal — it's a spreadsheet with three rows and a guilty conscience." },
      { type: "p", text: "The traders who actually keep the habit going aren't more disciplined as people. They've just structured the habit so it survives contact with a busy, stressful trading day. A few patterns worth stealing." },
      { type: "h2", text: "Log the trade before you know the outcome" },
      { type: "p", text: "Waiting until a trade closes to write it up sounds efficient, but it means your notes are contaminated by the result. You'll unconsciously justify a bad entry because it happened to work out, or beat yourself up over a good one that didn't. Logging entry, setup, and reasoning the moment you're in the trade keeps the record honest — the outcome gets added later as its own separate field, not blended into your reasoning." },
      { type: "h2", text: "Make the friction near zero" },
      { type: "p", text: "If journaling means opening a separate app, finding the right spreadsheet tab, and manually calculating your risk percentage, you will skip it on your busiest day — which is exactly the day you most need the record. The habit only survives if logging a trade takes under a minute." },
      { type: "h2", text: "Review weekly, not daily" },
      { type: "p", text: "Daily review after a loss usually turns into rumination, not analysis. Weekly review gives you enough data points to actually see a pattern (a setup underperforming, a session where you consistently overtrade) instead of overreacting to one bad trade in isolation." },
      { type: "list", items: [
        "Log the setup and reasoning at entry, not after the outcome is known",
        "Keep the logging step under a minute or it won't survive a busy day",
        "Review weekly for patterns, not daily for damage control",
        "Track the process (checklist followed, risk sized correctly) separately from the P&L result",
      ] },
      { type: "h2", text: "Track process separately from outcome" },
      { type: "p", text: "A trade can lose money and still be a good trade — correct setup, correct risk, stopped out by normal noise. A trade can make money and still be a bad one — oversized, chased, no real setup. If your journal only has a P&L column, you can't tell these apart. That distinction is the entire point of tracking things like checklist completion and setup grade alongside the dollar result." },
      { type: "quote", text: "The goal of a trading journal isn't to prove you're profitable. It's to make your own patterns visible to you before they cost you more money." },
      { type: "p", text: "None of this requires more discipline than you already have. It requires a system that doesn't ask so much of the discipline you don't have yet." },
    ],
  },
  {
    slug: "position-sizing-how-much-to-risk-per-trade",
    title: "Position sizing 101: how much should you actually risk per trade?",
    excerpt: "The most common answer traders give to \"how much do you risk per trade\" is a guess. Here's how to turn it into a number you calculate instead of feel.",
    date: "2026-08-11",
    tags: ["Risk Management"],
    content: [
      { type: "p", text: "Ask a struggling trader how much they risked on their last loss and you'll often get a shrug. Ask a consistently profitable one and you'll get a specific dollar figure, calculated before the trade, not estimated after it. Position sizing is the least exciting part of trading and the most correlated with survival." },
      { type: "h2", text: "The math is simpler than it feels" },
      { type: "p", text: "Position size isn't really about the instrument — it's about working backward from how much you're willing to lose. The formula is the same whether you're trading EURUSD or a Nasdaq CFD:" },
      { type: "list", items: [
        "Decide your risk in dollars: account balance × risk percentage (commonly 0.5-2% per trade)",
        "Find your stop distance: the gap between entry and stop loss, in pips or points",
        "Divide risk by (stop distance × value per pip/point) to get your position size",
      ] },
      { type: "p", text: "The stop loss comes first, the position size comes second. If you're picking a lot size and then figuring out where to put your stop, the order is backwards, and it's usually why the stop ends up somewhere convenient instead of somewhere technically correct." },
      { type: "h2", text: "Why 1% isn't a universal answer" },
      { type: "p", text: "The commonly repeated advice is to risk 1% per trade, and it's a reasonable default — but it's not a law of physics. A trader with a genuine statistical edge and a long track record might reasonably run 1.5-2%. Someone on a prop firm evaluation with a strict daily loss limit might need to run tighter than 1% just to survive a bad week without breaching the rule. The right number depends on your actual constraints, not a number you saw in a forum post." },
      { type: "h2", text: "Leverage isn't the same as risk" },
      { type: "p", text: "This trips up more traders than almost anything else: leverage determines how much capital you're controlling, not how much you're risking. You can be leveraged 1:100 and still only be risking 0.5% of your account, if your stop is tight and your position size is calculated correctly. Leverage amplifies the position; your stop loss and lot size are what actually define the risk." },
      { type: "quote", text: "Your stop loss should be where your trade idea is wrong — not where your position size happens to run out of room." },
      { type: "h2", text: "Do the math before you're in the trade" },
      { type: "p", text: "The moment you're already in a trade is the worst possible time to be doing arithmetic under pressure. Calculating position size, risk exposure, and R:R before you place the order — not after — is the difference between a plan and an improvisation." },
      { type: "cta", text: "Try the free position size calculator", href: "/tools/position-size-calculator" },
    ],
  },
  {
    slug: "the-r-multiple-why-risking-100-to-make-50-is-the-real-problem",
    title: "The R-multiple: why risking $100 to make $50 is the real problem",
    excerpt: "A dollar figure on a trade tells you almost nothing on its own. The R-multiple — reward relative to what you actually risked — is what tells you whether the trade made sense in the first place.",
    date: "2026-08-06",
    tags: ["Risk Management"],
    content: [
      { type: "p", text: "\"I made $50 on that trade\" sounds like good news. It might be. It might also mean you risked $200 to make $50 — a trade that loses money over time even if it wins more often than it loses. Raw P&L hides this completely. The R-multiple doesn't." },
      { type: "h2", text: "What R actually means" },
      { type: "p", text: "R is just your result divided by what you risked. Risk $100, make $250: that's +2.5R. Risk $100, lose $100: that's -1R, always, by definition — losses can't exceed 1R if your stop actually holds. The number reframes every trade around the one thing you controlled going in: how much you were willing to lose." },
      { type: "h2", text: "Why win rate alone is a trap" },
      { type: "p", text: "A 70% win rate sounds great until you learn the average win is +0.4R and the average loss is -2R. Do that math over 100 trades and you're underwater, despite winning most of the time. A 40% win rate with average wins of +3R and average losses of -1R is comfortably profitable. Win rate without R attached is a headline with no article underneath it." },
      { type: "list", items: [
        "R-multiple = trade result ÷ dollar amount risked",
        "A losing trade with a held stop is always close to -1R — that's the point of the stop",
        "Expectancy = (win rate × average win R) − (loss rate × average loss R)",
        "A strategy can have a low win rate and still be profitable if average win R is large enough",
      ] },
      { type: "h2", text: "The trades that reveal the most" },
      { type: "p", text: "Sort your journal by R instead of by dollar P&L and a different picture usually shows up. The trade that made the most money isn't always the best-executed one — sometimes it's a trade that should've been stopped out and wasn't, that happened to reverse in your favor. Sorting by R surfaces the trades where the risk-to-reward relationship was actually sound, independent of how lucky the outcome got." },
      { type: "quote", text: "P&L tells you what happened. R tells you whether it should have." },
      { type: "h2", text: "Logging it changes how you trade" },
      { type: "p", text: "Once you're recording risk amount alongside every trade, a habit tends to form on its own: before entering, you start asking what the R actually is at this stop and target, not just whether the setup looks good. A setup can look perfect and still be a bad trade if the reward doesn't clear the risk by enough of a margin." },
    ],
  },
  {
    slug: "revenge-trading-the-discipline-leak-most-journals-never-catch",
    title: "Revenge trading: the discipline leak most journals never catch",
    excerpt: "Most trading journals record what happened. Almost none record the emotional state you were in when you decided to take the trade — which is exactly the piece of data revenge trading hides inside.",
    date: "2026-07-29",
    tags: ["Psychology"],
    content: [
      { type: "p", text: "Revenge trading rarely looks like a single reckless decision from the outside. It looks like a trader taking a setup that's just slightly worse than their usual bar, sized just slightly bigger than usual, minutes after a loss. Individually, none of it looks alarming. The pattern only becomes visible when you look at several instances lined up together — which requires actually tracking the thing most journals skip: the emotional state behind the trade, not just the trade itself." },
      { type: "h2", text: "Why it's hard to catch in the moment" },
      { type: "p", text: "The trade that follows a loss usually feels like conviction, not tilt. \"I see the setup, I know this pair, I'm just taking what's there\" is what it feels like from the inside. It rarely feels like revenge while it's happening — it feels like opportunity. That's precisely why it needs to be caught by a pattern in the data, not by self-awareness in the moment, which is the thing most compromised right after a loss." },
      { type: "h2", text: "The pattern to look for" },
      { type: "p", text: "It's not any single trade taken after a loss — that's normal, you're still trading. It's a repeated pattern: negative-emotion trades (tagged FOMO, greed, fear, overtrading) clustering specifically in the minutes or hours right after a loss, and underperforming your baseline win rate when they do. Once you see that cluster three or four times in your own history, it stops being a coincidence and starts being a documented leak." },
      { type: "list", items: [
        "Tag the emotional state at entry, not just the outcome at exit",
        "Look specifically at trades taken within an hour of a loss",
        "Compare their win rate against your neutral-state baseline",
        "A repeated 15+ point win-rate gap is a real pattern, not noise",
      ] },
      { type: "h2", text: "The fix isn't more willpower" },
      { type: "p", text: "Knowing intellectually that revenge trading is bad rarely stops it in the moment — the whole mechanism runs on impulse, not reasoning. What actually works is closer to a circuit breaker: a mandatory pause after any loss, long enough that the impulse has somewhere to burn off before an order can go in. Some traders use a flat cooldown timer. Others use a hard rule that the next trade needs a fresh checklist pass, no exceptions, no matter how obvious the setup looks." },
      { type: "quote", text: "You can't out-discipline a pattern you've never actually measured. You can only out-discipline one you've seen in your own numbers." },
      { type: "p", text: "The traders who eventually break this pattern almost always describe the same turning point: seeing it laid out in their own history, undeniable, instead of half-remembering \"a few bad trades\" from a rough week." },
    ],
  },
  {
    slug: "how-to-pass-a-prop-firm-challenge-without-blowing-the-daily-loss-limit",
    title: "How to pass a prop firm challenge without blowing the daily loss limit",
    excerpt: "Most failed challenges aren't lost to a single catastrophic trade. They're lost to a daily loss limit nobody was tracking in real time until it was already breached.",
    date: "2026-07-23",
    tags: ["Prop Firm"],
    content: [
      { type: "p", text: "Talk to enough traders who've failed a funded account evaluation and a pattern shows up fast: it's rarely one huge losing trade. It's three or four smaller losses in the same session that quietly stacked past the daily loss limit before anyone was watching the running total closely enough." },
      { type: "h2", text: "The daily limit is a different problem than the overall limit" },
      { type: "p", text: "Most challenge rules have two separate drawdown limits: a maximum daily loss and a maximum overall loss. Traders plan around the overall number because it's the bigger, scarier one — and then get disqualified by the daily one, which is smaller, resets every day, and is far easier to breach without noticing if you're not tracking it trade by trade in real time." },
      { type: "h2", text: "Know your number before the session starts" },
      { type: "p", text: "Before you take a single trade for the day, know the exact dollar amount that ends your trading day — not roughly, exactly. If your daily loss limit is 5% on a $100,000 account, that's $5,000, full stop, regardless of how good the next setup looks after you hit it. Writing that number down before the session, not calculating it under pressure after two losses, is what actually makes it enforceable." },
      { type: "list", items: [
        "Calculate your exact daily loss limit in dollars before the session starts, not during it",
        "Track running P&L against that number after every closed trade, not at the end of the day",
        "Decide your stop-trading rule in advance — a dollar limit, a loss count, or both",
        "Treat minimum trading day requirements as a pacing tool, not something to rush at the end",
      ] },
      { type: "h2", text: "Minimum trading days work against rushed traders" },
      { type: "p", text: "Most challenges also require a minimum number of trading days before you can pass, even if you hit the profit target early. Traders who don't track this end up in one of two bad spots: forcing trades late in the evaluation just to hit the day count, or realizing with two days left that they still need five more trading days and panic-sizing to compensate. Knowing your pace against both the profit target and the day count from week one removes the rush entirely." },
      { type: "quote", text: "The rules of a challenge aren't the obstacle. Not tracking them in real time is." },
      { type: "h2", text: "Treat compliance as a live number, not a monthly review" },
      { type: "p", text: "The evaluations that get passed calmly tend to share one habit: the trader can see their daily loss usage, overall drawdown, and days-traded count updating live, after every single trade — not reconstructed from memory at the end of the week. When the numbers are visible in real time, stopping at the right moment stops being a willpower problem and becomes just following what's on the screen." },
    ],
  },

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
        <a href="/" className="flex items-center gap-2">
          <LogoFull size={26} textClass="text-sm" />
        </a>
        <div className="flex items-center gap-4">
          <ThemeToggle />
          <a href="/" className="hidden sm:flex items-center gap-1.5 text-sm font-medium text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors">
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
  <a href={`/blog/${post.slug}`} className="block group">
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

export const BlogListPage = () => {
  usePageMeta({
    title: "Blog",
    description: "Notes on trading, prop firm challenges, and building a trading journal that actually gets used — from the Strike Journal team.",
    path: "/blog",
  });
  return (
  <Shell>
    <div className="flex items-center gap-2 mb-1">
      <Newspaper size={20} className="text-[var(--accent)]" />
      <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">Blog</h1>
    </div>
    <p className="text-sm text-[var(--text-faint)] mb-8">Notes on trading, building Strike Journal, and the community.</p>

    <nav className="flex flex-wrap items-center gap-x-5 gap-y-2 mb-10 pb-8 border-b border-white/10">
      <a href="/blog" className="text-xs font-semibold uppercase tracking-wide text-[var(--accent)]">Blog</a>
      <a href="/changelog" className="text-xs font-semibold uppercase tracking-wide text-[var(--text-faint)] hover:text-[var(--text-primary)] transition-colors">Changelog</a>
      <a href="/privacy" className="text-xs font-semibold uppercase tracking-wide text-[var(--text-faint)] hover:text-[var(--text-primary)] transition-colors">Privacy Policy</a>
      <a href="/terms" className="text-xs font-semibold uppercase tracking-wide text-[var(--text-faint)] hover:text-[var(--text-primary)] transition-colors">Terms of Service</a>
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
};

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
    case "cta":
      return (
        <a href={block.href} className="block my-6 rounded-xl border border-[var(--border-primary)] px-4 py-3 text-sm font-semibold text-[var(--accent)] hover:underline" style={{ backgroundColor: "var(--card-bg)" }}>
          {block.text} →
        </a>
      );
    default:
      return <p className="text-sm text-[var(--text-tertiary)] leading-relaxed mb-4">{block.text}</p>;
  }
};

export const BlogPostPage = ({ slug }) => {
  const post = POSTS.find((p) => p.slug === slug);

  usePageMeta(
    post
      ? { title: post.title, description: post.excerpt, path: `/blog/${post.slug}` }
      : { title: "Post not found", path: `/blog/${slug || ""}` }
  );

  if (!post) {
    return (
      <Shell>
        <div className="flex flex-col items-center text-center py-16">
          <h1 className="text-lg font-bold mb-1.5">Post not found</h1>
          <p className="text-sm text-[var(--text-muted)] mb-6">This post may have been moved or doesn't exist.</p>
          <a href="/blog" className="inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--accent)] hover:underline">
            <ArrowLeft size={14} /> Back to Blog
          </a>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <a href="/blog" className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--text-faint)] hover:text-[var(--text-primary)] transition-colors mb-6">
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
        <a href="/blog" className="text-sm font-semibold text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors">
          ← All posts
        </a>
        <a href="/" className="text-sm font-semibold text-[var(--accent)] hover:underline">
          Start your journal →
        </a>
      </div>
    </Shell>
  );
};
