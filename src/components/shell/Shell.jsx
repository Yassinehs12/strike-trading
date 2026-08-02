import React, { useState, useEffect, useRef } from "react";
import {
  Plus, Activity, Menu, Loader2, LogOut, UserCircle, Bell, Check, Palette, CheckCheck, UserPlus, Megaphone, Inbox, ChevronDown,
} from "lucide-react";
import { fetchPendingFriendRequests, subscribeToFriendRequests, acceptFriendRequest, fetchNotifications, markNotificationRead, markAllNotificationsRead, subscribeToNotifications } from "../../db";
import ThemeToggle from "../../ThemeToggle.jsx";
import AdminBadge from "../../AdminBadge.jsx";
import { InstallMenuItem, IOSInstallModal } from "../../InstallPrompt";
import { badgeFromKey } from "../../Badges";
import { LogoFull } from "../../Logo";
import { ADMIN_NAV_ITEM, NAV_GROUPS, NOTIF_ICON } from "../../constants";

export const Sidebar = ({ active, setActive, mobileOpen, setMobileOpen, user, profile, onSignOut }) => {
  const groups = NAV_GROUPS.map((g, i) =>
    i === NAV_GROUPS.length - 1 && profile?.is_admin ? { ...g, items: [...g.items, ADMIN_NAV_ITEM] } : g
  );
  return (
  <>
    <aside className={`fixed z-40 inset-y-0 left-0 w-64 bg-[var(--bg-primary)] border-r border-white/10 flex flex-col
      transition-transform duration-300 ${mobileOpen ? "translate-x-0" : "-translate-x-full"} md:translate-x-0 md:static`}>
      <div className="h-16 flex items-center gap-2 px-5 border-b border-white/10">
        <LogoFull size={30} textClass="text-base" />
      </div>
      <nav className="flex-1 px-3 py-4 space-y-4 overflow-y-auto tj-scrollbar">
        {groups.map((group, gi) => (
          <div key={group.label || `group-${gi}`}>
            {group.label && (
              <div className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-faint)]">{group.label}</div>
            )}
            <div className="space-y-1">
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = active === item.id;
                return (
                  <button key={item.id} onClick={() => { setActive(item.id); setMobileOpen(false); }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
                      ${isActive ? "bg-[var(--accent)]/10 text-[var(--accent)]" : "text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]"}`}>
                    <Icon size={17} />{item.label}
                  </button>
                );
              })}
            </div>
            {gi < groups.length - 1 && <div className="mt-4 border-t border-white/10" />}
          </div>
        ))}
      </nav>
    </aside>
    {mobileOpen && <div className="fixed inset-0 bg-[var(--bg-primary)]/60 z-30 md:hidden" onClick={() => setMobileOpen(false)} />}
  </>
  );
};

// Synthesized two-tone chime via Web Audio API — no audio file to host or
// load, works instantly, and is easy to keep short/subtle/professional.


export const playNotificationChime = () => {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const now = ctx.currentTime;
    [[880, 0], [1318.5, 0.09]].forEach(([freq, delay]) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, now + delay);
      gain.gain.linearRampToValueAtTime(0.16, now + delay + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + delay + 0.32);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now + delay);
      osc.stop(now + delay + 0.34);
    });
    setTimeout(() => ctx.close(), 700);
  } catch {
    // Audio isn't critical — never let a sound failure break notifications.
  }
};


export const timeAgo = (dateStr) => {
  const diff = Math.max(0, (Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return "now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d`;
  return new Date(dateStr).toLocaleDateString([], { month: "short", day: "numeric" });
};


export const NotificationBell = ({ session, profile, setActive }) => {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState("requests"); // "requests" | "activity"
  const [requests, setRequests] = useState([]);
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [acceptingId, setAcceptingId] = useState(null);
  const ref = useRef(null);
  const knownIds = useRef(null); // null until first load, so we never chime on initial page load

  const load = () => {
    setLoading(true);
    Promise.all([
      fetchPendingFriendRequests(session.user.id).catch(() => []),
      fetchNotifications(session.user.id).catch(() => []),
    ]).then(([reqs, notifs]) => {
      setRequests(reqs);
      setActivity(notifs);
      if (knownIds.current !== null) {
        const isNew = notifs.some((n) => !knownIds.current.has(n.id));
        if (isNew) playNotificationChime();
      }
      knownIds.current = new Set(notifs.map((n) => n.id));
    }).finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    const unsub1 = subscribeToFriendRequests(session.user.id, () => load());
    const unsub2 = subscribeToNotifications(session.user.id, () => load());
    return () => { unsub1(); unsub2(); };
  }, [session.user.id]);

  useEffect(() => {
    const onClickOutside = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const accept = async (id) => {
    setAcceptingId(id);
    try {
      await acceptFriendRequest(id, profile?.username);
      setRequests((prev) => prev.filter((r) => r.id !== id));
    } catch {
      // no-op, leave request visible so they can retry
    } finally {
      setAcceptingId(null);
    }
  };

  const openActivityItem = async (n) => {
    if (!n.read) markNotificationRead(n.id).catch(() => {});
    setActivity((prev) => prev.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
    setOpen(false);
    if (n.type === "message") setActive("messages");
    else if (n.type === "reply") setActive("forum");
    else if (n.type === "mention") setActive("forum");
    else if (n.type === "spotlight") setActive("forum");
    else if (n.type === "leaderboard_reset") setActive("leaderboard");
    else if (n.type === "badge_granted") setActive("profile");
  };

  const markAllRead = async () => {
    setActivity((prev) => prev.map((n) => ({ ...n, read: true })));
    try { await markAllNotificationsRead(session.user.id); } catch {}
  };

  const unreadActivity = activity.filter((n) => !n.read).length;
  const totalBadge = requests.length + unreadActivity;

  const activityLabel = (n) => {
    if (n.type === "reply") return `${n.from_username} replied to your post`;
    if (n.type === "message") return `${n.from_username} sent you a message`;
    if (n.type === "friend_accepted") return `${n.from_username} accepted your friend request`;
    if (n.type === "mention") return `${n.from_username} mentioned you`;
    if (n.type === "spotlight") return `New Trade of the Week: ${n.from_username}`;
    if (n.type === "leaderboard_reset") return "The leaderboard has reset — new week, fresh start";
    if (n.type === "badge_granted") return `You earned the "${badgeFromKey(n.body).label}" badge`;
    return "New activity";
  };

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen((o) => !o)} className="relative text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors p-1.5 rounded-lg hover:bg-[var(--bg-tertiary)]">
        <Bell size={20} />
        {totalBadge > 0 && (
          <span className="absolute -top-0.5 -right-0.5 bg-rose-500 text-white text-[10px] font-bold rounded-full min-w-[16px] h-4 flex items-center justify-center px-1 ring-2 ring-[var(--bg-primary)]">
            {totalBadge > 9 ? "9+" : totalBadge}
          </span>
        )}
      </button>
      {open && (
        <div
          className="fixed sm:absolute right-3 sm:right-0 left-auto mt-2 w-72 sm:w-80 max-w-[calc(100vw-1.5rem)] rounded-2xl overflow-hidden z-30 border"
          style={{ backgroundColor: "var(--bg-secondary)", borderColor: "var(--border-primary)", boxShadow: "0 20px 45px -12px rgba(0,0,0,0.45)" }}
        >
          <div className="flex items-center justify-between px-4 pt-3.5 pb-1">
            <h3 className="font-bold text-sm text-[var(--text-primary)] flex items-center gap-1.5"><Inbox size={15} className="text-[var(--accent)]" /> Notifications</h3>
            {tab === "activity" && unreadActivity > 0 && (
              <button onClick={markAllRead} className="flex items-center gap-1 text-[11px] font-semibold text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors">
                <CheckCheck size={12} /> Mark all read
              </button>
            )}
          </div>
          <div className="flex items-center gap-1 px-3 pt-1 border-b" style={{ borderColor: "var(--border-primary)" }}>
            <button onClick={() => setTab("requests")}
              className={`flex-1 text-xs font-semibold px-2 py-2.5 rounded-t-md transition-colors ${tab === "requests" ? "text-[var(--accent)] border-b-2 border-[var(--accent)]" : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"}`}>
              Friend Requests{requests.length > 0 ? ` (${requests.length})` : ""}
            </button>
            <button onClick={() => setTab("activity")}
              className={`flex-1 text-xs font-semibold px-2 py-2.5 rounded-t-md transition-colors ${tab === "activity" ? "text-[var(--accent)] border-b-2 border-[var(--accent)]" : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"}`}>
              Activity{unreadActivity > 0 ? ` (${unreadActivity})` : ""}
            </button>
          </div>
          <div className="max-h-80 overflow-y-auto">
            {loading ? (
              <div className="flex justify-center py-10"><Loader2 size={16} className="text-[var(--accent)] animate-spin" /></div>
            ) : tab === "requests" ? (
              requests.length === 0 ? (
                <div className="flex flex-col items-center text-center py-10 px-6">
                  <div className="w-10 h-10 rounded-full bg-[var(--bg-tertiary)] flex items-center justify-center mb-3"><UserPlus size={16} className="text-[var(--text-faint)]" /></div>
                  <p className="text-xs text-[var(--text-muted)]">No pending friend requests.</p>
                </div>
              ) : (
                requests.map((r) => (
                  <div key={r.id} className="flex items-center gap-2.5 px-4 py-2.5 hover:bg-[var(--bg-tertiary)] transition-colors">
                    {r.requester?.avatar_url ? (
                      <img src={r.requester.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover shrink-0" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-[var(--bg-tertiary)] flex items-center justify-center text-xs font-bold text-[var(--text-secondary)] shrink-0">
                        {(r.requester?.username || "?")[0].toUpperCase()}
                      </div>
                    )}
                    <span className="text-sm text-[var(--text-primary)] flex-1 truncate">{r.requester?.username || "Someone"}</span>
                    <button onClick={() => accept(r.id)} disabled={acceptingId === r.id}
                      className="flex items-center gap-1 bg-[var(--accent)] hover:bg-[var(--accent-hover)] disabled:opacity-50 text-white text-xs font-semibold px-2.5 py-1.5 rounded-md transition-all shrink-0">
                      {acceptingId === r.id ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />} Accept
                    </button>
                  </div>
                ))
              )
            ) : activity.length === 0 ? (
              <div className="flex flex-col items-center text-center py-10 px-6">
                <div className="w-10 h-10 rounded-full bg-[var(--bg-tertiary)] flex items-center justify-center mb-3"><Bell size={16} className="text-[var(--text-faint)]" /></div>
                <p className="text-xs text-[var(--text-muted)]">You're all caught up.</p>
              </div>
            ) : (
              activity.map((n) => {
                const meta = NOTIF_ICON[n.type] || { icon: Megaphone, className: "bg-[var(--bg-tertiary)] text-[var(--text-muted)]" };
                const Icon = meta.icon;
                return (
                  <button key={n.id} onClick={() => openActivityItem(n)}
                    className={`w-full text-left flex items-start gap-3 px-4 py-3 hover:bg-[var(--bg-tertiary)] transition-colors ${!n.read ? "bg-[var(--accent)]/[0.06]" : ""}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${meta.className}`}>
                      <Icon size={14} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-[var(--text-primary)] leading-snug">{activityLabel(n)}</p>
                      {n.body && n.type !== "badge_granted" && <p className="text-xs text-[var(--text-muted)] truncate mt-0.5">{n.body}</p>}
                      <p className="text-[11px] text-[var(--text-faint)] mt-1">{timeAgo(n.created_at)}</p>
                    </div>
                    {!n.read && <span className="w-2 h-2 rounded-full bg-[var(--accent)] mt-1.5 shrink-0" />}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};


export const UserMenu = ({ user, profile, setActive, onSignOut }) => {
  const [open, setOpen] = useState(false);
  const [showIOSHelp, setShowIOSHelp] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const onClickOutside = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const name = profile?.username || user?.email || "Trader";

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-full hover:bg-[var(--bg-tertiary)] transition-colors"
      >
        {profile?.avatar_url || user?.user_metadata?.avatar_url ? (
          <img src={profile?.avatar_url || user.user_metadata.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover" />
        ) : (
          <div className="w-8 h-8 rounded-full bg-[var(--accent)]/15 flex items-center justify-center text-xs font-bold text-[var(--accent)]">
            {name[0].toUpperCase()}
          </div>
        )}
        <ChevronDown size={14} className={`hidden sm:block text-[var(--text-faint)] transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div
          className="absolute right-0 mt-2 w-60 rounded-2xl overflow-hidden z-30 border"
          style={{ backgroundColor: "var(--bg-secondary)", borderColor: "var(--border-primary)", boxShadow: "0 20px 45px -12px rgba(0,0,0,0.45)" }}
        >
          <div className="flex items-center gap-3 px-4 py-3.5 border-b" style={{ borderColor: "var(--border-primary)" }}>
            {profile?.avatar_url || user?.user_metadata?.avatar_url ? (
              <img src={profile?.avatar_url || user.user_metadata.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover shrink-0" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-[var(--accent)]/15 flex items-center justify-center text-sm font-bold text-[var(--accent)] shrink-0">
                {name[0].toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="text-sm font-semibold text-[var(--text-primary)] truncate">{name}</span>
                {profile?.is_admin && <AdminBadge />}
              </div>
              {user?.email && <span className="text-xs text-[var(--text-muted)] truncate block">{user.email}</span>}
            </div>
          </div>
          <div className="p-1.5">
            <button
              onClick={() => { setActive("profile"); setOpen(false); }}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors"
            >
              <UserCircle size={16} /> View Profile
            </button>
            <button
              onClick={() => { setActive("settings"); setOpen(false); }}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors"
            >
              <Palette size={16} /> Settings
            </button>
            <InstallMenuItem onOpenIOSHelp={() => { setShowIOSHelp(true); setOpen(false); }} />
          </div>
          <div className="p-1.5 border-t" style={{ borderColor: "var(--border-primary)" }}>
            <button
              onClick={onSignOut}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium text-rose-400 hover:bg-rose-500/10 transition-colors"
            >
              <LogOut size={16} /> Sign Out
            </button>
          </div>
        </div>
      )}
      {showIOSHelp && <IOSInstallModal onClose={() => setShowIOSHelp(false)} />}
    </div>
  );
};


export const TopBar = ({ title, subtitle, onMenu, onLogTrade, showLogTrade, session, profile, setActive, onSignOut }) => (
  <div className="h-16 border-b border-white/10 flex items-center justify-between px-4 md:px-6 sticky top-0 bg-[var(--bg-primary)]/80 backdrop-blur z-20">
    <div className="flex items-center gap-3">
      <button className="md:hidden text-[var(--text-tertiary)]" onClick={onMenu}><Menu size={22} /></button>
      <div>
        <h1 className="text-base md:text-lg font-bold text-[var(--text-primary)]">{title}</h1>
        {subtitle && <p className="text-xs text-[var(--text-muted)] hidden sm:block">{subtitle}</p>}
      </div>
    </div>
    <div className="flex items-center gap-2 md:gap-3">
      <ThemeToggle />
      <NotificationBell session={session} profile={profile} setActive={setActive} />
      <div className="w-px h-6 bg-white/10 mx-0.5 hidden sm:block" />
      <UserMenu user={session?.user} profile={profile} setActive={setActive} onSignOut={onSignOut} />
      {showLogTrade && (
        <button onClick={onLogTrade} className="flex items-center gap-1.5 bg-[var(--accent)] hover:bg-[var(--accent)] active:scale-95 text-[var(--text-inverse)] font-semibold text-sm px-3 md:px-4 py-2 rounded-lg transition-all">
          <Plus size={16} strokeWidth={2.5} /><span className="hidden sm:inline">Log Trade</span>
        </button>
      )}
    </div>
  </div>
);

/* ============================================================
   MODAL / DRAWER WRAPPERS
   ============================================================ */
