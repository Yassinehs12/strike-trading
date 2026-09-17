import React, { useMemo, useState } from "react";
import {
  ArrowLeft, ArrowRight, Clock, Tag as TagIcon, Newspaper, Search, X,
  Shield, Brain, Repeat2, Megaphone, Award, TrendingUp, Mail, Check,
  BookOpen, BarChart3, Compass, LineChart,
} from "lucide-react";
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
    slug: "from-trading-data-to-a-real-trading-edge",
    title: "From Trading Data to a Real Trading Edge",
    excerpt: "Every closed trade adds a data point. Most traders never look back far enough to see what those points are actually telling them. Here's how to separate a real pattern from a random streak.",
    date: "2026-09-16",
    tags: ["Advanced Trading", "Data Analysis", "Strategy"],
    content: [
      { type: "p", text: "Somewhere between \"I feel like I trade better in the morning\" and \"I have a statistically meaningful edge trading the London open,\" there's a gap that only your own trade history can close. Most traders live entirely on the feeling side of that gap. Closing it doesn't require anything exotic — it requires enough logged trades and the discipline to look at them honestly." },
      { type: "h2", text: "What counts as a pattern, not an anecdote" },
      { type: "p", text: "A single strong week trading breakouts isn't a pattern — it's five or ten data points, which is roughly the sample size at which luck and skill are still indistinguishable. A pattern is something that shows up consistently across dozens of trades, ideally across more than one market condition. If you can't say how many trades a claim about your own trading is based on, treat the claim as a hypothesis, not a conclusion." },
      { type: "h2", text: "Where the real signal tends to hide" },
      { type: "p", text: "Once you have enough logged trades, a few cuts of the data tend to be worth checking on almost any trader's history:" },
      { type: "list", items: [
        "Performance by session — are your NY-session trades meaningfully different from your Asia-session trades?",
        "Performance by setup — is one setup carrying the account while another quietly drags on expectancy?",
        "Long vs. short performance — do you have a directional bias that's costing you, independent of the market's actual bias?",
        "Performance by day of week — some traders have a specific day where discipline consistently slips",
        "Average R by instrument — the same strategy can behave differently on XAU/USD than on a Nasdaq CFD",
      ] },
      { type: "p", text: "None of these need advanced statistics to check. They need the fields tagged consistently at the time you log the trade — setup, session, direction, instrument — because you can't slice data you never recorded." },
      { type: "h2", text: "A hypothetical worth walking through" },
      { type: "p", text: "Imagine a trader with 120 logged trades over four months. Sorting by session shows NY-session trades averaging +0.4R across 70 trades, while Asia-session trades average -0.3R across 50 trades. That's a meaningful sample on both sides — enough to take the Asia-session number seriously rather than write it off as a bad stretch. The next step isn't to swear off Asia-session trading forever; it's to look closer. Maybe the setups taken during that session are lower quality because the trader is tired. Maybe volatility during that window doesn't suit the strategy. The data points to where to look — it doesn't replace the looking." },
      { type: "h2", text: "The difference between random noise and a real edge" },
      { type: "p", text: "A real edge tends to show three things at once: it persists across a reasonably large sample, it holds up across more than one type of market condition, and there's a plausible reason it exists (a session with more liquidity for your instrument, a setup that matches how you actually trade under pressure). A random streak usually fails at least one of those — it's based on a handful of trades, it only worked in one specific stretch of the market, or nobody can explain why it would keep working." },
      { type: "quote", text: "The data doesn't hand you an edge. It hands you a shortlist of things worth testing on purpose instead of guessing about." },
      { type: "h2", text: "Turning the observation into a rule" },
      { type: "p", text: "Once a pattern clears that bar, it's worth turning into an explicit rule you can track compliance with — \"no new positions after 45 minutes into the Asia session\" is testable in a way that \"try to be more careful during Asia hours\" is not. Give the new rule its own sample size before deciding whether it worked; changing three things about your process at once and then looking at results a week later tells you almost nothing about which change mattered." },
      { type: "h2", text: "A common misread of the data" },
      { type: "p", text: "One mistake worth flagging: finding a pattern in the data doesn't automatically tell you which direction the fix should go. Poor performance in a given session could mean the session itself doesn't suit the strategy — or it could mean the trader is simply more tired, distracted, or rushed during that window, and a better-rested version of the same trader would perform fine there. The data narrows the search; it doesn't replace the judgment needed to interpret what it's actually pointing at." },
      { type: "p", text: "This is the actual payoff of consistent journaling — not a single dramatic insight, but a slow accumulation of evidence about your own trading that eventually outweighs how any single week felt. StrikeJournal's analytics are built around this exact workflow: tagging trades by setup, session, and instrument as you log them, so the slicing described above is a filter, not a spreadsheet project." },
    ],
  },
  {
    slug: "how-to-review-your-trading-week-like-a-pro",
    title: "How to Review Your Trading Week Like a Professional",
    excerpt: "A weekly review that actually changes how you trade next week needs more structure than scrolling back through your platform's trade history. Here's a framework you can run every weekend in under an hour.",
    date: "2026-09-11",
    tags: ["Performance", "Trading Journal", "Review"],
    content: [
      { type: "p", text: "Most traders review their week by feel — a vague sense of \"it was a rough week\" or \"that was decent,\" based mostly on how the last two trades went. That's not a review, it's a mood. A real weekly review looks at the same categories every time, in the same order, so patterns can accumulate across weeks instead of getting overwritten by whatever happened most recently." },
      { type: "p", text: "The framework below is deliberately structured as a checklist. Run through it every weekend, in order, and keep the notes somewhere you can compare against next week's." },
      { type: "h2", text: "1. Review total performance" },
      { type: "p", text: "Start with the plain numbers before any interpretation: total trades, win rate, net R, and biggest single win and loss. This is the baseline everything else gets compared against. Resist the urge to explain the numbers yet — just record them." },
      { type: "h2", text: "2. Review risk" },
      { type: "p", text: "Check whether your actual risk per trade matched your plan, and whether you stayed inside any daily or weekly loss limits you've set (or that a funding challenge requires). A profitable week built on oversized risk isn't a good week — it's a good outcome on a bad process, and the process is what determines next month, not this one." },
      { type: "h2", text: "3. Review your best trades" },
      { type: "p", text: "Pick the two or three best trades of the week and ask what made them good — not just that they made money, but whether the setup, entry, and risk sizing were actually sound. A trade can be lucky and profitable at the same time; the goal here is separating the two." },
      { type: "h2", text: "4. Review your worst trades" },
      { type: "p", text: "Do the same for the worst two or three. Losing isn't automatically a mistake — a correctly-sized loss on a valid setup is just the cost of trading. What's worth flagging is a loss where the setup wasn't there, the size was wrong, or the stop got moved after entry." },
      { type: "h2", text: "5. Identify rule violations" },
      { type: "p", text: "Go through the week's trades and mark any that broke a rule you'd set for yourself — oversized position, no stop loss defined before entry, entered outside your usual session, skipped the checklist. The count matters less than the trend: is this number going up or down compared to the last few weeks?" },
      { type: "h2", text: "6. Identify emotional patterns" },
      { type: "p", text: "If you're tagging emotional state at entry (worth doing even loosely — FOMO, revenge, confident, neutral), look for clusters. A string of FOMO-tagged trades on the same day, or several revenge-tagged trades following a loss, is worth naming explicitly rather than filing under \"rough week.\"" },
      { type: "h2", text: "7. Analyze your setups" },
      { type: "p", text: "Group the week's trades by setup type and look at which ones actually performed. It's common for one setup to be quietly carrying the week while another is a consistent drag — information that's invisible if you only look at overall P&L." },
      { type: "list", items: [
        "Total trades, win rate, net R, and biggest win/loss for the week",
        "Actual risk per trade vs. your plan, and any limit breaches",
        "What made the best trades good — process, not just outcome",
        "What made the worst trades bad — was it a mistake or just a loss",
        "Count of rule violations, and whether that count is trending down",
        "Any cluster of emotional-state tags worth naming",
        "Which setups actually performed this week",
      ] },
      { type: "quote", text: "A review that doesn't end in a decision is just journaling for its own sake." },
      { type: "h2", text: "8. Choose one improvement for next week" },
      { type: "p", text: "This is the step that actually closes the loop, and it's the one most reviews skip. Pick exactly one thing to change next week — not five. \"No trades in the first 15 minutes after a loss\" is a rule you can actually track compliance with. \"Be more disciplined\" is not. Write the one change down somewhere you'll see it before Monday's first trade, and check next weekend whether you actually followed it." },
      { type: "h2", text: "Why weekend timing matters" },
      { type: "p", text: "Running this review on a weekend, away from an open position and a live chart, matters more than it seems. A review done Friday evening while still holding a losing trade tends to get colored by whatever that trade is doing right now. Saturday or Sunday, with the week's trades closed and no immediate outcome pending, produces a calmer, more honest read of the same data — which is the entire point of separating review time from trading time in the first place." },
      { type: "p", text: "Doing this every week, even when the week was mediocre and there's nothing dramatic to report, is what turns a trading journal into an actual improvement system instead of a record of what already happened. The categories above map closely onto what StrikeJournal's weekly analytics view surfaces automatically, but the framework works just as well on paper if that's where you already track trades." },
    ],
  },
  {
    slug: "stop-changing-your-trading-strategy-every-week",
    title: "Why You Should Stop Changing Your Trading Strategy Every Week",
    excerpt: "Strategy hopping feels like optimization. Usually it's just a way to avoid finding out whether any single approach actually works, because you never give one enough trades to know.",
    date: "2026-09-06",
    tags: ["Strategy", "Trading Psychology"],
    content: [
      { type: "p", text: "There's a specific, recognizable cycle: a trader adopts a new strategy, loses three trades in a row, decides the strategy is broken, and moves to the next one. Repeat for months. From the inside it feels like diligent searching for the right approach. From the outside — and in the trade log — it usually looks like never giving any single approach enough trades to actually evaluate it." },
      { type: "h2", text: "Three losses in a row tells you almost nothing" },
      { type: "p", text: "A strategy with a genuine edge and a 45% win rate will still produce three-loss streaks with some regularity — that's just how a series of independent, moderately-likely events behaves over time. Abandoning the approach after that streak isn't a data-driven decision; it's a reaction to variance that would have happened even to a profitable strategy. The problem isn't that the trader is undisciplined about following the strategy — it's that they're evaluating it on a sample size too small to mean anything." },
      { type: "h2", text: "What a real sample size looks like" },
      { type: "p", text: "There's no single magic number, but most experienced traders and researchers treat anything under 30-50 trades as too small to draw firm conclusions from, and prefer 100+ where possible, especially for strategies with a lower win rate and larger average win. Ten trades tells you what happened over ten trades. It doesn't tell you what the strategy actually does over the conditions it's designed to trade." },
      { type: "h2", text: "Confirmation bias makes this worse" },
      { type: "p", text: "Once a trader has decided a strategy \"isn't working,\" every subsequent loss gets filed as confirmation and every win gets dismissed as luck. The reverse happens with a strategy they've decided to like. This isn't a character flaw — it's a well-documented pattern in how people evaluate evidence generally — but it means a trader's gut sense of whether a strategy is working is not a reliable substitute for actually tracking the numbers." },
      { type: "h2", text: "The search for a perfect strategy is the actual problem" },
      { type: "p", text: "Underneath a lot of strategy hopping is an assumption that somewhere out there is a strategy with no losing streaks — and that if the current one has a rough week, it must not be that strategy. Every strategy that works over time still loses regularly. A 55% win rate strategy loses 45% of the time; that's not a flaw to be engineered away, it's what the strategy looks like when it's working exactly as designed." },
      { type: "list", items: [
        "Decide the minimum sample size you'll evaluate a strategy on before you start trading it — and write the number down",
        "Track the strategy's results separately, so a bad week doesn't get blended into your overall numbers",
        "Expect losing streaks even from a strategy with real expectancy; that's normal, not disqualifying",
        "Change one variable at a time if you're adjusting a strategy — changing several makes it impossible to know what helped",
        "Judge the strategy on R and expectancy across the full sample, not on how the most recent few trades felt",
      ] },
      { type: "h2", text: "What to actually do instead" },
      { type: "p", text: "Before trading a new approach live, backtest or forward-test it on enough historical or simulated setups to have a rough sense of its expectancy. Once trading it live, commit to a minimum sample — say, 50 trades or three months, whichever comes first — before making a keep-or-drop decision, and track that strategy's trades with a tag so its numbers don't get lost inside your overall stats. If it's underperforming at that checkpoint, that's a legitimate, evidence-based reason to stop. A losing week three days in is not." },
      { type: "quote", text: "Switching strategies after a losing streak usually just resets the sample size back to zero on the next one." },
      { type: "h2", text: "A note on genuinely adapting a strategy" },
      { type: "p", text: "None of this means a strategy should never change. Markets shift, and a rule that worked well in a trending environment can reasonably need adjusting once conditions change for an extended period. The distinction is between a deliberate, tracked adjustment made after enough evidence and a reactive abandonment made after three bad trades in a row. The former is normal strategy development. The latter is usually just strategy hopping wearing a more reasonable-sounding excuse." },
      { type: "p", text: "Consistency doesn't mean picking the flashiest strategy and sticking to it out of stubbornness — it means giving any strategy a fair, honest sample before deciding whether it earns a place in your process. That decision is only possible if your journal actually separates results by strategy in the first place, which is worth setting up before you start testing the next idea, not after." },
    ],
  },
  {
    slug: "your-trading-journal-is-more-than-a-diary",
    title: "Your Trading Journal Is More Than a Diary",
    excerpt: "Writing down what happened after each trade is a start. The traders who improve fastest treat that same record as a performance database they can query, not just a diary they occasionally reread.",
    date: "2026-09-02",
    tags: ["Trading Journal", "Performance"],
    content: [
      { type: "p", text: "A diary records what happened. A performance database lets you ask it questions. Most trading journals start as the first and never become the second — they're a chronological list of trades with a short note on each, useful for remembering a specific day but not for spotting a pattern across three months of days." },
      { type: "h2", text: "The shift from recording to querying" },
      { type: "p", text: "The difference isn't really about the tool — a spreadsheet can be a real performance database if it's structured consistently, and a fancy app can still just be a diary if every entry is a paragraph of loose notes. What matters is whether the same fields are tagged the same way on every trade, so you can later filter and group by them. Setup, session, instrument, direction, and emotional state, tagged consistently, turn a list of anecdotes into something you can actually slice." },
      { type: "h2", text: "What becomes visible once you can query the data" },
      { type: "list", items: [
        "Setup statistics — which setups actually carry positive expectancy across enough trades to trust the number",
        "Session performance — whether your results genuinely differ between, say, the London and NY sessions",
        "Asset performance — whether the same strategy behaves the same way across the instruments you trade",
        "Emotional patterns — clusters of trades tagged FOMO or revenge, and how those trades perform relative to your baseline",
        "Rule violations — a trend line on how often you're actually following your own stated process",
        "Recurring mistakes — the same specific error (moved stop, oversized position, no setup) showing up across unrelated weeks",
      ] },
      { type: "p", text: "None of these show up by rereading old entries. They show up by grouping and comparing, which requires the underlying data to already be structured for it." },
      { type: "h2", text: "A short example" },
      { type: "p", text: "Imagine a trader who's been tagging setup type for three months and finally sorts trades by that field. Out of 90 trades, a CHoCH retest setup accounts for 40 trades at +0.6R average, while a breakout-continuation setup accounts for 35 trades at -0.2R average, with the remaining 15 being one-off setups with too few trades to judge. Nothing about that split would be visible from reading the entries in order — it only emerges once the setup field can be filtered on. The natural next step isn't necessarily to drop the breakout setup entirely; it's to look closer at whether it's the setup itself or the conditions it's usually taken in that's the actual problem." },
      { type: "h2", text: "Data-driven improvement is slower and more reliable than it sounds" },
      { type: "p", text: "This isn't a shortcut to a discovered edge in a weekend. It's closer to compound interest — a small amount of consistently structured data every day that becomes genuinely useful after a few months, at which point it starts answering questions that gut feeling never could. The traders who benefit most from this are rarely the ones with the most complex journaling setup; they're the ones who tag the same handful of fields on every single trade without skipping the boring ones." },
      { type: "quote", text: "A diary tells you what happened last Tuesday. A performance database tells you what happens on Tuesdays." },
      { type: "h2", text: "Making the habit sustainable" },
      { type: "h2", text: "Where this tends to break down" },
      { type: "p", text: "The most common failure point isn't choosing the wrong fields to track — it's inconsistency in how they're tagged. A setup logged as \"CHoCH retest\" on Monday and \"choch\" on Thursday will get treated as two different setups when the data is grouped later, quietly fragmenting a sample that was already small. Deciding on a fixed, short list of setup names, session labels, and emotional-state tags before you start — and sticking to that exact list — matters more than almost anything else about how the data is eventually structured." },
      { type: "p", text: "The fields worth tagging consistently are usually: setup, session, instrument, direction, emotional state at entry, and whether your process rules were followed. That's it — five or six fields, tagged the same way every time, beat a detailed paragraph written only when a trade feels notable. This is the specific gap StrikeJournal's journal is built to close: the same structured fields on every trade, automatically rolled into the setup, session, and pattern analytics described above, so building the database doesn't require a second spreadsheet running alongside the journal." },
    ],
  },
  {
    slug: "funding-challenges-without-overtrading",
    title: "How to Approach a Trading Funding Challenge Without Overtrading",
    excerpt: "The traders who fail funding challenges rarely lack skill. Most fail because the challenge's own rules — daily loss limits, minimum trading days, overall drawdown — get treated as background noise instead of active constraints.",
    date: "2026-08-29",
    tags: ["Funding Challenges", "Risk Management"],
    content: [
      { type: "p", text: "Funding challenges add a layer most retail trading doesn't have: rules about how you're allowed to lose, not just how much. A daily loss limit, a maximum overall drawdown, sometimes a minimum number of trading days — these turn trading into a constrained problem, and treating it like unconstrained trading with a bigger account is a common way to fail one." },
      { type: "p", text: "Every prop firm's rules are different, so nothing here should be read as a substitute for reading your specific challenge's terms closely. The categories below apply broadly, but the exact numbers and thresholds vary firm to firm." },
      { type: "h2", text: "Know your numbers before you place a trade" },
      { type: "p", text: "The single most common way traders fail a challenge isn't one catastrophic trade — it's a string of smaller losses that quietly cross the daily loss limit before anyone was tracking the running total closely enough. Before your trading day starts, know the exact dollar figure that ends it, not a rough percentage you'll calculate under pressure after two losses." },
      { type: "h2", text: "Overtrading tends to come from a specific place" },
      { type: "p", text: "Overtrading during a challenge is rarely random. It usually comes from one of a few sources: trying to hit the profit target faster than the plan allows, trying to recover a loss from earlier in the day, or filling a minimum-trading-days requirement by forcing trades on days without a real setup. Naming which of these is actually driving a specific overtrading episode is more useful than a generic \"trade less\" instruction." },
      { type: "list", items: [
        "Write down your exact daily loss limit in dollars before the session starts",
        "Decide your position sizing rules for the challenge in advance, and don't recalculate them mid-session",
        "Treat minimum trading day requirements as a pacing tool across the full evaluation window, not a rush at the end",
        "Set a personal stop-trading rule for the day — a loss count or dollar figure — separate from the firm's hard limit",
        "Track daily and overall drawdown usage after every closed trade, not from memory at day's end",
      ] },
      { type: "h2", text: "Passing quickly shouldn't be the goal" },
      { type: "p", text: "There's a natural pull to treat the challenge as a race — the faster you hit the profit target, the sooner you're funded. That framing pushes toward oversized positions and forced trades on marginal setups, which is exactly the behavior most challenge rules are designed to catch. A challenge passed slowly with normal position sizing and real setups is a far better predictor of how the funded account will go than one passed quickly by getting lucky on oversized risk." },
      { type: "quote", text: "The rules of a challenge aren't really the obstacle. Not tracking them in real time, trade by trade, usually is." },
      { type: "h2", text: "Consistency matters more than any single result" },
      { type: "p", text: "Funding firms that review trading behavior after a pass tend to look for consistency — position sizing that stays roughly the same trade to trade, a similar approach across winning and losing days, no single trade that accounts for most of the profit target. A challenge passed on one outsized trade, even if technically within the rules, is a weaker signal than several months of the same disciplined process, and it's a weaker foundation for actually trading the funded account well afterward." },
      { type: "h2", text: "What this looks like day to day" },
      { type: "p", text: "In practice, approaching a challenge without overtrading means the same routine every session: check your daily loss limit and current drawdown usage before the first trade, size positions the same way you would in a normal account, stop for the day once your personal loss limit is hit regardless of how the next setup looks, and let the minimum-days requirement pace itself out over the full evaluation window instead of getting crammed into the final week." },
      { type: "h2", text: "After the challenge is passed" },
      { type: "p", text: "The habits that get a challenge passed are the same ones that matter on the funded account afterward — arguably more, since real capital and payout structures raise the emotional stakes further. A trader who passed by tightening up for a few weeks and reverting to old habits once funded tends to run into the same drawdown limits again, just with more on the line. Treating the challenge's rules as a temporary hurdle rather than the ongoing standard is a common, avoidable way to lose a funded account shortly after earning it." },
      { type: "p", text: "None of this guarantees a pass — no approach can, and any claim otherwise should be treated with suspicion. What it does is remove the specific failure mode that catches most traders: breaching a rule nobody was actively watching in the moment. StrikeJournal's challenge tracker exists to keep those numbers — daily loss, overall drawdown, trading days completed — visible after every trade instead of reconstructed from memory at the end of a stressful session." },
    ],
  },
  {
    slug: "the-psychology-of-revenge-trading",
    title: "The Psychology of Revenge Trading",
    excerpt: "Revenge trading rarely feels like revenge from the inside — it feels like conviction. Understanding the actual mechanism behind it is more useful than knowing it's \"bad,\" which most traders already know and still can't stop doing in the moment.",
    date: "2026-08-27",
    tags: ["Trading Psychology"],
    content: [
      { type: "p", text: "Almost every trader who's done it can describe revenge trading accurately after the fact: sizing up after a loss, taking a setup that's slightly worse than usual, trying to \"get it back\" instead of following the plan. What's harder to explain is why knowing this doesn't stop it from happening again next time a loss stings enough." },
      { type: "h2", text: "What actually triggers it" },
      { type: "p", text: "Revenge trading is rarely triggered by losing money in the abstract — it's triggered by the specific feeling of a loss that felt avoidable, or that arrived right after a string of wins, or that happened on a setup the trader was especially confident in. The emotional charge comes less from the dollar amount and more from the story the loss seems to tell about the trader's competence in that moment." },
      { type: "h2", text: "The pattern, mechanically" },
      { type: "list", items: [
        "A loss occurs, especially one that felt unlucky or avoidable",
        "The trader looks for a way to be \"right\" again quickly, rather than accepting the loss as closed",
        "A marginal setup gets reframed as a good one, because the trader wants it to be",
        "Position size increases, often without a clear stated reason, to make up the deficit faster",
        "The new trade is entered from urgency rather than from the trader's actual process",
      ] },
      { type: "p", text: "None of these steps look dramatic individually. That's part of why it's so hard to self-catch in real time — each decision along the way feels locally reasonable, and it's only the pattern across several instances, viewed afterward, that makes the mechanism obvious." },
      { type: "h2", text: "Why willpower alone rarely fixes it" },
      { type: "p", text: "Telling yourself \"don't revenge trade\" works about as well as most rules that rely on remembering to apply them at the exact moment you're least equipped to. The urge runs on impulse and urgency, not on a lapse of information — the trader usually knows the setup is marginal and sizes up anyway. Fixing this with more willpower is asking the same mental state that produces the impulse to also be the thing that overrides it." },
      { type: "h2", text: "What tends to actually work" },
      { type: "p", text: "The more durable fixes are structural rather than motivational — rules that don't depend on being remembered under stress because they're enforced mechanically instead:" },
      { type: "list", items: [
        "A mandatory pause after any loss — some traders use a flat timer, others require a full checklist pass with no shortcuts",
        "A hard rule that position size can't increase within some window after a loss, regardless of conviction",
        "Physically stepping away from the screen for a set period rather than staying in front of the chart",
        "Logging the emotional state at entry, so the pattern becomes visible in the data even when it wasn't visible in the moment",
      ] },
      { type: "quote", text: "It rarely feels like revenge while it's happening. It feels like opportunity. That's exactly why it has to be caught in the data, not in the moment." },
      { type: "h2", text: "Seeing it in your own numbers" },
      { type: "p", text: "The turning point for most traders who eventually break this pattern isn't a realization that revenge trading is bad — they already knew that. It's seeing it laid out plainly in their own trade history: a cluster of loss-tagged trades taken within an hour of a prior loss, underperforming the baseline win rate by a wide, repeated margin. That's harder to argue with than a vague memory of \"a rough week,\" and it's usually what finally makes the mandatory-pause rule stick." },
      { type: "h2", text: "It shows up outside of losses too" },
      { type: "p", text: "Revenge trading is the most talked-about version of this mechanism, but the same emotional override can follow a big win — sizing up because a recent success feels like proof of skill, rather than a normal run of favorable variance. The trigger is different (a win instead of a loss) but the underlying pattern is the same: an emotional state quietly overriding a decision that would otherwise have been made calmly. Worth watching for both, not just the more obviously self-destructive one." },
      { type: "p", text: "This is one of the more concrete reasons emotional-state tagging is worth doing even loosely — not to moralize about feelings, but to give the pattern somewhere to become visible, since it rarely announces itself in the moment it's happening." },
    ],
  },
  {
    slug: "does-your-trading-strategy-actually-have-an-edge",
    title: "How to Know Whether Your Trading Strategy Actually Has an Edge",
    excerpt: "A handful of winning trades feels like proof. Statistically, it usually isn't. Here's what actually separates a real edge from a lucky stretch — and it has nothing to do with how confident the strategy feels.",
    date: "2026-08-25",
    tags: ["Strategy", "Performance"],
    content: [
      { type: "p", text: "\"This strategy is working\" is a claim that needs a sample size attached to mean anything. Five winning trades in a row could be a genuine edge showing up early, or it could be the entirely expected result of a 50/50 coin flip going your way for a while. Without knowing the sample, the two are indistinguishable — and confidence in the strategy tends to rise well before the sample size that would actually justify it." },
      { type: "h2", text: "Sample size is the foundation everything else sits on" },
      { type: "p", text: "There's no universal magic number, but treating anything below 30-50 trades as preliminary, and reserving real confidence for 100+ trades, is a reasonable default — especially for strategies with a lower win rate and larger average winner, where a losing streak of ten or more trades is entirely normal even for a strategy with real expectancy. The lower the win rate, the more trades you need before the numbers stabilize into something trustworthy." },
      { type: "h2", text: "Backtesting tells you the strategy is worth testing live, not that it works" },
      { type: "p", text: "A backtest establishes whether an idea is worth the time to test forward — it doesn't establish an edge on its own, because backtests are vulnerable to hindsight in ways that are easy to underestimate: fitting the rules slightly to what worked in that specific historical window, or defining entries with information that wasn't actually knowable at the time. A promising backtest is a reason to forward-test, not a reason to size up immediately." },
      { type: "h2", text: "Forward testing is where the real evidence comes from" },
      { type: "p", text: "Forward testing — trading the strategy live or on a demo account going forward, with rules fixed in advance — removes the hindsight problem, because every trade is a genuine out-of-sample test. This is slower and less exciting than backtesting a decade of history in an afternoon, but it's the only stage that actually tells you how the strategy performs under real, unknown-in-advance conditions." },
      { type: "h2", text: "The metric that matters most: expectancy" },
      { type: "p", text: "Win rate alone is close to meaningless without knowing average win and average loss size. Expectancy — (win rate × average win) minus (loss rate × average loss) — is what actually determines whether a strategy makes money over time. A strategy with a 35% win rate and an average win three times the average loss can be strongly profitable; a strategy with a 65% win rate and losses twice the size of wins can lose money steadily. Calculate expectancy before drawing any conclusion from win rate alone." },
      { type: "list", items: [
        "Treat conclusions from under 30-50 trades as preliminary, not evidence of an edge either way",
        "Use backtesting to decide what's worth forward-testing, not as proof of a working strategy",
        "Forward-test with rules fixed in advance — changing the rules mid-test invalidates the sample",
        "Calculate expectancy, not just win rate, before judging whether the strategy is working",
        "Check performance across more than one market condition before trusting the numbers",
      ] },
      { type: "h2", text: "Consistency across conditions" },
      { type: "p", text: "A strategy that performed well during a strongly trending month might simply be a trend-following approach that hasn't yet been tested in a ranging market. Before trusting a strategy's numbers, check whether the sample includes more than one type of market condition — trending, ranging, high and low volatility — since a strategy's edge is only as real as the range of conditions it's actually been tested across." },
      { type: "quote", text: "A few winning trades prove that the strategy can win. They don't prove that it will, on average, over the conditions it's meant to trade." },
      { type: "h2", text: "None of this promises profitability" },
      { type: "h2", text: "A quick sanity check before trusting any result" },
      { type: "p", text: "Before treating a strategy's numbers as settled, it's worth asking three plain questions: how many trades is this based on, has it been tested across more than one kind of market condition, and would the conclusion survive removing the single best and single worst trade from the sample? If the answer to any of those is uncomfortable, the honest response is to keep testing rather than to round the strategy up to \"proven.\"" },
      { type: "p", text: "Working through sample size, expectancy, and condition coverage doesn't guarantee a strategy will be profitable — it just gives you an honest, evidence-based answer to whether it has been, on the data available so far, rather than a guess based on how confident the last few trades made you feel. Logging every trade with the strategy tagged from day one is what makes this kind of check possible later without having to reconstruct the history from memory." },
    ],
  },
  {
    slug: "win-rate-isnt-enough-metrics-that-matter",
    title: "Win Rate Isn't Enough: The Trading Metrics You Should Actually Track",
    excerpt: "A 70% win rate sounds like success. It can still be a losing strategy. Here's the small set of metrics that actually tell you whether your trading is working, with simple numbers to show why win rate alone can mislead.",
    date: "2026-08-23",
    tags: ["Performance"],
    content: [
      { type: "p", text: "Win rate is the metric most traders check first, mostly because it's the easiest one to compute in your head. It's also, on its own, one of the least useful — a strategy can have an excellent win rate and still lose money, and a strategy with a mediocre win rate can be strongly profitable. The metrics below are what actually determine whether trading is working." },
      { type: "h2", text: "Average win and average loss" },
      { type: "p", text: "These two numbers, alongside win rate, are what make win rate meaningful in the first place. Imagine a strategy with a 70% win rate, where the average win is $40 and the average loss is $150. Over 100 trades: 70 wins × $40 = $2,800; 30 losses × $150 = $4,500. Net result: -$1,700, despite winning most of the time. Win rate told a good story; average win and loss told the real one." },
      { type: "h2", text: "R-multiple" },
      { type: "p", text: "R-multiple reframes every trade around what you actually risked, rather than the raw dollar figure. A $200 win on $100 risked is +2R; a $100 loss on $100 risked is -1R. This makes trades comparable to each other regardless of position size, and it's the basis for the next two metrics." },
      { type: "h2", text: "Expectancy" },
      { type: "p", text: "Expectancy is: (win rate × average win in R) − (loss rate × average loss in R). It's the single number that answers \"is this strategy profitable on average, per trade?\" A strategy with a 40% win rate, average win of +3R, and average loss of -1R has an expectancy of (0.4 × 3) − (0.6 × 1) = +0.6R per trade — solidly profitable despite losing most of the time. This is the metric that should carry the most weight when judging whether a strategy is working, more than win rate alone ever should." },
      { type: "h2", text: "Profit factor" },
      { type: "p", text: "Profit factor is gross profit divided by gross loss. A profit factor above 1 means the strategy made more than it lost overall; above 1.5-2 is generally considered healthy, though the right threshold depends on how the number was generated and over what sample size. Like the other ratios here, it means very little from a small number of trades." },
      { type: "h2", text: "Maximum drawdown" },
      { type: "p", text: "Maximum drawdown — the largest peak-to-trough decline in account balance — matters because it's what determines whether a strategy is survivable, not just whether it's profitable in the long run. A strategy that's profitable over a year but experiences a 40% drawdown along the way is a very different proposition, psychologically and practically, than one that's profitable with a 10% maximum drawdown." },
      { type: "list", items: [
        "Win rate alone can't tell you if a strategy is profitable — pair it with average win/loss size",
        "Expectancy — (win rate × avg win) minus (loss rate × avg loss) — is the core profitability metric",
        "Profit factor gives a quick health check on gross profit vs. gross loss",
        "Maximum drawdown tells you whether the strategy is survivable, not just profitable on paper",
        "Every ratio here needs a real sample size before it means anything — treat small-sample numbers as preliminary",
      ] },
      { type: "quote", text: "Win rate tells you how often you were right. Expectancy tells you whether being right that often actually pays." },
      { type: "h2", text: "Tracking these consistently" },
      { type: "h2", text: "A quick worked comparison" },
      { type: "p", text: "Consider two hypothetical strategies over 100 trades each. Strategy A: 65% win rate, average win +0.8R, average loss -1.2R. Expectancy: (0.65 × 0.8) − (0.35 × 1.2) = 0.52 − 0.42 = +0.10R per trade. Strategy B: 38% win rate, average win +2.5R, average loss -1R. Expectancy: (0.38 × 2.5) − (0.62 × 1) = 0.95 − 0.62 = +0.33R per trade. Strategy B loses far more often and still comes out well ahead on expectancy — which is exactly the kind of result that stays invisible if win rate is the only number being tracked." },
      { type: "p", text: "None of these metrics require complicated tools to calculate — a spreadsheet with risk amount, result, and outcome logged for every trade is enough to compute all five. What matters more than the tool is logging risk amount and result on every single trade, since expectancy and R-multiple are impossible to calculate retroactively if the risk figure was never recorded in the first place. This is exactly the data StrikeJournal's analytics view is built to surface automatically from your logged trades, rather than requiring a parallel spreadsheet." },
    ],
  },
  {
    slug: "fomo-in-trading-why-you-chase-trades",
    title: "FOMO in Trading: Why You Chase Trades and How to Stop",
    excerpt: "The trade you almost didn't take usually isn't the one that hurts. It's the one you jumped into late because the move was already happening and it felt like your last chance to be part of it.",
    date: "2026-08-21",
    tags: ["Trading Psychology", "Discipline"],
    content: [
      { type: "p", text: "FOMO in trading has a specific shape: the market moves without you, the move looks obvious in hindsight, and the fear of missing a second one just like it pushes you into an entry that's already late, without the setup you'd normally require. It's less about greed than about a very human aversion to watching something happen without you." },
      { type: "h2", text: "What it actually looks like in practice" },
      { type: "p", text: "FOMO entries share a few recognizable traits: they're usually taken well after the ideal entry point, they skip or shortcut whatever checklist the trader normally uses, and they're often justified in the moment with reasoning that would sound thin if said out loud — \"it's still got room to run\" or \"I don't want to miss this one too.\" The setup, if there was one, is usually being reverse-engineered to justify a decision that was really made emotionally first." },
      { type: "h2", text: "Where the pressure comes from" },
      { type: "p", text: "A few sources tend to feed FOMO specifically:" },
      { type: "list", items: [
        "Watching a move happen in real time on a chart, especially after having considered and passed on the setup earlier",
        "Social media and trading communities posting wins from a move you're not in, in real time",
        "A recent string of missed opportunities, real or perceived, that builds pressure to \"not miss the next one\"",
        "Boredom during quiet market conditions, which makes almost any movement feel like an opportunity",
      ] },
      { type: "p", text: "Social visibility of other people's wins deserves particular attention, because it turns a private trading decision into something that feels like it's being scored publicly and in real time — pressure that has nothing to do with whether the trade is actually good." },
      { type: "h2", text: "Why predefined setups are the actual fix" },
      { type: "p", text: "The most reliable defense against FOMO isn't willpower in the moment — it's not having a decision to make in the first place. A trader with a specific, written setup definition (these exact conditions, this exact confirmation, this session) either sees the conditions met or doesn't; there's no room for \"it still looks good\" to override a definition that was written down in advance, calmly, before the pressure of a live move was in play." },
      { type: "h2", text: "How journaling exposes the pattern" },
      { type: "p", text: "Tagging entries as FOMO (even loosely, based on gut sense at the time) turns a vague self-perception into a checkable pattern. Traders who do this often find the tag clusters around specific conditions — a particular session, a specific instrument that moves fast, certain hours when they're more likely to be scrolling rather than watching a clean setup form. Once the trigger condition is visible, it's something you can plan around directly, rather than trying to will away a feeling that shows up unpredictably." },
      { type: "quote", text: "The fix for FOMO isn't more discipline in the moment it happens. It's removing the moment where a decision has to be made under pressure at all." },
      { type: "h2", text: "Two practical exercises" },
      { type: "p", text: "First: for one week, every time you feel the urge to chase a move, write down the entry price you would have taken and don't take the trade. At the end of the week, review those hypothetical entries against what actually happened — most traders are surprised how often the \"missed\" move would have been a losing or breakeven entry anyway. Second: define your setup's entry window explicitly (for example, within X pips of a confirmed retest) and treat any entry outside that window as automatically disqualified, regardless of how convincing the move looks." },
      { type: "h2", text: "A note on missing genuinely good moves" },
      { type: "p", text: "Occasionally a missed move really would have been a great trade — that's a real cost, not an imagined one, and pretending otherwise isn't the goal here. The distinction that matters is between accepting that occasional cost as the price of a consistent process, versus trying to eliminate it entirely by chasing every move that starts to run without you. The first is sustainable. The second usually costs more, over time, than the moves it was trying to capture." },
      { type: "p", text: "Neither exercise removes the feeling of FOMO entirely — that's probably not realistic. What they do is separate the feeling from the decision, which is the part that actually costs money." },
    ],
  },
  {
    slug: "how-to-keep-a-trading-journal-that-actually-works",
    title: "How to Keep a Trading Journal That Actually Makes You Better",
    excerpt: "Most trading journals fail for the same reason most diets fail: too much friction, too much detail, no clear payoff until months in. Here's a version that's simple enough to actually stick with.",
    date: "2026-08-19",
    tags: ["Trading Journal"],
    content: [
      { type: "p", text: "The gap between traders who journal and traders who journal usefully is almost entirely about what gets recorded and how much friction it takes. A journal with twenty fields per trade gets abandoned within a month. A journal with five or six consistent fields, logged in under a minute, has a real chance of surviving long enough to become useful." },
      { type: "h2", text: "What's actually worth recording" },
      { type: "p", text: "Not everything that could be recorded needs to be. The fields below cover what's needed to later analyze setups, sessions, risk, and emotional patterns — which is most of what a journal is actually for." },
      { type: "list", items: [
        "Entry reason — the specific setup or condition that triggered the trade, in a few words",
        "Exit reason — stop hit, target hit, manually closed, and why if manual",
        "Market conditions — trending, ranging, high or low volatility, at a glance",
        "Emotional state at entry — confident, neutral, FOMO, revenge, tired — pick from a short fixed list rather than writing prose",
        "Risk amount and R-multiple result — what you actually risked and what you actually got, in R",
        "A screenshot of the setup at entry, if your platform makes this easy",
      ] },
      { type: "p", text: "Notice what's missing: a long narrative paragraph. That's optional, worth adding for trades that genuinely felt notable, but it shouldn't be the default for every single trade — that's exactly the friction that kills the habit by week three." },
      { type: "h2", text: "A worked example" },
      { type: "p", text: "Here's what one properly logged trade might look like, for illustration:" },
      { type: "list", items: [
        "Instrument: XAU/USD, Session: New York",
        "Setup: CHoCH retest at the 4H level, confirmed on the 15-minute",
        "Entry reason: liquidity sweep followed by confirmed change of character, retested cleanly",
        "Risk: $100 (1% of account)",
        "Exit: stop hit after price failed to hold the retest level",
        "Result: -1R (-$100)",
        "Emotional state at entry: neutral, followed checklist fully",
        "Note: correct setup, correct size — stopped out by normal noise, not a mistake",
      ] },
      { type: "p", text: "That last line is the actual point of tracking process separately from outcome — this was a losing trade and a good trade at the same time, and the journal is what preserves that distinction instead of letting the loss get filed simply as \"bad.\"" },
      { type: "h2", text: "Reviewing what you've logged" },
      { type: "p", text: "Logging without reviewing is only half the habit. A weekly review — not daily, which tends to turn into rumination after a loss rather than analysis — is enough to start noticing patterns: a setup underperforming, a session where discipline consistently slips, an emotional-state tag clustering around specific conditions. Monthly, it's worth zooming out further to see whether those weekly patterns are actually trends or were just noise in a given week." },
      { type: "quote", text: "The goal of a trading journal isn't to prove you're profitable. It's to make your own patterns visible to you before they cost you more money." },
      { type: "h2", text: "Making it sustainable" },
      { type: "h2", text: "A common trap: journaling only the losses" },
      { type: "p", text: "Many traders only feel the pull to journal in detail after a losing trade, when there's something to process. This quietly biases the whole record toward negative trades and makes the journal feel like a punishment rather than a tool — which is its own reason people abandon it. Logging winners with the same brief, consistent fields matters just as much, both for balance and because a win with a bad process (oversized, no real setup, got lucky) is exactly the kind of thing worth catching before it becomes a habit." },
      { type: "p", text: "The single biggest predictor of whether a journal survives past the first month is friction at the point of logging. If it takes opening a separate app, finding the right spreadsheet tab, and manually calculating R, you'll skip it on your busiest trading day — which tends to be exactly the day you most need the record. Wherever possible, log the trade the moment you're in it, before the outcome is known, so the setup notes stay honest rather than getting rewritten by hindsight once you know how the trade ended." },
    ],
  },
  {
    slug: "risk-management-the-part-beginners-ignore",
    title: "Risk Management: The Part of Trading Most Beginners Ignore",
    excerpt: "New traders spend most of their time looking for a better entry signal. Experienced traders spend more of theirs protecting the account from a single bad week — because a good strategy with poor risk management still fails.",
    date: "2026-08-17",
    tags: ["Risk Management"],
    content: [
      { type: "p", text: "Ask a beginner what they're working on and the answer is almost always about entries — a new indicator, a cleaner pattern, a better signal. Ask an experienced trader the same question and risk management comes up far more often, not because entries stop mattering, but because a mediocre entry with disciplined risk survives long enough to improve, while a great entry with careless risk eventually meets a losing streak it can't absorb." },
      { type: "h2", text: "Position sizing: the part that decides how much a mistake costs" },
      { type: "p", text: "Position size determines how much a single trade going wrong actually costs you — and it's calculated backward from your risk tolerance, not forward from how confident you feel. The formula is consistent regardless of instrument: decide the dollar risk (typically 0.5-2% of account balance per trade), find the stop distance between entry and stop loss, then divide the dollar risk by the stop distance to get position size. Picking a position size first and figuring out the stop afterward reverses the order and usually produces a stop that's convenient rather than technically correct." },
      { type: "h2", text: "Why 1% isn't a universal law" },
      { type: "p", text: "1% per trade is a reasonable, commonly cited default — but it's a starting point, not a rule handed down from anywhere authoritative. A trader with a long, tracked history of positive expectancy might reasonably run somewhat higher. Someone trading a funding challenge with a strict daily loss limit might need to run tighter than 1% simply to survive a normal bad stretch without breaching the rule. The right number depends on your actual constraints and track record, not a figure repeated in a forum thread." },
      { type: "h2", text: "Stop loss: where the trade idea is wrong, not where comfort runs out" },
      { type: "p", text: "A stop loss should sit at the point where the reason you took the trade is actually invalidated — a broken structure level, a failed retest — not at whatever distance happens to fit the position size you already wanted to take. Working backward from a stop loss to a size is correct order; picking the size first and then deciding the stop tends to put the stop in the wrong place for the wrong reason." },
      { type: "h2", text: "Risk/reward, and why it needs the stop to come first" },
      { type: "p", text: "Risk/reward ratio only means anything once the stop is placed correctly — a 3:1 target on a stop that's poorly placed is a made-up number, not a real edge. Once the stop reflects where the setup is genuinely wrong, comparing that distance to a realistic target gives an honest risk/reward figure worth acting on." },
      { type: "h2", text: "Drawdown: the number that determines survival" },
      { type: "p", text: "Maximum drawdown — the largest decline from a peak account balance — matters because it determines whether a losing streak is survivable, both financially and psychologically. Two strategies can have similar long-run profitability with very different drawdown profiles, and the one with the smaller drawdown is usually the one that's actually tradeable by a real person with real emotions, even if the other looks marginally better on a spreadsheet." },
      { type: "list", items: [
        "Calculate position size backward from your dollar risk and stop distance — not the other way around",
        "Treat 1% per trade as a reasonable default, not a universal rule for every trader and every account",
        "Place stops where the trade idea is actually wrong, not where the position size happens to run out of room",
        "Only trust a risk/reward ratio once the stop placement is genuinely correct",
        "Pay attention to maximum drawdown, not just long-run profitability — it determines whether a strategy is survivable",
      ] },
      { type: "quote", text: "A good strategy with poor risk management doesn't fail because the strategy was wrong. It fails because it was never given the chance to play out over enough trades." },
      { type: "h2", text: "Why this is the part that protects everything else" },
      { type: "h2", text: "A simple check most traders skip" },
      { type: "p", text: "A useful gut check: before entering a trade, write down in one line what would make you exit it early — not the stop loss level, but the reasoning. If you can't articulate that clearly in advance, it's often a sign the setup itself isn't well-defined, and no amount of risk management fixes an entry that was never really justified in the first place. Risk management protects a real edge from normal variance. It can't manufacture an edge that isn't there." },
      { type: "p", text: "Entries and setups determine whether individual trades are good. Risk management determines whether you're still trading in six months to find out whether your strategy actually works, because it's the thing standing between a normal losing streak and an account that can't recover from one. This is, not coincidentally, the exact area beginners tend to skip past fastest — it's less exciting than a new setup, and its cost is invisible until the specific week it isn't." },
    ],
  },
  {
    slug: "why-good-traders-still-break-their-own-rules",
    title: "Why Good Traders Still Break Their Own Rules",
    excerpt: "Knowing your strategy isn't the same as following it. The gap between the two is where FOMO, revenge trading, and overconfidence quietly do most of their damage — and it's rarely visible until you look at the data.",
    date: "2026-08-16",
    tags: ["Trading Psychology", "Discipline"],
    content: [
      { type: "p", text: "Nearly every trader who's struggled can describe their rules accurately — risk 1% per trade, only trade the setup, no revenge trades after a loss. Ask the same trader to pull up their last twenty trades and the rules on paper and the rules in practice often diverge in specific, recognizable ways. Knowing what to do and actually doing it under pressure are two different skills, and trading tends to expose the gap between them faster than almost anything else." },
      { type: "h2", text: "Emotional decision-making doesn't feel emotional from the inside" },
      { type: "p", text: "This is the core difficulty: a rule-breaking trade rarely feels like a rule-breaking trade while it's happening. It feels like conviction, opportunity, or a reasonable exception given the circumstances. The emotional override happens quietly, disguised as a normal trading decision, which is exactly why it survives repeated attempts to just \"try harder\" next time." },
      { type: "h2", text: "The usual suspects" },
      { type: "p", text: "A few specific patterns account for most rule-breaking in practice:" },
      { type: "list", items: [
        "FOMO — entering late on a move that's already happening, because missing it feels worse than a bad entry",
        "Revenge trading — sizing up or lowering setup standards immediately after a loss, trying to get it back",
        "Overconfidence — abandoning position sizing discipline after a winning streak, because recent success feels like proof of skill rather than a normal run of variance",
        "Boredom trading — taking a marginal setup during a quiet market simply because sitting still feels unproductive",
      ] },
      { type: "p", text: "Each of these has a different emotional trigger, but they share a mechanism: a decision made from an emotional state overriding a decision that was made calmly, in advance, without that pressure." },
      { type: "h2", text: "Discipline is a system, not a personality trait" },
      { type: "p", text: "It's tempting to frame this as a character issue — some traders are disciplined, others aren't. In practice, discipline holds up better when it's built into a system that doesn't rely on willpower at the exact moment willpower is weakest. A written, specific setup definition removes the decision about whether \"this looks good enough.\" A mandatory pause after a loss removes the window where revenge trading usually happens. A hard position-size cap removes the decision to size up after a win. The goal isn't to become a more disciplined person in the abstract — it's to need less discipline in the moments that matter most." },
      { type: "h2", text: "How journaling reveals the pattern" },
      { type: "p", text: "Most traders underestimate how often they break their own rules, because any single instance is easy to explain away as a reasonable exception. The pattern becomes much harder to argue with once it's visible across dozens of trades — a cluster of oversized positions right after losses, or a string of late entries tagged with excitement rather than a defined setup. Tagging rule adherence (followed the plan / didn't) on every trade, even simply, turns a vague self-impression into a number you can track improving or worsening over time." },
      { type: "quote", text: "Discipline isn't about never feeling the pull to break a rule. It's about building a process where that pull doesn't get the final decision." },
      { type: "h2", text: "What actually moves the needle" },
      { type: "p", text: "Traders who improve on this tend to make the same shift: instead of trying to feel differently in the moment, they change the moment itself — fewer live decisions under pressure, more decisions made calmly in advance and simply executed. A predefined setup, a predefined risk limit, a predefined cooldown after a loss. None of it removes the emotional pull entirely. It just removes the emotional pull's ability to be the one making the call." },
      { type: "h2", text: "It compounds slowly, not suddenly" },
      { type: "p", text: "Traders who close this gap rarely describe a single dramatic realization. More often it's a gradual shift — noticing the same pattern flagged three weeks in a row, finally taking the mandatory-pause rule seriously after seeing the data behind it, catching one FOMO entry before it happens instead of after. None of it feels significant in the moment. Over months, it's the difference between a trader who knows their rules and a trader who actually trades by them." },
      { type: "p", text: "This is also why a trading journal matters here specifically — not as a record of P&L, but as the mechanism that eventually makes an invisible pattern visible enough to actually fix." },
    ],
  },
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

/* ============================================================
   CATEGORY IDENTITY
   Every tag already present in POSTS gets a color + icon so the
   Blog reads as edited/curated rather than an undifferentiated
   list. Nothing here is per-article data — purely presentation.
   Add an entry when a genuinely new tag is introduced above;
   anything missing falls back to DEFAULT_CATEGORY_STYLE.
   ============================================================ */
const CATEGORY_STYLES = {
  "Habits": { icon: Repeat2, gradient: "linear-gradient(135deg, #4F7CFF 0%, #22233A 100%)" },
  "Risk Management": { icon: Shield, gradient: "linear-gradient(135deg, #F472B6 0%, #2A1E33 100%)" },
  "Psychology": { icon: Brain, gradient: "linear-gradient(135deg, #A855F7 0%, #201A33 100%)" },
  "Prop Firm": { icon: Award, gradient: "linear-gradient(135deg, #F59E0B 0%, #2A2416 100%)" },
  "Announcement": { icon: Megaphone, gradient: "linear-gradient(135deg, #22D3A5 0%, #142722 100%)" },
  "Trading Journal": { icon: BookOpen, gradient: "linear-gradient(135deg, #4F7CFF 0%, #182234 100%)" },
  "Performance": { icon: BarChart3, gradient: "linear-gradient(135deg, #22D3A5 0%, #10231d 100%)" },
  "Strategy": { icon: Compass, gradient: "linear-gradient(135deg, #F59E0B 0%, #241d10 100%)" },
  "Advanced Trading": { icon: LineChart, gradient: "linear-gradient(135deg, #A855F7 0%, #1c1730 100%)" },
};
const DEFAULT_CATEGORY_STYLE = { icon: TrendingUp, gradient: "linear-gradient(135deg, #4F7CFF 0%, #22233A 100%)" };

const categoryStyle = (tag) => CATEGORY_STYLES[tag] || DEFAULT_CATEGORY_STYLE;

/* Abstract, generative cover art — a faint candlestick/price-line motif
   over a category-tinted gradient. Purely decorative (no fabricated
   photos of screens, coins, or trading floors), consistent everywhere
   a given category appears. */
const CoverArt = ({ tag, className = "", compact = false }) => {
  const { icon: Icon, gradient } = categoryStyle(tag);
  // Deterministic "random" candlestick heights from the tag string so
  // the same category always renders the same silhouette.
  const seed = (tag || "").split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  const bars = Array.from({ length: 14 }, (_, i) => {
    const h = 20 + ((seed * (i + 3)) % 55);
    const up = (seed + i) % 2 === 0;
    return { h, up };
  });
  return (
    <div
      className={`relative overflow-hidden ${className}`}
      style={{ background: gradient }}
      aria-hidden="true"
    >
      <svg viewBox="0 0 280 100" preserveAspectRatio="none" className="absolute inset-0 w-full h-full opacity-40">
        {bars.map((b, i) => (
          <rect
            key={i}
            x={i * 20 + 4}
            y={100 - b.h}
            width={10}
            height={b.h}
            rx={1.5}
            fill={b.up ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.35)"}
          />
        ))}
      </svg>
      <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, rgba(0,0,0,0) 30%, rgba(0,0,0,0.35) 100%)" }} />
      <div className={`absolute ${compact ? "bottom-2 right-2" : "bottom-3 right-3"} rounded-lg bg-black/25 backdrop-blur-sm p-2`}>
        <Icon size={compact ? 14 : 18} className="text-white/90" />
      </div>
    </div>
  );
};

const Shell = ({ children, maxW = "max-w-2xl" }) => (
  <div className="blog-root min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
      .blog-root { font-family: 'Inter', ui-sans-serif, system-ui, sans-serif; }
      .blog-scrollbar-none::-webkit-scrollbar { display: none; }
      .blog-scrollbar-none { -ms-overflow-style: none; scrollbar-width: none; }
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

    <main>{children}</main>

    <footer className="border-t border-white/5 py-8 px-4 mt-8">
      <div className={`${maxW} mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[var(--text-faint)]`}>
        <span>© {new Date().getFullYear()} Strike Journal. All rights reserved.</span>
        <nav className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
          <a href="/blog" className="font-semibold uppercase tracking-wide text-[var(--text-faint)] hover:text-[var(--text-primary)] transition-colors">Blog</a>
          <a href="/changelog" className="font-semibold uppercase tracking-wide text-[var(--text-faint)] hover:text-[var(--text-primary)] transition-colors">Changelog</a>
          <a href="/privacy" className="font-semibold uppercase tracking-wide text-[var(--text-faint)] hover:text-[var(--text-primary)] transition-colors">Privacy Policy</a>
          <a href="/terms" className="font-semibold uppercase tracking-wide text-[var(--text-faint)] hover:text-[var(--text-primary)] transition-colors">Terms of Service</a>
        </nav>
      </div>
    </footer>
  </div>
);

/* ============================================================
   HERO
   ============================================================ */
const BlogHero = () => (
  <div className="relative overflow-hidden border-b border-white/10">
    <div
      className="absolute inset-0 opacity-[0.35]"
      style={{
        background: "radial-gradient(60% 80% at 15% 0%, rgba(79,124,255,0.18) 0%, rgba(0,0,0,0) 60%), radial-gradient(50% 70% at 85% 20%, rgba(168,85,247,0.16) 0%, rgba(0,0,0,0) 60%)",
      }}
      aria-hidden="true"
    />
    <div
      className="absolute inset-0 opacity-[0.05]"
      style={{
        backgroundImage: "linear-gradient(var(--text-faint) 1px, transparent 1px), linear-gradient(90deg, var(--text-faint) 1px, transparent 1px)",
        backgroundSize: "36px 36px",
      }}
      aria-hidden="true"
    />
    <div className="relative max-w-6xl mx-auto px-4 pt-14 pb-10 md:pt-20 md:pb-14">
      <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--accent)] mb-4">
        <Newspaper size={12} /> Strikejournal Insights
      </span>
      <h1 className="text-3xl sm:text-4xl md:text-[2.75rem] font-extrabold tracking-tight leading-[1.08] max-w-xl mb-4">
        Trade smarter.<br />Understand your edge.
      </h1>
      <p className="text-sm md:text-base text-[var(--text-tertiary)] max-w-lg leading-relaxed">
        Practical insights on trading psychology, risk management, strategy, and the habits that help traders improve.
      </p>
    </div>
  </div>
);

/* ============================================================
   CATEGORIES + SEARCH
   ============================================================ */
const CategoryBar = ({ categories, active, onSelect, query, onQueryChange }) => (
  <div className="sticky top-16 z-40 bg-[var(--bg-primary)]/85 backdrop-blur-md border-b border-white/10">
    <div className="max-w-6xl mx-auto px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3">
      <div className="flex items-center gap-2 overflow-x-auto blog-scrollbar-none -mx-1 px-1">
        {categories.map((cat) => {
          const isActive = cat === active;
          return (
            <button
              key={cat}
              onClick={() => onSelect(cat)}
              className={`shrink-0 whitespace-nowrap text-xs font-semibold px-3.5 py-1.5 rounded-full border transition-colors ${
                isActive
                  ? "text-white border-transparent"
                  : "text-[var(--text-tertiary)] border-[var(--border-primary)] hover:text-[var(--text-primary)] hover:border-[var(--border-secondary)]"
              }`}
              style={isActive ? { background: "var(--accent-gradient)" } : undefined}
              aria-pressed={isActive}
            >
              {cat}
            </button>
          );
        })}
      </div>

      <div className="relative sm:ml-auto sm:w-56 shrink-0">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-faint)]" />
        <input
          type="text"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="Search articles..."
          aria-label="Search articles"
          className="w-full text-xs bg-[var(--card-bg)] border border-[var(--border-primary)] rounded-full pl-8 pr-8 py-2 text-[var(--text-primary)] placeholder:text-[var(--text-faint)] focus:outline-none focus:border-[var(--accent)]/60 focus:ring-2 focus:ring-[var(--accent)]/15 transition-colors"
        />
        {query && (
          <button
            onClick={() => onQueryChange("")}
            aria-label="Clear search"
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-faint)] hover:text-[var(--text-primary)] transition-colors"
          >
            <X size={13} />
          </button>
        )}
      </div>
    </div>
  </div>
);

/* ============================================================
   FEATURED ARTICLE
   ============================================================ */
const FeaturedPost = ({ post }) => (
  <a href={`/blog/${post.slug}`} className="group block">
    <span className="inline-block text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--accent)] mb-3">Featured</span>
    <div className="grid md:grid-cols-2 gap-0 rounded-2xl overflow-hidden border border-[var(--card-border)] bg-[var(--card-bg)] transition-colors group-hover:border-[var(--accent)]/40" style={{ boxShadow: "var(--card-shadow)" }}>
      <CoverArt tag={post.tags?.[0]} className="h-56 md:h-full min-h-[220px]" />
      <div className="p-6 md:p-8 flex flex-col justify-center">
        {post.tags?.[0] && (
          <span className="text-[11px] font-bold uppercase tracking-wide text-[var(--accent)] mb-2.5">{post.tags[0]}</span>
        )}
        <h2 className="text-xl md:text-2xl font-extrabold tracking-tight leading-snug mb-2.5 group-hover:text-[var(--accent)] transition-colors">
          {post.title}
        </h2>
        <p className="text-sm text-[var(--text-tertiary)] leading-relaxed mb-4 line-clamp-3">{post.excerpt}</p>
        <div className="flex items-center gap-3 text-xs text-[var(--text-faint)] mb-4">
          <span>{readTime(post.content)} min read</span>
          <span>·</span>
          <span>{formatDate(post.date)}</span>
        </div>
        <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--accent)]">
          Read article <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
        </span>
      </div>
    </div>
  </a>
);

/* ============================================================
   ARTICLE CARD (grid)
   ============================================================ */
const PostCard = ({ post }) => (
  <a href={`/blog/${post.slug}`} className="group block h-full">
    <div
      className="h-full flex flex-col rounded-xl overflow-hidden border border-[var(--card-border)] bg-[var(--card-bg)] transition-all duration-200 group-hover:border-[var(--accent)]/40 group-hover:-translate-y-0.5"
      style={{ boxShadow: "var(--card-shadow)" }}
    >
      <div className="overflow-hidden">
        <CoverArt tag={post.tags?.[0]} className="h-36 transition-transform duration-300 group-hover:scale-[1.04]" compact />
      </div>
      <div className="p-5 flex flex-col flex-1">
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          {post.tags?.map((t) => (
            <span key={t} className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[var(--accent)]/10 text-[var(--accent)] border border-[var(--accent)]/20">
              <TagIcon size={9} /> {t}
            </span>
          ))}
        </div>
        <h3 className="text-[15px] font-bold leading-snug mb-1.5 group-hover:text-[var(--accent)] transition-colors">
          {post.title}
        </h3>
        <p className="text-[13px] text-[var(--text-tertiary)] leading-relaxed mb-3 line-clamp-2 flex-1">{post.excerpt}</p>
        <div className="flex items-center gap-2 text-[11px] text-[var(--text-faint)] pt-3 border-t border-white/5">
          <span className="flex items-center gap-1"><Clock size={10} /> {readTime(post.content)} min read</span>
          <span>·</span>
          <span>{formatDate(post.date)}</span>
        </div>
      </div>
    </div>
  </a>
);

/* ============================================================
   EMPTY STATE
   ============================================================ */
const EmptyState = ({ onClear }) => (
  <div className="flex flex-col items-center text-center py-16 px-4">
    <div className="w-11 h-11 rounded-full flex items-center justify-center bg-[var(--card-bg)] border border-[var(--border-primary)] mb-4">
      <Search size={16} className="text-[var(--text-faint)]" />
    </div>
    <h3 className="text-base font-bold mb-1">No articles found</h3>
    <p className="text-sm text-[var(--text-faint)] mb-5">Try a different search term or category.</p>
    <button
      onClick={onClear}
      className="text-sm font-semibold text-[var(--accent)] hover:underline"
    >
      Clear filters
    </button>
  </div>
);

/* ============================================================
   NEWSLETTER
   ============================================================ */
const Newsletter = () => {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    // No newsletter backend is wired up yet — this only reflects the
    // UI state locally rather than pretending a subscription happened.
    setSubmitted(true);
  };

  return (
    <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-6 md:p-10 text-center" style={{ boxShadow: "var(--card-shadow)" }}>
      <div className="w-10 h-10 rounded-full mx-auto flex items-center justify-center mb-4" style={{ background: "var(--accent-gradient)" }}>
        <Mail size={16} className="text-white" />
      </div>
      <h2 className="text-xl md:text-2xl font-extrabold tracking-tight mb-2">Get better at trading.</h2>
      <p className="text-sm text-[var(--text-tertiary)] max-w-sm mx-auto mb-6">
        One useful trading insight delivered to your inbox. No noise. No hype.
      </p>
      {submitted ? (
        <div className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--accent)]">
          <Check size={16} /> You're on the list.
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row items-center gap-2.5 max-w-sm mx-auto">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Your email address"
            aria-label="Email address"
            className="w-full text-sm bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-lg px-3.5 py-2.5 text-[var(--text-primary)] placeholder:text-[var(--text-faint)] focus:outline-none focus:border-[var(--accent)]/60 focus:ring-2 focus:ring-[var(--accent)]/15 transition-colors"
          />
          <button
            type="submit"
            className="w-full sm:w-auto shrink-0 text-sm font-bold text-white px-5 py-2.5 rounded-lg transition-opacity hover:opacity-90"
            style={{ background: "var(--accent-gradient)" }}
          >
            Subscribe
          </button>
        </form>
      )}
    </div>
  );
};

/* ============================================================
   STRIKEJOURNAL CTA
   ============================================================ */
const JournalCta = () => (
  <div className="text-center py-10">
    <h2 className="text-xl md:text-2xl font-extrabold tracking-tight mb-2 max-w-md mx-auto leading-snug">
      Don't just read about your trading. Start understanding it.
    </h2>
    <p className="text-sm text-[var(--text-tertiary)] max-w-sm mx-auto mb-6">
      Journal your trades, track your performance, and discover the patterns behind your results.
    </p>
    <a
      href="/"
      className="inline-flex items-center gap-1.5 text-sm font-bold text-white px-5 py-2.5 rounded-lg transition-opacity hover:opacity-90"
      style={{ background: "var(--accent-gradient)" }}
    >
      Start Journaling <ArrowRight size={14} />
    </a>
  </div>
);

/* ============================================================
   BLOG LIST PAGE
   ============================================================ */
export const BlogListPage = () => {
  usePageMeta({
    title: "Blog",
    description: "Notes on trading, prop firm challenges, and building a trading journal that actually gets used — from the Strike Journal team.",
    path: "/blog",
  });

  const [active, setActive] = useState("All");
  const [query, setQuery] = useState("");

  const categories = useMemo(() => {
    const tags = new Set();
    POSTS.forEach((p) => p.tags?.forEach((t) => tags.add(t)));
    return ["All", ...Array.from(tags)];
  }, []);

  const isDefaultView = active === "All" && query.trim() === "";

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return POSTS.filter((p) => {
      const matchesCategory = active === "All" || p.tags?.includes(active);
      const matchesQuery =
        !q ||
        p.title.toLowerCase().includes(q) ||
        p.excerpt.toLowerCase().includes(q) ||
        p.tags?.some((t) => t.toLowerCase().includes(q));
      return matchesCategory && matchesQuery;
    });
  }, [active, query]);

  const featured = isDefaultView ? filtered[0] : null;
  const rest = featured ? filtered.slice(1) : filtered;

  const clearFilters = () => {
    setActive("All");
    setQuery("");
  };

  return (
    <Shell maxW="max-w-6xl">
      <BlogHero />
      <CategoryBar categories={categories} active={active} onSelect={setActive} query={query} onQueryChange={setQuery} />

      <div className="max-w-6xl mx-auto px-4 py-10 md:py-12">
        {filtered.length === 0 ? (
          <EmptyState onClear={clearFilters} />
        ) : (
          <>
            {featured && (
              <div className="mb-10 md:mb-14">
                <FeaturedPost post={featured} />
              </div>
            )}

            {rest.length > 0 && (
              <>
                <h2 className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--text-faint)] mb-5">
                  {isDefaultView ? "Latest Insights" : `${filtered.length} article${filtered.length === 1 ? "" : "s"}`}
                </h2>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {rest.map((post) => <PostCard key={post.slug} post={post} />)}
                </div>
              </>
            )}
          </>
        )}

        <div className="my-14 md:my-16">
          <Newsletter />
        </div>

        <JournalCta />
      </div>
    </Shell>
  );
};

/* ============================================================
   ARTICLE CONTENT BLOCKS
   ============================================================ */
const Block = ({ block }) => {
  switch (block.type) {
    case "h2":
      return <h2 className="text-lg md:text-xl font-bold text-[var(--text-primary)] mt-9 mb-3.5 tracking-tight">{block.text}</h2>;
    case "list":
      return (
        <ul className="list-disc pl-5 space-y-2 mb-5">
          {block.items.map((item, i) => (
            <li key={i} className="text-[15px] text-[var(--text-tertiary)] leading-[1.75]">{item}</li>
          ))}
        </ul>
      );
    case "quote":
      return (
        <blockquote className="border-l-2 border-[var(--accent)] pl-5 py-1.5 my-6 text-[var(--text-primary)] italic text-base leading-relaxed">
          {block.text}
        </blockquote>
      );
    case "cta":
      return (
        <a href={block.href} className="block my-7 rounded-xl border border-[var(--border-primary)] px-4 py-3.5 text-sm font-semibold text-[var(--accent)] hover:underline hover:border-[var(--accent)]/40 transition-colors" style={{ backgroundColor: "var(--card-bg)" }}>
          {block.text} →
        </a>
      );
    default:
      return <p className="text-[15px] text-[var(--text-tertiary)] leading-[1.75] mb-5">{block.text}</p>;
  }
};

/* ============================================================
   RELATED ARTICLES
   ============================================================ */
const RelatedArticles = ({ current }) => {
  const related = useMemo(() => {
    return POSTS
      .filter((p) => p.slug !== current.slug && p.tags?.some((t) => current.tags?.includes(t)))
      .slice(0, 3);
  }, [current]);

  if (related.length === 0) return null;

  return (
    <div className="mt-14 pt-10 border-t border-white/10">
      <h2 className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--text-faint)] mb-5">Continue learning</h2>
      <div className="grid sm:grid-cols-3 gap-4">
        {related.map((post) => <PostCard key={post.slug} post={post} />)}
      </div>
    </div>
  );
};

/* ============================================================
   BLOG POST PAGE
   ============================================================ */
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
        <div className="max-w-2xl mx-auto px-4 py-14 flex flex-col items-center text-center">
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
      <div className="max-w-2xl mx-auto px-4 py-10 md:py-14">
        <a href="/blog" className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--text-faint)] hover:text-[var(--text-primary)] transition-colors mb-6">
          <ArrowLeft size={12} /> All posts
        </a>

        {post.tags?.[0] && (
          <span className="inline-block text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--accent)] mb-3">
            {post.tags[0]}
          </span>
        )}

        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight leading-tight mb-3">{post.title}</h1>
        <p className="text-base text-[var(--text-tertiary)] leading-relaxed mb-5">{post.excerpt}</p>

        <div className="flex items-center gap-3 text-xs text-[var(--text-faint)] mb-6">
          <span>{formatDate(post.date)}</span>
          <span className="flex items-center gap-1"><Clock size={11} /> {readTime(post.content)} min read</span>
        </div>

        <CoverArt tag={post.tags?.[0]} className="h-48 md:h-64 rounded-xl mb-8" />

        <article>
          {post.content.map((block, i) => <Block key={i} block={block} />)}
        </article>

        <div className="flex flex-wrap items-center gap-2 mt-8 pt-6 border-t border-white/10">
          {post.tags?.map((t) => (
            <span key={t} className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-[var(--accent)]/10 text-[var(--accent)] border border-[var(--accent)]/20">
              <TagIcon size={10} /> {t}
            </span>
          ))}
        </div>

        <RelatedArticles current={post} />

        <div className="mt-10 pt-8 border-t border-white/10 flex items-center justify-between">
          <a href="/blog" className="text-sm font-semibold text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors">
            ← All posts
          </a>
          <a href="/" className="text-sm font-semibold text-[var(--accent)] hover:underline">
            Start your journal →
          </a>
        </div>
      </div>
    </Shell>
  );
};
