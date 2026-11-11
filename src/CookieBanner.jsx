import React from "react";
import { Cookie } from "lucide-react";
import { setConsent, useConsent } from "./lib/consent";

// Equal-weight Accept / Reject buttons on purpose — no dark patterns.
const CookieBanner = () => {
  const consent = useConsent();
  if (consent) return null;
  return (
    <div role="dialog" aria-label="Cookie consent" aria-live="polite"
      className="fixed bottom-3 left-3 right-3 sm:left-auto sm:right-4 sm:bottom-4 sm:max-w-md z-[100] rounded-xl border p-4 shadow-2xl"
      style={{ backgroundColor: "var(--card-bg)", borderColor: "var(--card-border)" }}>
      <div className="flex items-start gap-3">
        <Cookie size={18} className="text-[var(--accent)] shrink-0 mt-0.5" aria-hidden="true" />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-[var(--text-primary)] mb-1">Your privacy choices</p>
          <p className="text-xs text-[var(--text-tertiary)] leading-relaxed">
            We use storage that is strictly necessary to keep you signed in and remember your theme. With
            your permission we also load third-party content, such as TradingView market heatmaps. We
            don't use advertising cookies. See our{" "}
            <a href="/cookies" className="underline text-[var(--text-secondary)] hover:text-[var(--text-primary)]">Cookie Policy</a>.
          </p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 mt-3">
        <button onClick={() => setConsent("rejected")}
          className="text-sm font-semibold py-2 rounded-lg border border-white/15 text-[var(--text-primary)] hover:bg-white/[0.05] transition-colors">
          Reject non-essential
        </button>
        <button onClick={() => setConsent("accepted")}
          className="text-sm font-semibold py-2 rounded-lg border border-white/15 text-[var(--text-primary)] hover:bg-white/[0.05] transition-colors">
          Accept all
        </button>
      </div>
    </div>
  );
};

export default CookieBanner;
