"use client";

import { useState, useEffect } from "react";
import { Download, X, Share } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  useEffect(() => {
    // Check if already installed (standalone mode)
    if (
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone
    ) {
      setIsInstalled(true);
      return;
    }

    // Detect iOS
    const ua = window.navigator.userAgent;
    const isiOS = /iPad|iPhone|iPod/.test(ua) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    setIsIOS(isiOS);

    // Check if user dismissed before (session only)
    if (sessionStorage.getItem("pwa-dismissed")) {
      setDismissed(true);
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const installedHandler = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("appinstalled", installedHandler);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("appinstalled", installedHandler);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setIsInstalled(true);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setDismissed(true);
    sessionStorage.setItem("pwa-dismissed", "1");
  };

  // Don't show if installed or dismissed
  if (isInstalled || dismissed) return null;

  // Don't show if not iOS and no prompt available (browser doesn't support PWA install)
  if (!isIOS && !deferredPrompt) return null;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-amber-500/30 bg-gradient-to-r from-amber-500/10 via-amber-600/5 to-transparent p-4 backdrop-blur-md shadow-lg shadow-amber-500/5">
      {/* Dismiss button */}
      <button
        onClick={handleDismiss}
        className="absolute top-2 right-2 p-1 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-colors z-10"
        aria-label="Tutup"
      >
        <X className="h-4 w-4" />
      </button>

      <div className="flex items-center gap-4">
        {/* Icon */}
        <div className="flex-shrink-0 rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 p-3 shadow-lg shadow-amber-500/20">
          <Download className="h-6 w-6 text-white" />
        </div>

        {/* Text */}
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-white text-sm sm:text-base">
            Install CrownHub
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Akses lebih cepat langsung dari home screen — tanpa buka browser!
          </p>
        </div>

        {/* Install button — Android/Chrome */}
        {deferredPrompt && (
          <button
            onClick={handleInstall}
            className="flex-shrink-0 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-bold text-sm px-4 py-2.5 transition-all shadow-lg shadow-amber-500/20 hover:shadow-amber-500/30 active:scale-95"
          >
            Install
          </button>
        )}

        {/* iOS — show guide button */}
        {isIOS && !deferredPrompt && (
          <button
            onClick={() => setShowIOSGuide(!showIOSGuide)}
            className="flex-shrink-0 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-bold text-sm px-4 py-2.5 transition-all shadow-lg shadow-amber-500/20 hover:shadow-amber-500/30 active:scale-95"
          >
            Cara Install
          </button>
        )}
      </div>

      {/* iOS Instructions */}
      {showIOSGuide && (
        <div className="mt-3 pt-3 border-t border-white/10 space-y-2">
          <div className="flex items-start gap-2 text-sm text-slate-300">
            <span className="text-amber-400 font-bold">1.</span>
            <span>Tap tombol <Share className="inline h-4 w-4 text-blue-400 -mt-0.5" /> <strong>Share</strong> di bawah Safari</span>
          </div>
          <div className="flex items-start gap-2 text-sm text-slate-300">
            <span className="text-amber-400 font-bold">2.</span>
            <span>Scroll ke bawah, tap <strong>&quot;Add to Home Screen&quot;</strong></span>
          </div>
          <div className="flex items-start gap-2 text-sm text-slate-300">
            <span className="text-amber-400 font-bold">3.</span>
            <span>Tap <strong>&quot;Add&quot;</strong> — selesai! 🎉</span>
          </div>
        </div>
      )}
    </div>
  );
}
