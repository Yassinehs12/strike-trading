import React, { useContext } from "react";
import {
  X, XCircle, AlertTriangle, Flame, ArrowUpDown, CheckCircle, Info, Lock,
} from "lucide-react";
import { clamp } from "../../lib/format";
import { ASSET_GROUPS } from "../../constants";
import { isProPlan } from "../../lib/plan";

export const GlobalStyle = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&display=swap');
    .tj-root { font-family: 'Inter', ui-sans-serif, system-ui, sans-serif; }
    .tj-mono { font-family: 'JetBrains Mono', ui-monospace, monospace; }
    .tj-scrollbar::-webkit-scrollbar { height: 6px; width: 6px; }
    .tj-scrollbar::-webkit-scrollbar-track { background: transparent; }
    .tj-scrollbar::-webkit-scrollbar-thumb { background: #3f3f46; border-radius: 4px; }
    @keyframes tj-fade-in { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes tj-slide-in { from { opacity: 0; transform: translateX(16px); } to { opacity: 1; transform: translateX(0); } }
    @keyframes tj-pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.5; } }
    .tj-animate-in { animation: tj-fade-in 0.28s ease-out; }
    .tj-slide-in { animation: tj-slide-in 0.22s ease-out; }
    .tj-skeleton { animation: tj-pulse 1.4s ease-in-out infinite; }
  `}</style>
);

/* ============================================================
   MOCK DATA  (structured to map 1:1 onto future DB tables)
   ============================================================ */


export const AssetOptions = () => (
  <>
    {Object.entries(ASSET_GROUPS).map(([group, list]) => (
      <optgroup key={group} label={group}>
        {list.map((a) => <option key={a} value={a}>{a}</option>)}
      </optgroup>
    ))}
  </>
);


export const ToastContext = React.createContext(() => {});


export const useToast = () => React.useContext(ToastContext);


export const ToastContainer = ({ toasts }) => (
  <div className="fixed bottom-4 right-4 z-[100] space-y-2 w-[calc(100%-2rem)] sm:w-auto">
    {toasts.map((t) => (
      <div key={t.id} className={`tj-slide-in flex items-center gap-2 px-4 py-3 rounded-lg border shadow-xl text-sm font-medium sm:min-w-[280px]
        ${t.type === "error" ? "bg-rose-950 border-rose-800 text-rose-200" : t.type === "info" ? "bg-[var(--bg-secondary)] border-[var(--border-secondary)] text-[var(--text-primary)]" : "bg-emerald-950 border-emerald-800 text-emerald-200"}`}>
        {t.type === "error" ? <XCircle size={16} /> : t.type === "info" ? <Info size={16} /> : <CheckCircle size={16} />}
        {t.message}
      </div>
    ))}
  </div>
);

/* ============================================================
   SMALL UI PRIMITIVES
   ============================================================ */


export const Card = ({ className = "", children }) => (
  <div
    className={`rounded-xl border ${className}`}
    style={{ backgroundColor: "var(--card-bg)", borderColor: "var(--card-border)", boxShadow: "var(--card-shadow)" }}
  >
    {children}
  </div>
);

// A profile counts as Pro if its plan is "pro", or if it's an admin (comp'd
// access). No billing is wired up yet, so upgrades happen by an admin
// setting plan='pro' directly in the database — see the SQL migration.


export const UpgradeGate = ({ profile, feature, description, children }) => {
  if (isProPlan(profile)) return children;
  return (
    <div className="relative">
      <div className="pointer-events-none select-none blur-[3px] opacity-40">{children}</div>
      <div className="absolute inset-0 flex items-center justify-center p-6">
        <div className="max-w-sm text-center bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl p-6 shadow-lg" style={{ backgroundColor: "var(--bg-secondary)" }}>
          <div className="w-10 h-10 rounded-full bg-[var(--accent)]/15 flex items-center justify-center mx-auto mb-3">
            <Lock size={18} className="text-[var(--accent)]" />
          </div>
          <h3 className="font-bold text-[var(--text-primary)] mb-1">{feature} is a Pro feature</h3>
          <p className="text-xs text-[var(--text-muted)] mb-4">{description}</p>
          <a
            href="/pricing"
            className="inline-block bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white font-semibold text-sm px-4 py-2.5 rounded-lg transition-all"
          >
            See Pro plans
          </a>
        </div>
      </div>
    </div>
  );
};


export const SectionHeader = ({ title, subtitle, icon, noMargin }) => (
  <div className={noMargin ? "" : "mb-4"}>
    <h3 className="font-bold text-[var(--text-primary)] text-sm flex items-center gap-1.5">
      {icon && <span className="text-[var(--text-muted)]">{icon}</span>}
      {title}
    </h3>
    {subtitle && <p className="text-xs text-[var(--text-muted)] mt-1 leading-relaxed">{subtitle}</p>}
  </div>
);


export const EmptyState = ({ icon: Icon, title, sub, action }) => (
  <div className="flex flex-col items-center justify-center text-center py-14 px-4">
    <div className="w-12 h-12 rounded-full bg-[var(--bg-tertiary)] flex items-center justify-center mb-3">
      <Icon size={20} className="text-[var(--text-muted)]" />
    </div>
    <p className="text-sm font-semibold text-[var(--text-secondary)]">{title}</p>
    {sub && <p className="text-xs text-[var(--text-muted)] mt-1 max-w-xs">{sub}</p>}
    {action}
  </div>
);


export const Skeleton = ({ className = "" }) => <div className={`tj-skeleton bg-[var(--bg-tertiary)] rounded-lg ${className}`} />;


export const LoadingScreen = () => (
  <div className="p-4 md:p-6 space-y-6">
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 md:gap-4">
      {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
    </div>
    <Skeleton className="h-64" />
    <Skeleton className="h-48" />
  </div>
);


export const StatusPill = ({ status }) => {
  const map = {
    Win: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
    Loss: "bg-rose-500/10 text-rose-400 border-rose-500/30",
    BE: "bg-[var(--text-muted)]/10 text-[var(--text-tertiary)] border-[var(--text-muted)]/30",
    Passed: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
    Funded: "bg-amber-500/10 text-amber-400 border-amber-500/30",
    Failed: "bg-rose-500/10 text-rose-400 border-rose-500/30",
    "In Progress": "bg-sky-500/10 text-sky-400 border-sky-500/30",
  };
  return <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${map[status] || map.BE}`}>{status}</span>;
};


export const GaugeBar = ({ label, usedPct, breached, rightLabel, danger = true }) => {
  const pct = clamp(usedPct, 0, 100);
  const critical = pct >= 85 && !breached;
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs text-[var(--text-tertiary)] flex items-center gap-1">
          <Flame size={12} className={breached ? "text-rose-400" : critical ? "text-amber-400" : "text-[var(--text-muted)]"} /> {label}
        </span>
        <span className={`tj-mono text-xs font-semibold ${breached ? "text-rose-400" : critical ? "text-amber-400" : "text-[var(--text-secondary)]"}`}>{rightLabel}</span>
      </div>
      <div className="relative h-3 rounded-full overflow-hidden bg-[var(--bg-tertiary)]">
        {/* full heat gradient track — green (safe) through amber to red (near/at breach) */}
        <div className="absolute inset-0" style={{ background: "linear-gradient(90deg, #10b981 0%, #10b981 40%, #fbbf24 65%, #fb923c 82%, #f43f5e 100%)" }} />
        {/* dim everything beyond the current position so only the reached heat level shows */}
        <div className="absolute inset-y-0 right-0 bg-[var(--bg-tertiary)] transition-all duration-500" style={{ left: `${pct}%` }} />
        {/* position marker */}
        <div
          className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-1.5 h-4 rounded-full bg-white shadow-[0_0_6px_rgba(0,0,0,0.5)] transition-all duration-500 ${critical || breached ? "animate-pulse" : ""}`}
          style={{ left: `${clamp(pct, 1.5, 98.5)}%` }}
        />
        <div className="absolute inset-0 flex justify-between px-[1px] pointer-events-none">
          {Array.from({ length: 10 }).map((_, i) => <div key={i} className="w-px h-full bg-[var(--bg-primary)]/30" />)}
        </div>
      </div>
    </div>
  );
};


export const ProgressBar = ({ pct, color = "bg-[var(--accent)]" }) => (
  <div className="h-2 w-full rounded-full bg-[var(--bg-tertiary)] overflow-hidden">
    <div className={`h-full rounded-full ${color} transition-all duration-500`} style={{ width: `${clamp(pct, 1, 100)}%` }} />
  </div>
);


export const KPICard = ({ icon: Icon, label, value, sub, accent = "text-[var(--text-primary)]" }) => (
  <Card className="p-4 tj-animate-in">
    <div className="flex items-center justify-between mb-3">
      <span className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide">{label}</span>
      <div className="w-7 h-7 rounded-lg bg-[var(--bg-tertiary)] flex items-center justify-center"><Icon size={14} className="text-[var(--accent)]" /></div>
    </div>
    <div className={`tj-mono text-2xl font-bold ${accent}`}>{value}</div>
    {sub && <div className="text-xs text-[var(--text-muted)] mt-1">{sub}</div>}
  </Card>
);

/* ============================================================
   NAVIGATION
   ============================================================ */


export const Modal = ({ open, onClose, title, children, wide }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-[var(--bg-primary)]/70 backdrop-blur-sm p-0 sm:p-4">
      <div className={`bg-[var(--bg-secondary)] border border-white/10 w-full ${wide ? "sm:max-w-2xl" : "sm:max-w-md"} sm:rounded-2xl rounded-t-2xl max-h-[92vh] overflow-y-auto tj-scrollbar tj-animate-in`}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 sticky top-0 bg-[var(--bg-secondary)] z-10">
          <h3 className="font-bold text-[var(--text-primary)]">{title}</h3>
          <button onClick={onClose} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"><X size={20} /></button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
};


export const Drawer = ({ open, onClose, title, children }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-[var(--bg-primary)]/70 backdrop-blur-sm">
      <div className="bg-[var(--bg-secondary)] border-l border-white/10 w-full sm:max-w-md h-full overflow-y-auto tj-scrollbar tj-slide-in">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 sticky top-0 bg-[var(--bg-secondary)] z-10">
          <h3 className="font-bold text-[var(--text-primary)]">{title}</h3>
          <button onClick={onClose} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"><X size={20} /></button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
};


export const Field = ({ label, error, hint, children }) => (
  <div className="mb-4">
    <label className="block text-xs font-medium text-[var(--text-tertiary)] mb-1.5">{label}</label>
    {children}
    {error && <p className="text-xs text-rose-400 mt-1 flex items-center gap-1"><AlertTriangle size={11} /> {error}</p>}
    {!error && hint && <p className="text-xs text-[var(--text-faint)] mt-1">{hint}</p>}
  </div>
);


export const SortHeader = ({ label, sortKey, sortConfig, onSort }) => (
  <th className="px-4 py-3 font-medium cursor-pointer select-none hover:text-[var(--text-secondary)] transition-colors" onClick={() => onSort(sortKey)}>
    <span className="flex items-center gap-1">{label}<ArrowUpDown size={11} className={sortConfig.key === sortKey ? "text-[var(--accent)]" : "text-[var(--text-faint)]"} /></span>
  </th>
);


export const CustomTooltip = ({ active, payload, label, prefix = "" }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[var(--bg-primary)] border border-white/10 rounded-lg px-3 py-2 text-xs shadow-xl">
      <div className="text-[var(--text-muted)] mb-1">{label}</div>
      {payload.map((p, i) => (
        <div key={i} className="tj-mono font-semibold" style={{ color: p.color || p.fill }}>{prefix}{typeof p.value === "number" ? p.value.toLocaleString() : p.value}</div>
      ))}
    </div>
  );
};
