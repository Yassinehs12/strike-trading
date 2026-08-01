import React, { useState, useEffect } from "react";
import {
  ShieldCheck, Target, AlertTriangle, Wallet, Trash2, Award, Loader2, LogOut, Eye, EyeOff, Check, Ban, Copy, KeyRound, Palette, BellRing, Plug, Share2, RefreshCw,
} from "lucide-react";
import { updateProfileUsername, setLeaderboardOptIn, setShowPublicStats, fetchSnapTradeAccounts, getSnapTradeConnectUrl, syncSnapTradeAccounts, disconnectSnapTradeAccount, disconnectAllSnapTrade } from "../db";
import { supabase } from "../supabaseClient";
import { Card, EmptyState, Field, SectionHeader, UpgradeGate, useToast } from "../components/ui/Primitives";
import { SETTINGS_TABS, inputCls } from "../constants";

export const passwordStrength = (pw) => {
  if (!pw) return { score: 0, label: "", color: "" };
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  const levels = [
    { label: "Very weak", color: "bg-rose-500" },
    { label: "Weak", color: "bg-rose-500" },
    { label: "Fair", color: "bg-amber-500" },
    { label: "Good", color: "bg-amber-400" },
    { label: "Strong", color: "bg-emerald-500" },
    { label: "Very strong", color: "bg-emerald-500" },
  ];
  return { score, ...levels[Math.min(score, levels.length - 1)] };
};


export const SnapTradeSyncTab = ({ session, toast }) => {
  const [accounts, setAccounts] = useState(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [busyId, setBusyId] = useState(null);

  const load = async () => {
    try {
      const data = await fetchSnapTradeAccounts(session.user.id);
      setAccounts(data);
    } catch (err) {
      toast(err.message || "Failed to load connected accounts", "error");
      setAccounts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleConnect = async () => {
    setConnecting(true);
    try {
      const url = await getSnapTradeConnectUrl();
      window.open(url, "_blank", "noopener,noreferrer");
      toast("Finish connecting your brokerage in the new tab, then hit Sync Now.", "success");
    } catch (err) {
      toast(err.message || "Couldn't start the connection. Try again shortly.", "error");
    } finally {
      setConnecting(false);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      const result = await syncSnapTradeAccounts();
      toast(`Synced ${result.accountsSynced} account(s), imported ${result.tradesInserted} new trade(s).`, "success");
      load();
    } catch (err) {
      toast(err.message || "Sync failed. Try again shortly.", "error");
    } finally {
      setSyncing(false);
    }
  };

  const handleRemove = async (id) => {
    setBusyId(id);
    try {
      await disconnectSnapTradeAccount(id);
      toast("Account removed", "success");
      load();
    } catch (err) {
      toast(err.message || "Failed to remove", "error");
    } finally {
      setBusyId(null);
    }
  };

  const handleFullDisconnect = async () => {
    setBusyId("all");
    try {
      await disconnectAllSnapTrade();
      toast("SnapTrade access revoked for every connected brokerage.", "success");
      load();
    } catch (err) {
      toast(err.message || "Failed to disconnect", "error");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <>
      <Card className="p-5 md:p-6">
        <SectionHeader
          title="Connect a Brokerage Account"
          icon={<Plug size={14} />}
          subtitle="Sync trades and balances automatically from Robinhood, Schwab, Fidelity, IBKR, and 20+ other brokerages."
        />

        <div className="bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-lg p-3.5 mb-5 flex items-start gap-2.5">
          <ShieldCheck size={15} className="text-emerald-400 shrink-0 mt-0.5" />
          <p className="text-xs text-[var(--text-tertiary)] leading-relaxed">
            You'll log in on your broker's own site inside SnapTrade's secure connection window — your brokerage
            credentials are never seen or stored by Strike Journal.
          </p>
        </div>

        <div className="flex flex-wrap gap-2.5">
          <button onClick={handleConnect} disabled={connecting} className="bg-[var(--accent)] hover:bg-[var(--accent-hover)] active:scale-[0.98] disabled:opacity-60 text-[var(--text-inverse)] font-semibold text-sm px-4 py-2.5 rounded-lg transition-all flex items-center gap-2">
            {connecting ? <Loader2 size={14} className="animate-spin" /> : <Plug size={14} />}
            {connecting ? "Opening…" : "Connect Brokerage"}
          </button>
          <button onClick={handleSync} disabled={syncing || !accounts?.length} className="bg-[var(--bg-tertiary)] hover:bg-[var(--bg-quaternary)] disabled:opacity-50 text-[var(--text-primary)] font-semibold text-sm px-4 py-2.5 rounded-lg transition-all flex items-center gap-2">
            {syncing ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
            {syncing ? "Syncing…" : "Sync Now"}
          </button>
        </div>
      </Card>

      <Card className="p-5 md:p-6">
        <SectionHeader title="Connected Accounts" icon={<Wallet size={14} />} noMargin />
        <div className="mt-4 space-y-3">
          {loading ? (
            <div className="flex justify-center py-6"><Loader2 size={18} className="animate-spin text-[var(--text-muted)]" /></div>
          ) : accounts.length === 0 ? (
            <EmptyState icon={Plug} title="No accounts connected yet" sub="Connect a brokerage above to start auto-syncing trades." />
          ) : (
            accounts.map((a) => (
              <div key={a.id} className="flex items-center justify-between gap-3 bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-lg p-3.5">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-semibold text-[var(--text-primary)]">{a.brokerage || "Brokerage"}</span>
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold border bg-emerald-500/10 text-emerald-400 border-emerald-500/30">{a.status}</span>
                  </div>
                  <p className="text-xs text-[var(--text-muted)] truncate">
                    {a.account_name || "Account"}{a.account_number ? ` · ${a.account_number}` : ""}
                    {a.balance != null ? ` · ${Number(a.balance).toLocaleString(undefined, { style: "currency", currency: a.currency || "USD" })}` : ""}
                  </p>
                </div>
                <button onClick={() => handleRemove(a.id)} disabled={busyId === a.id} className="text-[var(--text-muted)] hover:text-rose-400 disabled:opacity-50 transition-colors shrink-0" aria-label="Remove connection">
                  <Trash2 size={14} />
                </button>
              </div>
            ))
          )}
        </div>
        {accounts?.length > 0 && (
          <div className="mt-5 pt-4 border-t border-[var(--border-primary)]">
            <button onClick={handleFullDisconnect} disabled={busyId === "all"} className="text-xs font-medium text-rose-400/90 hover:text-rose-400 disabled:opacity-50 transition-colors">
              {busyId === "all" ? "Disconnecting…" : "Revoke SnapTrade access entirely"}
            </button>
          </div>
        )}
      </Card>
    </>
  );
};


export const SettingsPage = ({ settings, onSave, session, profile, onProfileUpdate, onSignOut }) => {
  const [form, setForm] = useState(settings);
  const toast = useToast();
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const save = () => { onSave(form); toast("Preferences saved", "success"); };
  const [tab, setTab] = useState("account");

  const [username, setUsername] = useState(profile?.username || "");
  const [usernameError, setUsernameError] = useState("");
  const [usernameLoading, setUsernameLoading] = useState(false);
  const [idCopied, setIdCopied] = useState(false);

  const copyUserId = () => {
    if (!session?.user?.id) return;
    navigator.clipboard?.writeText(session.user.id);
    setIdCopied(true);
    setTimeout(() => setIdCopied(false), 1500);
  };

  const saveUsername = async () => {
    const clean = username.trim();
    setUsernameError("");
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(clean)) {
      setUsernameError("Username must be 3-20 characters: letters, numbers, and underscores only.");
      return;
    }
    if (clean === profile?.username) return;
    setUsernameLoading(true);
    try {
      const updated = await updateProfileUsername(session.user.id, clean);
      onProfileUpdate(updated);
      toast("Username updated", "success");
    } catch (err) {
      if (err.code === "23505" || /duplicate/i.test(err.message || "")) setUsernameError("That username is already taken — try another.");
      else setUsernameError(err.message || "Something went wrong. Please try again.");
    } finally {
      setUsernameLoading(false);
    }
  };

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);
  const strength = passwordStrength(newPassword);

  const [leaderboardLoading, setLeaderboardLoading] = useState(false);
  const toggleLeaderboardOptIn = async () => {
    setLeaderboardLoading(true);
    try {
      const updated = await setLeaderboardOptIn(session.user.id, !profile?.leaderboard_opt_in);
      onProfileUpdate(updated);
      toast(updated.leaderboard_opt_in ? "You're on the leaderboard" : "Removed from the leaderboard", "success");
    } catch (err) {
      toast(err.message || "Failed to update leaderboard setting", "error");
    } finally {
      setLeaderboardLoading(false);
    }
  };

  const [reportCardLoading, setReportCardLoading] = useState(false);
  const toggleReportCard = async () => {
    setReportCardLoading(true);
    try {
      const updated = await setShowPublicStats(session.user.id, !profile?.show_public_stats);
      onProfileUpdate(updated);
      toast(updated.show_public_stats ? "Your report card is now public" : "Your report card is now private", "success");
    } catch (err) {
      toast(err.message || "Failed to update this setting", "error");
    } finally {
      setReportCardLoading(false);
    }
  };

  const changePassword = async () => {
    setPasswordError("");
    if (newPassword.length < 8) { setPasswordError("New password must be at least 8 characters."); return; }
    if (newPassword !== confirmPassword) { setPasswordError("New passwords don't match."); return; }
    setPasswordLoading(true);
    try {
      // Re-authenticate with the current password before allowing the change.
      const { error: signInErr } = await supabase.auth.signInWithPassword({
        email: session.user.email,
        password: currentPassword,
      });
      if (signInErr) { setPasswordError("Current password is incorrect."); return; }

      const { error: updateErr } = await supabase.auth.updateUser({ password: newPassword });
      if (updateErr) { setPasswordError(updateErr.message || "Failed to update password."); return; }

      setCurrentPassword(""); setNewPassword(""); setConfirmPassword("");
      toast("Password updated", "success");
    } catch (err) {
      setPasswordError(err.message || "Something went wrong. Please try again.");
    } finally {
      setPasswordLoading(false);
    }
  };

  const lastSignIn = session?.user?.last_sign_in_at ? new Date(session.user.last_sign_in_at) : null;

  const Toggle = ({ checked, onChange, disabled }) => (
    <button onClick={onChange} disabled={disabled}
      className={`shrink-0 relative w-11 h-6 rounded-full transition-colors ${checked ? "bg-[var(--accent)]" : "bg-[var(--bg-quaternary)]"} disabled:opacity-50`}>
      <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${checked ? "translate-x-5" : ""}`} />
    </button>
  );

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl md:text-2xl font-bold text-[var(--text-primary)] tracking-tight">Settings</h1>
        <p className="text-sm text-[var(--text-muted)] mt-1">Manage your account, security, and preferences.</p>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        {/* Tab nav */}
        <nav className="flex md:flex-col gap-1 overflow-x-auto md:overflow-visible md:w-48 shrink-0 pb-1 md:pb-0">
          {SETTINGS_TABS.map((t) => {
            const Icon = t.icon;
            const active = tab === t.id;
            return (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`flex items-center gap-2.5 text-sm font-medium px-3 py-2.5 rounded-lg whitespace-nowrap transition-colors text-left
                  ${active ? "bg-[var(--accent)]/10 text-[var(--accent)]" : "text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]"}
                  ${t.id === "danger" && !active ? "text-rose-400/80 hover:text-rose-400" : ""}`}>
                <Icon size={15} /> {t.label}
              </button>
            );
          })}
        </nav>

        {/* Tab content */}
        <div className="flex-1 min-w-0 space-y-5">
          {tab === "account" && (
            <>
              <Card className="p-5 md:p-6">
                <SectionHeader title="Account" subtitle="Your identity on Strike Journal." />
                <Field label="Email">
                  <input className={inputCls} value={session?.user?.email || ""} disabled />
                </Field>
                <Field label="Username" error={usernameError}>
                  <div className="flex gap-2">
                    <input className={inputCls} value={username} onChange={(e) => setUsername(e.target.value)} maxLength={20} />
                    <button onClick={saveUsername} disabled={usernameLoading || username.trim() === profile?.username}
                      className="shrink-0 bg-[var(--accent)] hover:bg-[var(--accent-hover)] disabled:opacity-40 text-[var(--text-inverse)] font-semibold text-sm px-3.5 rounded-lg transition-all">
                      {usernameLoading ? <Loader2 size={14} className="animate-spin" /> : "Save"}
                    </button>
                  </div>
                </Field>
                <div className="grid sm:grid-cols-2 gap-3 mt-4 pt-4 border-t border-[var(--border-primary)]">
                  <div>
                    <div className="text-xs text-[var(--text-muted)] mb-1">Member since</div>
                    <div className="text-sm text-[var(--text-secondary)]">{profile?.created_at ? new Date(profile.created_at).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" }) : "—"}</div>
                  </div>
                  <div>
                    <div className="text-xs text-[var(--text-muted)] mb-1">Last sign in</div>
                    <div className="text-sm text-[var(--text-secondary)]">{lastSignIn ? lastSignIn.toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "—"}</div>
                  </div>
                </div>
              </Card>

              <Card className="p-5 md:p-6">
                <SectionHeader title="Support & Account ID" subtitle="Include this ID when contacting support about your account." />
                <div className="flex items-center gap-2">
                  <code className="flex-1 bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-lg px-3 py-2.5 text-xs text-[var(--text-secondary)] truncate">
                    {session?.user?.id || "—"}
                  </code>
                  <button onClick={copyUserId} className="flex items-center gap-1.5 bg-[var(--bg-tertiary)] hover:bg-[var(--bg-quaternary)] text-[var(--text-primary)] font-semibold text-xs px-3 py-2.5 rounded-lg transition-all shrink-0">
                    {idCopied ? <Check size={13} /> : <Copy size={13} />} {idCopied ? "Copied" : "Copy"}
                  </button>
                </div>
              </Card>
            </>
          )}

          {tab === "security" && (
            <>
              <Card className="p-5 md:p-6">
                <SectionHeader title="Change Password" icon={<KeyRound size={14} />} subtitle="You'll need your current password to set a new one." />
                <Field label="Current Password">
                  <div className="relative">
                    <input type={showCurrentPw ? "text" : "password"} className={`${inputCls} pr-9`} value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} autoComplete="current-password" />
                    <button type="button" onClick={() => setShowCurrentPw((s) => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-secondary)]">
                      {showCurrentPw ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </Field>
                <Field label="New Password">
                  <div className="relative">
                    <input type={showNewPw ? "text" : "password"} className={`${inputCls} pr-9`} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} autoComplete="new-password" />
                    <button type="button" onClick={() => setShowNewPw((s) => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-secondary)]">
                      {showNewPw ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                  {newPassword && (
                    <div className="mt-2">
                      <div className="flex gap-1">
                        {[0, 1, 2, 3, 4].map((i) => (
                          <div key={i} className={`h-1 flex-1 rounded-full ${i < strength.score ? strength.color : "bg-[var(--bg-quaternary)]"}`} />
                        ))}
                      </div>
                      <div className="text-xs text-[var(--text-muted)] mt-1">{strength.label}</div>
                    </div>
                  )}
                </Field>
                <Field label="Confirm New Password" error={passwordError}>
                  <input type={showNewPw ? "text" : "password"} className={inputCls} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} autoComplete="new-password" />
                </Field>
                <button onClick={changePassword} disabled={passwordLoading || !currentPassword || !newPassword || !confirmPassword}
                  className="flex items-center gap-2 bg-[var(--accent)] hover:bg-[var(--accent-hover)] disabled:opacity-40 active:scale-[0.98] text-[var(--text-inverse)] font-semibold text-sm px-4 py-2.5 rounded-lg transition-all">
                  {passwordLoading ? <Loader2 size={15} className="animate-spin" /> : null}
                  Change Password
                </button>
              </Card>

              <Card className="p-5 md:p-6">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h3 className="font-bold text-[var(--text-primary)] text-sm mb-1 flex items-center gap-1.5"><Award size={15} className="text-[var(--accent)]" /> Leaderboard</h3>
                    <p className="text-xs text-[var(--text-muted)] leading-relaxed">Show your win rate and net P&amp;L on the weekly/monthly leaderboard. Off by default — your results stay private until you opt in.</p>
                  </div>
                  <Toggle checked={!!profile?.leaderboard_opt_in} onChange={toggleLeaderboardOptIn} disabled={leaderboardLoading} />
                </div>
              </Card>

              <Card className="p-5 md:p-6">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h3 className="font-bold text-[var(--text-primary)] text-sm mb-1 flex items-center gap-1.5"><Share2 size={15} className="text-[var(--accent)]" /> Public Report Card</h3>
                    <p className="text-xs text-[var(--text-muted)] leading-relaxed">Share a read-only page with your win rate, trade count, and funded status — no dollar amounts or individual trades. Off by default.</p>
                  </div>
                  <Toggle checked={!!profile?.show_public_stats} onChange={toggleReportCard} disabled={reportCardLoading} />
                </div>
                {profile?.show_public_stats && profile?.username && (
                  <div className="mt-3 flex items-center gap-2 bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-lg px-3 py-2">
                    <code className="text-xs text-[var(--text-tertiary)] flex-1 truncate">strikejournal.com/u/{profile.username}</code>
                    <button
                      onClick={() => { navigator.clipboard?.writeText(`${window.location.origin}/u/${profile.username}`); toast("Link copied", "success"); }}
                      className="text-xs font-semibold text-[var(--accent)] hover:underline shrink-0"
                    >
                      Copy
                    </button>
                  </div>
                )}
              </Card>
            </>
          )}

          {tab === "trading" && (
            <>
              <Card className="p-5 md:p-6">
                <SectionHeader title="Trading Preferences" icon={<Target size={14} />} subtitle="Defaults used across your journal and challenges." />
                <div className="grid sm:grid-cols-2 gap-x-4">
                  <Field label="Display Currency">
                    <select className={inputCls} value={form.currency} onChange={(e) => set("currency", e.target.value)}><option>USD</option><option>EUR</option><option>GBP</option></select>
                  </Field>
                  <Field label="Timezone">
                    <select className={inputCls} value={form.timezone} onChange={(e) => set("timezone", e.target.value)}>
                      <option>UTC</option><option>America/New_York</option><option>Europe/London</option><option>Asia/Tokyo</option>
                    </select>
                  </Field>
                  <Field label="Default Risk per Trade (%)">
                    <input type="number" step="0.1" className={inputCls} value={form.defaultRiskPct} onChange={(e) => set("defaultRiskPct", e.target.value)} />
                  </Field>
                  <Field label="Minimum Trading Days (new challenges)">
                    <input type="number" className={inputCls} value={form.minTradingDays} onChange={(e) => set("minTradingDays", e.target.value)} />
                  </Field>
                </div>
                <button onClick={save} className="bg-[var(--accent)] hover:bg-[var(--accent-hover)] active:scale-[0.98] text-[var(--text-inverse)] font-semibold text-sm px-4 py-2.5 rounded-lg transition-all">Save Preferences</button>
              </Card>

              <Card className="p-5 md:p-6">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h3 className="font-bold text-[var(--text-primary)] text-sm mb-1 flex items-center gap-1.5"><BellRing size={15} className="text-[var(--accent)]" /> Trade Reminders</h3>
                    <p className="text-xs text-[var(--text-muted)] leading-relaxed">Get a gentle nudge to log a trade if you haven't journaled by end of session.</p>
                  </div>
                  <Toggle checked={!!form.tradeReminders} onChange={() => { const v = !form.tradeReminders; set("tradeReminders", v); onSave({ ...form, tradeReminders: v }); }} />
                </div>
              </Card>
            </>
          )}

          {tab === "broker" && (
            <UpgradeGate profile={profile} feature="Broker Sync" description="Automatically sync trades from MT4/MT5 and real brokerages instead of entering them by hand.">
              <SnapTradeSyncTab session={session} toast={toast} />
            </UpgradeGate>
          )}

          {tab === "appearance" && (
            <Card className="p-5 md:p-6">
              <SectionHeader title="Appearance" icon={<Palette size={14} />} subtitle="Switch between the black and white theme." />
              <div className="flex items-center justify-between gap-4 bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-lg p-4">
                <div>
                  <div className="text-sm font-semibold text-[var(--text-primary)]">Theme</div>
                  <div className="text-xs text-[var(--text-muted)] mt-0.5">Your preference is saved on this device.</div>
                </div>
                <ThemeToggle />
              </div>
            </Card>
          )}

          {tab === "danger" && (
            <>
              <Card className="p-5 md:p-6">
                <SectionHeader title="Sign Out" subtitle="End your session on this device." />
                <button onClick={onSignOut} className="flex items-center gap-2 bg-[var(--bg-tertiary)] hover:bg-[var(--bg-quaternary)] text-[var(--text-primary)] font-semibold text-sm px-4 py-2.5 rounded-lg transition-all">
                  <LogOut size={15} /> Sign Out
                </button>
              </Card>

              <Card className="p-5 md:p-6 border-rose-900/50">
                <SectionHeader title="Delete Account" icon={<AlertTriangle size={14} className="text-rose-400" />} subtitle="Permanently delete your account, trades, and journal entries. This can't be undone." />
                <a href={`mailto:support@strikejournal.com?subject=Account%20deletion%20request&body=Please%20delete%20my%20account%20(${encodeURIComponent(session?.user?.email || "")}).`}
                  className="inline-flex items-center gap-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 font-semibold text-sm px-4 py-2.5 rounded-lg transition-all">
                  <Ban size={15} /> Request Account Deletion
                </a>
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

/* ============================================================
   PROFILE SETUP (mandatory username + age, once per account)
   ============================================================ */
