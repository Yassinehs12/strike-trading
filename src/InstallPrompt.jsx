import React, { useState, useEffect } from "react";
import { X, Share, PlusSquare, Download } from "lucide-react";

const DISMISS_KEY = "sj-install-dismissed-until";

function isStandalone() {
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    window.navigator.standalone === true
  );
}

function getPlatform() {
  const ua = window.navigator.userAgent;
  const isIOS = /iPad|iPhone|iPod/.test(ua) && !window.MSStream;
  const isAndroid = /Android/.test(ua);
  return { isIOS, isAndroid, isMobile: isIOS || isAndroid };
}

// Slim dismissible banner offering to add the app to the home screen.
// Android/Chrome gets the real native install prompt (via the
// beforeinstallprompt event); iOS Safari has no equivalent API, so it gets
// step-by-step instructions instead, since Apple only allows installing
// through the Share sheet.
export function InstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [dismissed, setDismissed] = useState(true);
  const [showIOSHelp, setShowIOSHelp] = useState(false);
  const { isIOS, isMobile } = getPlatform();

  useEffect(() => {
    if (isStandalone() || !isMobile) return;
    const until = Number(localStorage.getItem(DISMISS_KEY) || 0);
    if (Date.now() < until) return;
    setDismissed(false);

    const onBeforeInstall = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    return () => window.removeEventListener("beforeinstallprompt", onBeforeInstall);
  }, []);

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, String(Date.now() + 14 * 24 * 60 * 60 * 1000));
    setDismissed(true);
  };

  const install = async () => {
    if (isIOS) { setShowIOSHelp(true); return; }
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    if (outcome === "accepted") setDismissed(true);
  };

  if (dismissed || !isMobile) return null;
  // On Android, only show once the browser actually offers the native
  // prompt — otherwise there's nothing useful the button can do yet.
  if (!isIOS && !deferredPrompt) return null;

  return (
    <>
      <div className="flex items-center gap-3 px-4 py-2.5 border-b" style={{ backgroundColor: "var(--accent)", borderColor: "var(--border-primary)" }}>
        <Download size={16} className="text-white shrink-0" />
        <p className="text-xs font-medium text-white flex-1 min-w-0">
          Add Strike Journal to your home screen for quicker access.
        </p>
        <button onClick={install} className="text-xs font-bold text-[var(--accent)] bg-white px-3 py-1.5 rounded-md shrink-0">
          Install
        </button>
        <button onClick={dismiss} className="text-white/80 hover:text-white shrink-0"><X size={16} /></button>
      </div>
      {showIOSHelp && <IOSInstallModal onClose={() => { setShowIOSHelp(false); dismiss(); }} />}
    </>
  );
}

// Also usable standalone from the user menu, so people can trigger it any
// time, not only when the auto-banner happens to be showing.
export function InstallMenuItem({ onOpenIOSHelp }) {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const { isIOS, isMobile } = getPlatform();

  useEffect(() => {
    const onBeforeInstall = (e) => { e.preventDefault(); setDeferredPrompt(e); };
    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    return () => window.removeEventListener("beforeinstallprompt", onBeforeInstall);
  }, []);

  if (isStandalone()) return null;
  if (!isMobile && !deferredPrompt) return null; // desktop with no install support: hide rather than show a dead button

  const handleClick = async () => {
    if (isIOS) { onOpenIOSHelp(); return; }
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
  };

  return (
    <button
      onClick={handleClick}
      className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors"
    >
      <Download size={16} /> Install App
    </button>
  );
}

export function IOSInstallModal({ onClose }) {
  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        className="w-full sm:w-96 rounded-2xl overflow-hidden border"
        style={{ backgroundColor: "var(--bg-secondary)", borderColor: "var(--border-primary)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 pt-5 pb-2">
          <h3 className="font-bold text-[var(--text-primary)]">Add to Home Screen</h3>
          <button onClick={onClose} className="text-[var(--text-faint)] hover:text-[var(--text-primary)]"><X size={18} /></button>
        </div>
        <div className="px-5 pb-6 space-y-4">
          <p className="text-sm text-[var(--text-muted)]">iOS doesn't allow apps to install themselves — just three quick taps:</p>
          <div className="flex items-start gap-3">
            <div className="w-7 h-7 rounded-full bg-[var(--accent)]/15 flex items-center justify-center text-xs font-bold text-[var(--accent)] shrink-0">1</div>
            <p className="text-sm text-[var(--text-secondary)] pt-0.5">Tap the <Share size={14} className="inline -mt-0.5 mx-0.5" /> <strong>Share</strong> button in Safari's toolbar.</p>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-7 h-7 rounded-full bg-[var(--accent)]/15 flex items-center justify-center text-xs font-bold text-[var(--accent)] shrink-0">2</div>
            <p className="text-sm text-[var(--text-secondary)] pt-0.5">Scroll down and tap <PlusSquare size={14} className="inline -mt-0.5 mx-0.5" /> <strong>Add to Home Screen</strong>.</p>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-7 h-7 rounded-full bg-[var(--accent)]/15 flex items-center justify-center text-xs font-bold text-[var(--accent)] shrink-0">3</div>
            <p className="text-sm text-[var(--text-secondary)] pt-0.5">Tap <strong>Add</strong> in the top right — done.</p>
          </div>
          <p className="text-[11px] text-[var(--text-faint)] pt-1">Note: this only works from Safari. Other iOS browsers (Chrome, Brave, etc.) can't add to the home screen due to Apple's restrictions.</p>
        </div>
      </div>
    </div>
  );
}
