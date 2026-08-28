import React, { useState, useMemo, useEffect, useRef } from "react";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import {
  LayoutDashboard, ShieldCheck, BookOpen, BarChart3, Plus, X, Search,
  TrendingUp, Percent, Target, Activity, CheckCircle2,
  XCircle, AlertTriangle, ChevronLeft, ChevronRight, Filter,
  Wallet, Flame, Menu, ArrowUpRight, ArrowDownRight, Trash2, Gauge, Link2,
  Table2, LayoutGrid, Download, Settings as SettingsIcon, Banknote,
  Award, Clock, CalendarDays, CalendarClock, Loader2, Upload, Image as ImageIcon, Folder, Grid3x3, FileText, Sparkles,
  ArrowUpDown, CheckCircle, Info, Pencil, Mail, Lock, LogOut, Eye, EyeOff, MessagesSquare, UserCircle, Bell, Check, ShieldAlert, Ban, Trophy, Star, BookMarked, Copy, Shield, KeyRound, Palette, BellRing, Calculator, Plug, Share2, RefreshCw, NotebookPen,
  AtSign, CheckCheck, UserPlus, MessageCircle, Megaphone, Inbox, ChevronDown,
} from "lucide-react";
import { supabase, setKeepSignedIn } from "./supabaseClient";
import { fetchTrades, fetchChallenges, insertTrade, updateTradeDB, deleteTradeDB, insertChallenge, updateChallengeDB, deleteChallengeDB, fetchProfile, createProfile, updateProfileUsername, fetchPendingFriendRequests, subscribeToFriendRequests, acceptFriendRequest, fetchNotifications, markNotificationRead, markAllNotificationsRead, subscribeToNotifications, setLeaderboardOptIn, submitTradeSpotlight, applyReferralCode, setShowPublicStats, fetchTradingAccounts, insertTradingAccount, updateTradingAccount, deleteTradingAccount, fetchSnapTradeAccounts, getSnapTradeConnectUrl, syncSnapTradeAccounts, disconnectSnapTradeAccount, disconnectAllSnapTrade } from "./db";
import { badgeFromKey } from "./Badges";
import { computePsychologyReport } from "./psychology";
import { filterTradesByPeriod } from "./insights";
import LandingPage from "./LandingPage";
import { InstallBanner, InstallMenuItem, IOSInstallModal } from "./InstallPrompt";
import { joinPresence, leavePresence } from "./lib/presence";
import { PrivacyPolicy, TermsOfService } from "./LegalPages";
import PricingPage from "./PricingPage";
import ChangelogPage from "./ChangelogPage";
import ReportCardPage from "./ReportCardPage";
import { BlogListPage, BlogPostPage } from "./BlogPage";
import CalculatorPage from "./CalculatorPage";
import PositionCalculatorPage from "./pages/PositionCalculatorPage";
import PositionSizeCalculatorPublic from "./pages/PositionSizeCalculatorPublic";
import RiskToolsPage from "./RiskToolsPage";
import CorrelationPage from "./CorrelationPage";
import ForumPage from "./ForumPage";
import ProfilePage from "./ProfilePage";
import MessagesPage from "./MessagesPage";
import FriendsPage from "./FriendsPage";
import AdminPanel from "./AdminPanel";
import SupportChatWidget from "./SupportChatWidget";
import AdminBadge from "./AdminBadge";
import LeaderboardPage from "./LeaderboardPage";
import GoalsPage from "./GoalsPage";
import JournalingPage from "./JournalingPage";
import NotebookPage from "./NotebookPage";
import MarketPlanPage from "./MarketPlanPage";
import UserProfileModal from "./UserProfileModal";
import { LogoFull } from "./Logo";
import ThemeToggle from "./ThemeToggle.jsx";

import { Sidebar, TopBar } from "./components/shell/Shell";
import { LogTradeModal, TradeDrawer } from "./components/trades/TradeComponents";
import { Card, GlobalStyle, LoadingScreen, ToastContainer, ToastContext, UpgradeGate } from "./components/ui/Primitives";
import { tabFromPath } from "./constants";
import { isProPlan } from "./lib/plan";
import { computeChallengeStats } from "./lib/tradeCalculations";
import { AnalyticsPage } from "./pages/AnalyticsPage";
import { AuthPage, ProfileSetup, ResetPasswordScreen } from "./pages/AuthPage";
import { ChallengesPage } from "./pages/ChallengesPage";
import { DashboardPage } from "./pages/DashboardPage";
import { EconomicCalendarPage } from "./pages/EconomicCalendarPage";
import { JournalPage } from "./pages/JournalPage";
import { MarketHeatmapsPage } from "./pages/MarketHeatmapsPage";
import { SettingsPage } from "./pages/SettingsPage";

export default function App() {
  const [session, setSession] = useState(undefined); // undefined = checking, null = signed out
  const [profile, setProfile] = useState(undefined); // undefined = checking, null = needs onboarding
  const [authReady, setAuthReady] = useState(false); // true once the initial Supabase auth check has resolved at least once — guards against a transient null session flashing the onboarding screen
  const [profileFetchError, setProfileFetchError] = useState("");
  const [profileRetryKey, setProfileRetryKey] = useState(0);
  const [showAuth, setShowAuth] = useState(false);
  const [trades, setTrades] = useState([]);
  const [challenges, setChallenges] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [active, setActive] = useState(tabFromPath);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [logModalOpen, setLogModalOpen] = useState(false);
  const [selectedTrade, setSelectedTrade] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toasts, setToasts] = useState([]);
  const [settings, setSettings] = useState({ currency: "USD", timezone: "UTC", defaultRiskPct: 1, minTradingDays: 10 });
  const [viewingUserId, setViewingUserId] = useState(null);

  const [dataError, setDataError] = useState("");
  const [passwordRecovery, setPasswordRecovery] = useState(false);

  // Standalone pages (Privacy Policy, Terms, Blog, Pricing, public report
  // cards) are accessible via plain paths like /privacy or /u/username,
  // regardless of auth state, so they render before any of the
  // session/auth branching below.
  const legalFromPath = () => {
    const raw = window.location.pathname.replace(/^\/+/, "").split(/[?#]/)[0];
    if (raw === "privacy") return "privacy";
    if (raw === "terms") return "terms";
    if (raw === "changelog") return "changelog";
    if (raw === "blog") return "blog";
    if (raw === "pricing") return "pricing";
    if (raw === "tools/position-size-calculator") return "position-size-calculator";
    if (raw.startsWith("blog/")) return "blog-post";
    if (raw.startsWith("u/")) return "report-card";
    return null;
  };
  const [legalPage, setLegalPage] = useState(legalFromPath);

  // Intercept clicks on same-origin, path-based links (href="/somewhere")
  // and route them through pushState instead of letting the browser do a
  // full page reload — this is what makes plain "/pricing"-style URLs work
  // as an SPA without a router dependency. Hash-fragment anchors like
  // "#features" on the landing page are left alone.
  useEffect(() => {
    const onClick = (e) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = e.target.closest("a");
      if (!a) return;
      const href = a.getAttribute("href");
      if (!href || !href.startsWith("/") || href.startsWith("//")) return;
      if (a.target && a.target !== "_self") return;
      e.preventDefault();
      if (window.location.pathname + window.location.search !== href) {
        window.history.pushState(null, "", href);
        window.dispatchEvent(new PopStateEvent("popstate"));
      }
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  // Keep the URL path in sync with the active tab, so refreshing (or sharing
  // a link) lands back on the same page instead of resetting to dashboard.
  // Only applies once signed in — on the logged-out landing page, the hash
  // is used for anchor links (#features, #faq, etc.) instead.
  useEffect(() => {
    if (!session) return;
    if (/access_token|type=recovery|error=/.test(window.location.hash)) return;
    // Standalone routes (public report cards, legal pages, changelog) manage
    // their own URL — don't let the dashboard-tab sync stomp on them.
    if (legalFromPath()) return;
    const target = `/${active}`;
    if (window.location.pathname !== target) window.history.pushState(null, "", target);
  }, [active, session?.user?.id]);

  // Support the browser's back/forward buttons switching tabs (and legal
  // pages) too, plus the synthetic popstate dispatched by the click
  // interceptor above.
  useEffect(() => {
    if (session?.user?.id) joinPresence(session.user.id);
    else leavePresence();
  }, [session?.user?.id]);

  useEffect(() => {
    const onPopState = () => { setActive(tabFromPath()); setLegalPage(legalFromPath()); };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  useEffect(() => {
    if (!session?.user) { if (session === null) setLoading(false); return; }
    setLoading(true);
    Promise.all([fetchTrades(), fetchChallenges(), fetchTradingAccounts(session.user.id)])
      .then(([t, c, a]) => { setTrades(t); setChallenges(c); setAccounts(a); setDataError(""); })
      .catch((err) => setDataError(err.message || "Failed to load your data."))
      .finally(() => setLoading(false));
    // Deliberately keyed on the user id, not the whole session object.
    // Supabase's client silently re-validates/refreshes the session every
    // time the tab regains focus, which produces a new session object even
    // when the logged-in user hasn't changed. Keying this on [session]
    // caused every page's data to visibly refetch/reload each time you
    // switched back to the tab. Keying on the id means this only reruns on
    // an actual login/logout/account switch.
  }, [session?.user?.id]);

  useEffect(() => {
    if (!authReady) return; // don't trust a session of null until the initial auth check has actually resolved — otherwise a transient null during login briefly flashes the "set username & age" onboarding screen before the real session settles in
    if (!session?.user) { setProfile(session === null ? null : undefined); return; }
    let cancelled = false;
    // A profile row can take a few seconds to become reliably readable right
    // after sign-in — this was making fetchProfile return null for accounts
    // that already have a profile, which flashed the "Complete your profile"
    // onboarding screen before the real data arrived a moment later. Retry
    // repeatedly (showing the loading spinner, not the onboarding form)
    // before ever concluding "this account has no profile."
    const load = (attemptsLeft) => {
      fetchProfile(session.user.id)
        .then((p) => {
          if (cancelled) return;
          if (p == null && attemptsLeft > 0) { setTimeout(() => !cancelled && load(attemptsLeft - 1), 500); return; }
          setProfile(p);
          setProfileFetchError("");
        })
        .catch((err) => { if (!cancelled) setProfileFetchError(err.message || "Failed to load your profile."); });
    };
    load(8); // up to ~4s of retrying before treating a null result as final
    return () => { cancelled = true; };
    // Same reasoning as the trades/challenges effect above — keyed on the
    // user id so a focus-triggered session refresh doesn't restart this
    // whole retry sequence and re-flash the loading state on every tab
    // switch back.
  }, [session?.user?.id, profileRetryKey, authReady]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { setSession(data.session ?? null); setAuthReady(true); });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      // Supabase fires SIGNED_OUT with newSession = null not just on a
      // deliberate sign-out, but also when a refresh token is rejected —
      // e.g. two tabs/devices on the same account both trying to refresh
      // around the same time (one wins, the other gets "invalid_grant").
      // Treating that the same as a real sign-out force-kicks the user
      // back to the login screen for a race condition that isn't their
      // fault. Instead, if we currently believe we have a session and the
      // library says otherwise, try a manual refresh once before trusting
      // it — a genuine sign-out will still resolve to null and log out.
      if (_event === "SIGNED_OUT" && !newSession && session?.user) {
        supabase.auth.refreshSession().then(({ data }) => {
          setSession(data?.session ?? null);
          setAuthReady(true);
        });
        return;
      }
      setSession(newSession);
      setAuthReady(true);
      if (_event === "PASSWORD_RECOVERY") setPasswordRecovery(true);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    leavePresence();
    // Without this, the URL stays on whatever tab was open (e.g.
    // /dashboard) even though the page now shows the logged-out landing
    // page — confusing on refresh or when sharing the URL.
    window.history.pushState(null, "", "/");
    setActive("dashboard");
  };

  const addToast = (message, type = "success") => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, message, type }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3200);
  };

  const titles = {
    dashboard: ["Dashboard", "Your trading performance at a glance"],
    "market-plan": ["Daily Market Plan", "Write your bias, key levels, and setups before the session starts"],
    challenges: ["Funding Challenges", "Live rule compliance for every evaluation"],
    journal: ["Trade Journal", "Every trade, logged and filterable"],
    journaling: ["Weekly & Monthly Review", "Reflect on your trading beyond the individual trade"],
    notebook: ["Notebook", "Playbooks, psychology notes, and anything worth remembering"],
    analytics: ["Analytics & Insights", "Break down your edge by asset, day, and session"],
    goals: ["Goals", "Set targets and track your progress toward them"],
    "econ-calendar": ["Economic Calendar", "Live market-moving events"],
    heatmaps: ["Market Heatmaps", "Live stocks and crypto performance"],
    calculator: ["Pips Calculator", "Know what a pip is worth, and how far between two prices"],
    "position-calculator": ["Position Calculator", "Size a position to risk exactly what you intend, before you're in it"],
    "risk-tools": ["Risk of Ruin", "Sanity-check your edge before it costs you money"],
    correlation: ["Correlation Checker", "See which pairs move together before you stack positions"],
    forum: ["Community", "Connect with other traders"],
    leaderboard: ["Leaderboard", "Weekly and monthly rankings for opted-in traders"],
    friends: ["Friends", "People you're connected with on Strike Journal"],
    settings: ["Settings", "Personalize Strike Journal"],
    profile: ["Profile", "How other traders see you"],
    messages: ["Messages", "Your private conversations"],
    admin: ["Admin Panel", "Manage users and moderate content"],
  };

  const addTrade = async (t) => {
    try {
      const saved = await insertTrade(t, session.user.id);
      setTrades((prev) => [saved, ...prev]);
      addToast("Trade logged successfully");
    } catch (err) { addToast(err.message || "Failed to save trade", "error"); }
  };

  const bulkImportTrades = async (parsedTrades) => {
    const saved = [];
    for (const t of parsedTrades) {
      try {
        saved.push(await insertTrade(t, session.user.id));
      } catch {
        // skip rows that fail to insert; the toast in JournalPage already reports a count
      }
    }
    if (saved.length) setTrades((prev) => [...saved, ...prev]);
    if (saved.length < parsedTrades.length) {
      addToast(`${parsedTrades.length - saved.length} row(s) failed to import`, "error");
    }
  };

  const updateTrade = async (t) => {
    try {
      const saved = await updateTradeDB(t, session.user.id);
      setTrades((prev) => prev.map((x) => (x.id === saved.id ? saved : x)));
      setSelectedTrade(null);
      addToast("Trade updated");
    } catch (err) { addToast(err.message || "Failed to update trade", "error"); }
  };

  const deleteTrade = async (id) => {
    try {
      await deleteTradeDB(id);
      setTrades((prev) => prev.filter((t) => t.id !== id));
      setSelectedTrade(null);
      addToast("Trade removed", "info");
    } catch (err) { addToast(err.message || "Failed to delete trade", "error"); }
  };

  const addChallenge = async (c) => {
    try {
      const saved = await insertChallenge(c, session.user.id);
      setChallenges((prev) => [saved, ...prev]);
      addToast(`${saved.firm} challenge created`);
    } catch (err) { addToast(err.message || "Failed to create challenge", "error"); }
  };

  const deleteChallenge = async (id) => {
    try {
      await deleteChallengeDB(id);
      setChallenges((prev) => prev.filter((c) => c.id !== id));
      addToast("Challenge removed", "info");
    } catch (err) { addToast(err.message || "Failed to delete challenge", "error"); }
  };

  // Free-tier account limit. Bump this — or better, replace it with a
  // real per-plan lookup — once membership plans exist. Every "Add
  // Account" entry point in the app funnels through addAccount below, so
  // this one constant is the single place that controls the gate.
  const FREE_ACCOUNT_LIMIT = isProPlan(profile) ? Infinity : 2;

  const addAccount = async (a) => {
    if (accounts.length >= FREE_ACCOUNT_LIMIT) {
      addToast(`You've reached the ${FREE_ACCOUNT_LIMIT}-account limit on your current plan.`, "error");
      return { limitReached: true };
    }
    try {
      const saved = await insertTradingAccount(a, session.user.id);
      setAccounts((prev) => [...prev, saved]);
      addToast(`${saved.name} added`, "success");
      return { saved };
    } catch (err) {
      addToast(err.message || "Failed to add account", "error");
      return { error: err };
    }
  };

  const editAccount = async (id, a) => {
    try {
      const saved = await updateTradingAccount(id, a, session.user.id);
      setAccounts((prev) => prev.map((acc) => (acc.id === id ? saved : acc)));
      addToast("Account updated", "success");
    } catch (err) { addToast(err.message || "Failed to update account", "error"); }
  };

  const removeAccount = async (id) => {
    try {
      await deleteTradingAccount(id);
      setAccounts((prev) => prev.filter((acc) => acc.id !== id));
      addToast("Account removed", "info");
    } catch (err) { addToast(err.message || "Failed to remove account", "error"); }
  };

  const markFunded = async (id) => {
    const c = challenges.find((x) => x.id === id);
    if (!c) return;
    const updated = { ...c, stage: "funded", phase: "Funded", profitSplitPct: 80, lastPayoutNetProfit: 0, payoutHistory: [] };
    try {
      const saved = await updateChallengeDB(updated, session.user.id);
      setChallenges((prev) => prev.map((x) => (x.id === id ? saved : x)));
      addToast("Challenge marked as Funded 🎉");
    } catch (err) { addToast(err.message || "Failed to update challenge", "error"); }
  };

  const requestPayout = async (id) => {
    const c = challenges.find((x) => x.id === id);
    if (!c) return;
    const s = computeChallengeStats(c, trades);
    if (s.payoutAmount <= 0) return;
    const updated = {
      ...c, lastPayoutNetProfit: s.netPnl,
      payoutHistory: [...(c.payoutHistory || []), { date: new Date().toISOString().slice(0, 10), amount: +s.payoutAmount.toFixed(2), split: c.profitSplitPct }],
    };
    try {
      const saved = await updateChallengeDB(updated, session.user.id);
      setChallenges((prev) => prev.map((x) => (x.id === id ? saved : x)));
      addToast("Payout requested");
    } catch (err) { addToast(err.message || "Failed to request payout", "error"); }
  };

  if (legalPage === "privacy") return <PrivacyPolicy />;
  if (legalPage === "terms") return <TermsOfService />;
  if (legalPage === "changelog") return <ChangelogPage />;
  if (legalPage === "pricing") return <PricingPage />;
  if (legalPage === "blog") return <BlogListPage />;
  if (legalPage === "position-size-calculator") return <PositionSizeCalculatorPublic />;
  if (legalPage === "blog-post") {
    const slug = window.location.pathname.replace(/^\/?blog\//, "").split(/[/?#]/)[0];
    return <BlogPostPage slug={decodeURIComponent(slug)} />;
  }
  if (legalPage === "report-card") {
    const uname = window.location.pathname.replace(/^\/?u\//, "").split(/[/?#]/)[0];
    return <ReportCardPage username={decodeURIComponent(uname)} />;
  }

  if (session === undefined) {
    return (
      <div className="tj-root min-h-screen bg-[var(--bg-primary)] flex items-center justify-center">
        <GlobalStyle />
        <Loader2 size={22} className="text-[var(--accent)] animate-spin" />
      </div>
    );
  }

  if (passwordRecovery) {
    return <ResetPasswordScreen onDone={() => { setPasswordRecovery(false); addToast("Password updated"); }} />;
  }

  if (!session) {
    if (!showAuth) return <LandingPage onGetStarted={() => setShowAuth(true)} onSignIn={() => setShowAuth(true)} />;
    return <AuthPage onBack={() => setShowAuth(false)} />;
  }

  if (profileFetchError && profile === undefined) {
    return (
      <div className="tj-root min-h-screen bg-[var(--bg-primary)] flex items-center justify-center p-4">
        <GlobalStyle />
        <Card className="p-6 max-w-sm w-full text-center">
          <AlertTriangle size={22} className="text-amber-400 mx-auto mb-3" />
          <h2 className="font-bold text-[var(--text-primary)] mb-1">Couldn't load your profile</h2>
          <p className="text-xs text-[var(--text-muted)] mb-4">{profileFetchError} This doesn't mean anything was lost — just a connection hiccup.</p>
          <button onClick={() => { setProfileFetchError(""); setProfileRetryKey((k) => k + 1); }}
            className="bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--text-inverse)] font-semibold text-sm px-4 py-2.5 rounded-lg transition-all">
            Try Again
          </button>
        </Card>
      </div>
    );
  }

  if (profile === undefined) {
    return (
      <div className="tj-root min-h-screen bg-[var(--bg-primary)] flex items-center justify-center">
        <GlobalStyle />
        <Loader2 size={22} className="text-[var(--accent)] animate-spin" />
      </div>
    );
  }

  if (profile === null) {
    let pendingProfile = null;
    try {
      const raw = localStorage.getItem("pendingProfile");
      if (raw) pendingProfile = JSON.parse(raw);
    } catch {}
    // No stashed username/age from the signup form (e.g. they confirmed
    // their email on a different browser/device than they signed up on) —
    // rather than interrupting them with a manual form, auto-generate a
    // placeholder username so they land straight in the app. They can
    // change it any time from Settings.
    if (!pendingProfile) {
      pendingProfile = { username: `trader_${session.user.id.slice(0, 8)}`, age: 18 };
    }
    return <ProfileSetup session={session} onComplete={setProfile} pendingProfile={pendingProfile} />;
  }

  const isTimedOut = profile?.timeout_until && new Date(profile.timeout_until) > new Date();

  if (profile?.is_banned || isTimedOut) {
    return (
      <div className="tj-root min-h-screen bg-[var(--bg-primary)] flex items-center justify-center p-4">
        <GlobalStyle />
        <div className="max-w-sm w-full text-center bg-white/[0.03] border border-white/10 rounded-2xl p-8">
          <div className="w-14 h-14 rounded-full bg-rose-500/10 flex items-center justify-center mx-auto mb-4">
            <Ban size={24} className="text-rose-400" />
          </div>
          <h2 className="font-bold text-[var(--text-primary)] text-lg mb-2">
            {profile?.is_banned ? "Account Suspended" : "Temporarily Restricted"}
          </h2>
          <p className="text-sm text-[var(--text-tertiary)]">
            {profile?.is_banned
              ? "Your account has been banned by an administrator."
              : `You've been timed out until ${new Date(profile.timeout_until).toLocaleString()}.`}
          </p>
          {profile?.is_banned && profile?.ban_reason && (
            <p className="text-xs text-[var(--text-muted)] mt-2">Reason: {profile.ban_reason}</p>
          )}
          <button onClick={signOut}
            className="mt-6 w-full flex items-center justify-center gap-2 bg-white/[0.06] hover:bg-white/[0.1] text-[var(--text-primary)] font-semibold text-sm py-2.5 rounded-lg transition-all">
            <LogOut size={14} /> Sign Out
          </button>
        </div>
      </div>
    );
  }

  return (
    <ToastContext.Provider value={addToast}>
      <div className="tj-root min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] flex">
        <GlobalStyle />
        <Sidebar active={active} setActive={setActive} mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} user={session.user} profile={profile} onSignOut={signOut} />
        <div className="flex-1 min-w-0 flex flex-col">
          <InstallBanner />
          <TopBar title={titles[active][0]} subtitle={titles[active][1]} onMenu={() => setMobileOpen(true)} onLogTrade={() => setLogModalOpen(true)} showLogTrade={active === "dashboard" || active === "journal"} session={session} profile={profile} setActive={setActive} onSignOut={signOut} />
          {dataError && (
            <div className="mx-4 md:mx-6 mt-4 flex items-center gap-2 bg-rose-950/60 border border-rose-900 text-rose-300 text-sm px-4 py-2.5 rounded-lg">
              <AlertTriangle size={14} /> Couldn't load your data: {dataError}
            </div>
          )}
          <main className="flex-1 min-w-0">
            {loading ? <LoadingScreen /> : (
              <>
                {active === "dashboard" && <DashboardPage trades={trades} challenges={challenges} onOpenTrade={setSelectedTrade} profile={profile} onLogTrade={() => setLogModalOpen(true)} setActive={setActive} userId={session?.user?.id} accounts={accounts} />}
                {active === "challenges" && <ChallengesPage challenges={challenges} trades={trades} onCreate={addChallenge} onDelete={deleteChallenge} onMarkFunded={markFunded} onRequestPayout={requestPayout} />}
                {active === "journal" && <JournalPage trades={trades} onDelete={deleteTrade} onOpenTrade={setSelectedTrade} onImportTrades={bulkImportTrades} profile={profile} accounts={accounts} onAddAccount={addAccount} onEditAccount={editAccount} onRemoveAccount={removeAccount} accountLimit={FREE_ACCOUNT_LIMIT} />}
                {active === "journaling" && (
                  <UpgradeGate profile={profile} feature="Weekly/Monthly Review" description="Structured reflection on your trading beyond the individual trade — built automatically from your journal.">
                    <JournalingPage session={session} trades={trades} toast={addToast} />
                  </UpgradeGate>
                )}
                {active === "notebook" && <NotebookPage session={session} toast={addToast} />}
                {active === "market-plan" && <MarketPlanPage session={session} toast={addToast} />}
                {active === "analytics" && <AnalyticsPage trades={trades} accounts={accounts} onAddAccount={addAccount} onEditAccount={editAccount} onRemoveAccount={removeAccount} accountLimit={FREE_ACCOUNT_LIMIT} />}
                {active === "goals" && <GoalsPage session={session} trades={trades} toast={addToast} />}
                {active === "econ-calendar" && <EconomicCalendarPage />}
                {active === "heatmaps" && <MarketHeatmapsPage />}
                {active === "calculator" && <CalculatorPage />}
                {active === "position-calculator" && <PositionCalculatorPage />}
                {active === "risk-tools" && <RiskToolsPage />}
                {active === "correlation" && <CorrelationPage />}
                {active === "forum" && <ForumPage session={session} profile={profile} />}
                {active === "leaderboard" && <LeaderboardPage session={session} profile={profile} onViewProfile={setViewingUserId} onGoToSettings={() => setActive("settings")} />}
                {active === "profile" && <ProfilePage session={session} profile={profile} onProfileUpdate={setProfile} toast={addToast} />}
                {active === "messages" && <MessagesPage session={session} profile={profile} />}
                {active === "friends" && <FriendsPage session={session} profile={profile} />}
                {active === "settings" && <SettingsPage settings={settings} onSave={(s) => setSettings(s)} session={session} profile={profile} onProfileUpdate={setProfile} onSignOut={signOut} />}
                {active === "admin" && (profile?.is_admin
                  ? <AdminPanel session={session} profile={profile} toast={addToast} />
                  : <div className="p-6 text-sm text-[var(--text-muted)]">You don't have access to this page.</div>)}
              </>
            )}
          </main>
        </div>
        <LogTradeModal open={logModalOpen} onClose={() => setLogModalOpen(false)} onCreate={addTrade} challenges={challenges} accounts={accounts} />
        <TradeDrawer trade={selectedTrade} onClose={() => setSelectedTrade(null)} onSave={updateTrade} onDelete={deleteTrade} session={session} profile={profile} addToast={addToast} />
        <UserProfileModal userId={viewingUserId} currentUserId={session?.user?.id} currentUsername={profile?.username || "Trader"} onClose={() => setViewingUserId(null)} />
        <ToastContainer toasts={toasts} />
        <SupportChatWidget session={session} profile={profile} hideLauncher={active === "messages" || active === "forum"} />
      </div>
    </ToastContext.Provider>
  );
}
