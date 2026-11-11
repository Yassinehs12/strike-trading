import { useEffect, useState } from "react";

// Cookie / third-party-content consent. Stored only in this browser.
// "accepted"  -> optional third-party embeds (e.g. TradingView heatmaps) may load
// "rejected"  -> only strictly necessary storage is used
// null        -> not decided yet (banner shown)
const KEY = "cookieConsent";
const EVENT = "cookie-consent-change";

export const getConsent = () => {
  try {
    const v = localStorage.getItem(KEY);
    return v === "accepted" || v === "rejected" ? v : null;
  } catch { return null; }
};

export const setConsent = (value) => {
  try {
    if (value) localStorage.setItem(KEY, value);
    else localStorage.removeItem(KEY);
  } catch {}
  window.dispatchEvent(new Event(EVENT));
};

// Lets a footer / policy link re-open the banner so people can change their mind.
export const reopenConsent = () => setConsent(null);

export const useConsent = () => {
  const [consent, setState] = useState(getConsent);
  useEffect(() => {
    const sync = () => setState(getConsent());
    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", sync);
    return () => { window.removeEventListener(EVENT, sync); window.removeEventListener("storage", sync); };
  }, []);
  return consent;
};
