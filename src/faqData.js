// Single source of truth for FAQ content — used by the landing page's FAQ
// section and the support widget's inline preview, so they can never drift
// out of sync with each other.
export const FAQS = [
  { q: "Is Strike Journal free to use?", a: "Yes — journaling, analytics, and the community are free to start. No credit card is required to sign up." },
  { q: "Do I need to be in a prop firm challenge to use this?", a: "No. The funding challenge tracker is optional. If you trade your own capital, you can skip it entirely and just use the journal, analytics, and risk gauges." },
  { q: "Which prop firms does the challenge tracker work with?", a: "You enter your firm's rules once — daily loss limit, max drawdown, profit target, and minimum trading days — and the app tracks compliance against those numbers in real time, so it works with any firm's rule set." },
  { q: "Is my trading data private?", a: "Your individual trades and P&L are private by default. You control what's public on your profile, including whether your stats appear on the leaderboard — that's off unless you opt in." },
  { q: "Can I use this on my phone?", a: "Yes, the app is fully responsive and works in any mobile browser. Log trades, check your gauges, and catch up on the community from your phone." },
  { q: "What is a daily loss limit in a prop firm challenge?", a: "A daily loss limit is the maximum amount a trader can lose in a single trading day before breaching their evaluation. It resets every trading day and is tracked separately from the overall max drawdown limit." },
  { q: "What is the difference between daily loss limit and max drawdown?", a: "Daily loss limit caps how much you can lose in one day and resets daily. Max drawdown caps how much your account can decline from its peak balance over the life of the whole challenge and does not reset. Breaching either one fails the evaluation." },
];
