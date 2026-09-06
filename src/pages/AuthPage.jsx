import React, { useState, useEffect } from "react";
import {
  AlertTriangle, Loader2, Sparkles, CheckCircle, Mail, Lock, Eye, EyeOff, UserCircle, Check,
} from "lucide-react";
import { createProfile, applyReferralCode } from "../db";
import { supabase } from "../supabaseClient";
import { setKeepSignedIn } from "../supabaseClient";
import { LogoFull } from "../Logo";
import { Card, Field, GlobalStyle } from "../components/ui/Primitives";
import { inputCls } from "../constants";

export const ProfileSetup = ({ session, onComplete, pendingProfile }) => {
  const [username, setUsername] = useState(pendingProfile?.username || "");
  const [age, setAge] = useState(pendingProfile?.age || "");
  const [loading, setLoading] = useState(false);
  const [autoRunning, setAutoRunning] = useState(!!pendingProfile);
  const [error, setError] = useState("");

  const create = async (u, a) => {
    setError("");
    const cleanUsername = u.trim();
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(cleanUsername)) {
      setError("Username must be 3-20 characters: letters, numbers, and underscores only.");
      return false;
    }
    const ageNum = Number(a);
    if (!a || !Number.isInteger(ageNum) || ageNum < 18 || ageNum > 120) {
      setError("You must enter a valid age, 18 or older, to use Strike Journal.");
      return false;
    }
    setLoading(true);
    try {
      const profile = await createProfile(session.user.id, cleanUsername, ageNum);
      const refCode = new URLSearchParams(window.location.search).get("ref");
      if (refCode) applyReferralCode(session.user.id, refCode).catch(() => {});
      try { localStorage.removeItem("pendingProfile"); } catch {}
      onComplete(profile);
      return true;
    } catch (err) {
      if (err.code === "23505" || /duplicate/i.test(err.message || "")) setError("That username is already taken — try another.");
      else setError(err.message || "Something went wrong. Please try again.");
      return false;
    } finally {
      setLoading(false);
    }
  };

  // If the username/age were already collected on the signup form, finish
  // account setup automatically instead of asking again — this only shows
  // the manual form as a fallback if that silently fails (e.g. someone
  // else took the username while this person was confirming their email).
  useEffect(() => {
    if (!pendingProfile) return;
    create(pendingProfile.username, pendingProfile.age).then((ok) => {
      if (!ok) setAutoRunning(false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submit = (e) => {
    e.preventDefault();
    create(username, age);
  };

  if (autoRunning) {
    return (
      <div className="tj-root min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] flex flex-col items-center justify-center p-4 gap-4">
        <GlobalStyle />
        <LogoFull size={34} textClass="text-xl" />
        <div className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
          <Loader2 size={16} className="animate-spin" /> Setting up your account...
        </div>
      </div>
    );
  }

  return (
    <div className="tj-root min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] flex items-center justify-center p-4">
      <GlobalStyle />
      <div className="w-full max-w-sm">
        <div className="flex items-center justify-center mb-8">
          <LogoFull size={34} textClass="text-xl" />
        </div>
        <Card className="p-6 tj-animate-in">
          <div className="flex items-center gap-2 mb-1">
            <UserCircle size={18} className="text-[var(--accent)]" />
            <h2 className="font-bold text-[var(--text-primary)]">Complete your profile</h2>
          </div>
          <p className="text-xs text-[var(--text-muted)] mb-5">One last step before you get started — this is how other traders will see you on the forum.</p>
          <form onSubmit={submit}>
            <Field label="Username">
              <input className={inputCls} placeholder="e.g. edgehunter_23" value={username} onChange={(e) => setUsername(e.target.value)} />
            </Field>
            <Field label="Age">
              <input type="number" className={inputCls} placeholder="18+" value={age} onChange={(e) => setAge(e.target.value)} />
            </Field>
            {error && <p className="text-xs text-rose-400 mb-3 flex items-center gap-1"><AlertTriangle size={11} /> {error}</p>}
            <button type="submit" disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-[var(--accent)] hover:bg-[var(--accent)] disabled:opacity-50 active:scale-[0.98] text-[var(--text-inverse)] font-semibold text-sm py-2.5 rounded-lg transition-all">
              {loading ? <Loader2 size={15} className="animate-spin" /> : null}
              Continue
            </button>
          </form>
        </Card>
      </div>
    </div>
  );
};

/* ============================================================
   AUTH PAGE (Google + email/password via Supabase)
   ============================================================ */


/* ---------- compact "trading terminal" visual for the auth panel ----------
   Candlesticks + a drawn equity line + a couple of live-looking stats and a
   drawdown gauge, standing in for an actual product screenshot without
   needing one — same gradient/candle language as the rest of the app. */
const AUTH_CANDLES = [
  { cy: 96, h: 13, up: true }, { cy: 100, h: 11, up: false }, { cy: 88, h: 15, up: true }, { cy: 92, h: 10, up: false },
  { cy: 78, h: 16, up: true }, { cy: 82, h: 11, up: false }, { cy: 68, h: 14, up: true }, { cy: 72, h: 10, up: false },
  { cy: 56, h: 15, up: true }, { cy: 60, h: 10, up: false }, { cy: 44, h: 14, up: true }, { cy: 48, h: 10, up: false },
  { cy: 32, h: 15, up: true }, { cy: 24, h: 12, up: true },
];

const AuthTerminalPreview = () => (
  <div className="bg-white/5 border border-white/10 rounded-2xl p-4 backdrop-blur-sm">
    <div className="flex items-center justify-between mb-2.5">
      <span className="flex items-center gap-1.5 text-[11px] font-semibold text-zinc-400">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 lp-pulse-dot" /> Live account — XAUUSD
      </span>
      <span className="lp-mono text-[11px] font-semibold text-emerald-400">+2.4R this week</span>
    </div>

    <svg viewBox="0 0 300 116" className="w-full h-auto" fill="none">
      <defs>
        <linearGradient id="authLine" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#4F7CFF" />
          <stop offset="55%" stopColor="#A855F7" />
          <stop offset="100%" stopColor="#F472B6" />
        </linearGradient>
      </defs>
      {AUTH_CANDLES.map((c, i) => {
        const x = 8 + i * 21;
        return (
          <g key={i}>
            <line x1={x} x2={x} y1={c.cy - c.h / 2 - 7} y2={c.cy + c.h / 2 + 7} stroke={c.up ? "#34d399" : "#fb7185"} strokeWidth="1.4" opacity="0.7" />
            <rect x={x - 3.5} y={c.cy - c.h / 2} width="7" height={c.h} rx="1.5" fill={c.up ? "#34d399" : "#fb7185"} opacity={c.up ? 0.9 : 0.75} />
          </g>
        );
      })}
      <path
        className="lp-draw-line"
        d={`M${AUTH_CANDLES.map((c, i) => `${8 + i * 21} ${c.cy}`).join(" L")}`}
        stroke="url(#authLine)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.85"
      />
    </svg>

    <div className="flex items-center justify-between mt-1 pt-3 border-t border-white/10">
      <div>
        <div className="text-[10px] uppercase tracking-wide text-zinc-500 font-semibold mb-0.5">Net P&L</div>
        <div className="lp-mono text-base font-bold text-emerald-400">+$2,480</div>
      </div>
      <div className="w-28">
        <div className="flex items-center justify-between text-[10px] text-zinc-500 font-semibold mb-1">
          <span>Daily loss limit</span><span className="lp-mono text-zinc-300">22%</span>
        </div>
        <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
          <div className="h-full rounded-full" style={{ width: "22%", background: "linear-gradient(90deg, #34d399, #fbbf24 90%)" }} />
        </div>
      </div>
    </div>
  </div>
);

export const AuthPage = ({ onBack }) => {
  const [mode, setMode] = useState("signin"); // "signin" | "signup" | "forgot"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [age, setAge] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [keepSignedIn, setKeepSignedInState] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const submitForgotPassword = async (e) => {
    e.preventDefault();
    setError(""); setNotice(""); setLoading(true);
    if (!email) { setError("Enter your email address."); setLoading(false); return; }
    const { error: err } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin });
    setLoading(false);
    if (err) setError(err.message || "Something went wrong sending the reset link. Please try again.");
    else setNotice("Check your email for a password reset link.");
  };

  const submitEmail = async (e) => {
    e.preventDefault();
    setError(""); setNotice(""); setLoading(true);
    if (!email || !password) { setError("Enter both email and password."); setLoading(false); return; }
    if (password.length < 6) { setError("Password must be at least 6 characters."); setLoading(false); return; }

    if (mode === "signup") {
      const cleanUsername = username.trim();
      if (!/^[a-zA-Z0-9_]{3,20}$/.test(cleanUsername)) {
        setError("Username must be 3-20 characters: letters, numbers, and underscores only.");
        setLoading(false);
        return;
      }
      const ageNum = Number(age);
      if (!age || !Number.isInteger(ageNum) || ageNum < 18 || ageNum > 120) {
        setError("You must enter a valid age, 18 or older, to use Strike Journal.");
        setLoading(false);
        return;
      }
      // Stashed as a client-side fallback in case the DB trigger (which
      // creates the profile row from user metadata below) doesn't fire for
      // some reason — but the real source of truth is now the metadata
      // passed to signUp, which a Postgres trigger reads server-side.
      try { localStorage.setItem("pendingProfile", JSON.stringify({ username: cleanUsername, age: ageNum })); } catch {}

      // Set which storage the session token lands in before Supabase
      // actually writes it, so the choice takes effect on this sign-up.
      setKeepSignedIn(keepSignedIn);
      const { data: signUpData, error: err } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { username: cleanUsername, age: ageNum } },
      });
      setLoading(false);
      if (err) {
        setError(err.message || "Something went wrong creating your account. Please try again.");
        try { localStorage.removeItem("pendingProfile"); } catch {}
      } else if (signUpData?.session) {
        // Email confirmation is turned off in Supabase, so signUp already
        // returned a live session — the app's auth listener will pick this
        // up and take them straight in. No "check your email" notice needed.
      } else {
        setNotice("Account created — check your email to confirm, then sign in.");
      }
    } else {
      // Same idea for sign-in: pick the storage target first, then let
      // Supabase persist the session into it.
      setKeepSignedIn(keepSignedIn);
      const { error: err } = await supabase.auth.signInWithPassword({ email, password });
      setLoading(false);
      if (err) setError(err.message || "Something went wrong signing in. Please try again.");
    }
  };

  return (
    <div className="tj-root min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] flex">
      <GlobalStyle />

      {/* Left — branded panel. Intentionally always dark regardless of the
          site theme (like Stripe/Linear auth screens) — using fixed colors
          here instead of the theme variables, since this panel's background
          never changes but --text-primary etc. would flip to a dark color
          in light mode, making the text invisible against it. */}
      <div className="hidden lg:flex lg:w-[46%] relative overflow-hidden flex-col justify-between p-12 bg-[#050810]">
        <div
          className="absolute inset-0 opacity-[0.05]"
          style={{ backgroundImage: "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)", backgroundSize: "44px 44px" }}
        />
        <div className="absolute -bottom-24 -right-24 w-[420px] h-[420px] rounded-full opacity-20 blur-[100px] pointer-events-none" style={{ background: "radial-gradient(circle, #8B5CF6, transparent 70%)" }} />

        <a href="/" className="relative flex items-center gap-2">
          <LogoFull size={30} textClass="text-lg" forceLight />
        </a>

        <div className="relative">
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full bg-white/5 border border-white/10 text-zinc-300 mb-6">
            <Sparkles size={12} className="text-[var(--accent)]" /> Built for every kind of trader
          </span>
          <h1 className="text-4xl font-extrabold leading-tight mb-4 text-white">
            Trade with a system,<br /> not a feeling.
          </h1>
          <p className="text-zinc-400 text-[15px] leading-relaxed max-w-md mb-6">
            Log every trade, track your funding challenge rules in real time, and see the analytics that actually explain your edge.
          </p>

          <AuthTerminalPreview />

          <div className="space-y-3 mt-8">
            {[
              "Trade journal with setup tags & psychology notes",
              "Funding challenge tracker — works with any prop firm",
              "Analytics that go past win rate and P&L",
              "A community built around accountability",
            ].map((line) => (
              <div key={line} className="flex items-center gap-2.5">
                <div className="w-4.5 h-4.5 rounded-full bg-[var(--accent)]/15 flex items-center justify-center shrink-0">
                  <CheckCircle size={11} className="text-[var(--accent)]" />
                </div>
                <span className="text-sm text-zinc-300">{line}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="relative text-xs text-zinc-500">© {new Date().getFullYear()} Strike Journal. Free to start, no credit card required.</p>
      </div>

      {/* Right — the actual form */}
      <div className="flex-1 relative flex items-center justify-center p-4 sm:p-8 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: "radial-gradient(circle at 85% 0%, var(--accent-soft), transparent 45%)" }} />
        <div className="w-full max-w-sm relative">
          <div className="lg:hidden flex items-center justify-center mb-8">
            <LogoFull size={32} textClass="text-lg" />
          </div>

          {onBack && (
            <button onClick={onBack} className="text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)] mb-5 flex items-center gap-1 transition-colors">
              ← Back to home
            </button>
          )}

          {mode === "forgot" ? (
            <div className="tj-animate-in">
              <h2 className="text-xl font-extrabold mb-1.5">Reset your password</h2>
              <p className="text-sm text-[var(--text-muted)] mb-6">We'll email you a link to set a new password.</p>
              <Card className="p-6">
              <form onSubmit={submitForgotPassword}>
                <Field label="Email">
                  <div className="relative">
                    <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                    <input type="email" className={`${inputCls} pl-9`} placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
                  </div>
                </Field>
                {error && <p className="text-xs text-rose-400 mb-3 flex items-center gap-1"><AlertTriangle size={11} /> {error}</p>}
                {notice && <p className="text-xs text-emerald-400 mb-3 flex items-center gap-1"><CheckCircle size={11} /> {notice}</p>}
                <button type="submit" disabled={loading}
                  className="w-full flex items-center justify-center gap-2 tj-gradient-bg hover:opacity-90 disabled:opacity-50 active:scale-[0.98] text-white font-semibold text-sm py-2.5 rounded-lg transition-all shadow-[0_8px_24px_-8px_rgba(139,92,246,0.5)]">
                  {loading ? <Loader2 size={15} className="animate-spin" /> : null}
                  Send Reset Link
                </button>
              </form>
              </Card>
              <button onClick={() => { setMode("signin"); setError(""); setNotice(""); }} className="w-full text-center text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)] mt-5 transition-colors">
                ← Back to sign in
              </button>
            </div>
          ) : (
            <div className="tj-animate-in">
              <h2 className="text-xl font-extrabold mb-1.5">{mode === "signup" ? "Create your account" : "Welcome back"}</h2>
              <p className="text-sm text-[var(--text-muted)] mb-6">
                {mode === "signup" ? "Free to start — no credit card required." : "Sign in to get back to your journal."}
              </p>

              <Card className="p-6">
              <form onSubmit={submitEmail}>
                <Field label="Email">
                  <div className="relative">
                    <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                    <input type="email" className={`${inputCls} pl-9`} placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
                  </div>
                </Field>
                <Field label="Password">
                  <div className="relative">
                    <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                    <input type={showPassword ? "text" : "password"} className={`${inputCls} pl-9 pr-9`} placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} />
                    <button type="button" onClick={() => setShowPassword((s) => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-secondary)]">
                      {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </Field>

                {mode === "signup" && (
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Username">
                      <div className="relative">
                        <UserCircle size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                        <input className={`${inputCls} pl-9`} placeholder="edgehunter_23" value={username} onChange={(e) => setUsername(e.target.value)} />
                      </div>
                    </Field>
                    <Field label="Age">
                      <input type="number" className={inputCls} placeholder="18+" value={age} onChange={(e) => setAge(e.target.value)} />
                    </Field>
                  </div>
                )}

                {mode === "signin" && (
                  <div className="flex items-center justify-between -mt-2 mb-4">
                    <label className="flex items-center gap-2 text-xs text-[var(--text-muted)] cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={keepSignedIn}
                        onChange={(e) => setKeepSignedInState(e.target.checked)}
                        className="w-3.5 h-3.5 rounded border-[var(--border-secondary)] accent-[var(--accent)]"
                      />
                      Keep me signed in
                    </label>
                    <button type="button" onClick={() => { setMode("forgot"); setError(""); setNotice(""); }} className="text-xs text-[var(--accent)] hover:text-[var(--accent)] transition-colors">
                      Forgot password?
                    </button>
                  </div>
                )}

                {error && <p className="text-xs text-rose-400 mb-3 flex items-center gap-1"><AlertTriangle size={11} /> {error}</p>}
                {notice && <p className="text-xs text-emerald-400 mb-3 flex items-center gap-1"><CheckCircle size={11} /> {notice}</p>}

                <button type="submit" disabled={loading}
                  className="w-full flex items-center justify-center gap-2 tj-gradient-bg hover:opacity-90 disabled:opacity-50 active:scale-[0.98] text-white font-semibold text-sm py-2.5 rounded-lg transition-all shadow-[0_8px_24px_-8px_rgba(139,92,246,0.5)]">
                  {loading ? <Loader2 size={15} className="animate-spin" /> : null}
                  {mode === "signup" ? "Create Account" : "Sign In"}
                </button>
              </form>
              </Card>

              <p className="text-center text-xs text-[var(--text-faint)] mt-5">
                {mode === "signin" ? "Don't have an account? " : "Already have an account? "}
                <button onClick={() => { setMode(mode === "signin" ? "signup" : "signin"); setError(""); setNotice(""); }} className="text-[var(--accent)] hover:text-[var(--accent)] font-medium">
                  {mode === "signin" ? "Sign up" : "Sign in"}
                </button>
              </p>

              {mode === "signup" && (
                <p className="text-center text-[11px] text-[var(--text-faint)] mt-3">
                  By creating an account, you agree to our{" "}
                  <a href="/terms" className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)] underline">Terms</a>{" "}
                  and{" "}
                  <a href="/privacy" className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)] underline">Privacy Policy</a>.
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

/* ============================================================
   ROOT APP
   ============================================================ */


export const ResetPasswordScreen = ({ onDone }) => {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (password.length < 6) { setError("Password must be at least 6 characters."); return; }
    if (password !== confirmPassword) { setError("Passwords don't match."); return; }
    setLoading(true);
    const { error: err } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (err) setError(err.message);
    else onDone();
  };

  return (
    <div className="tj-root min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] flex items-center justify-center p-4">
      <GlobalStyle />
      <div className="w-full max-w-sm">
        <div className="flex items-center justify-center mb-8"><LogoFull size={34} textClass="text-xl" /></div>
        <Card className="p-6 tj-animate-in">
          <h3 className="font-bold text-[var(--text-primary)] text-sm mb-1">Set a new password</h3>
          <p className="text-xs text-[var(--text-muted)] mb-5">Choose a new password for your account.</p>
          <form onSubmit={submit}>
            <Field label="New Password">
              <div className="relative">
                <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                <input type={showPassword ? "text" : "password"} className={`${inputCls} pl-9 pr-9`} placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" />
                <button type="button" onClick={() => setShowPassword((s) => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-secondary)]">
                  {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </Field>
            <Field label="Confirm New Password" error={error}>
              <input type={showPassword ? "text" : "password"} className={inputCls} placeholder="••••••••" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} autoComplete="new-password" />
            </Field>
            <button type="submit" disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-[var(--accent)] hover:bg-[var(--accent)] disabled:opacity-50 active:scale-[0.98] text-[var(--text-inverse)] font-semibold text-sm py-2.5 rounded-lg transition-all">
              {loading ? <Loader2 size={15} className="animate-spin" /> : null}
              Update Password
            </button>
          </form>
        </Card>
      </div>
    </div>
  );
};
