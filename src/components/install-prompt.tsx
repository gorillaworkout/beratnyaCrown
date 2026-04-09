"use client";

import { useState, useEffect, useCallback } from "react";
import { Download, X, Share } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

// Store prompt globally so it survives re-renders
let globalDeferredPrompt: BeforeInstallPromptEvent | null = null;

// Listen immediately (before React hydrates)
if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    globalDeferredPrompt = e as BeforeInstallPromptEvent;
  });
}

export function InstallPrompt() {
  const [canInstall, setCanInstall] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showGuide, setShowGuide] = useState(false);

  useEffect(() => {
    // Check if already in standalone mode
    if (
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone
    ) {
      setIsInstalled(true);
      return;
    }

    // Detect iOS
    const ua = window.navigator.userAgent;
    const isiOS =
      /iPad|iPhone|iPod/.test(ua) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    setIsIOS(isiOS);

    // Check session dismiss
    if (sessionStorage.getItem("pwa-dismissed")) {
      setDismissed(true);
    }

    // Check if prompt was already captured globally
    if (globalDeferredPrompt) {
      setCanInstall(true);
    }

    // Listen for future prompt events
    const handler = (e: Event) => {
      e.preventDefault();
      globalDeferredPrompt = e as BeforeInstallPromptEvent;
      setCanInstall(true);
    };

    const installedHandler = () => {
      setIsInstalled(true);
      globalDeferredPrompt = null;
      setCanInstall(false);
    };

    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("appinstalled", installedHandler);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("appinstalled", installedHandler);
    };
  }, []);

  const handleInstall = useCallback(async () => {
    if (globalDeferredPrompt) {
      try {
        await globalDeferredPrompt.prompt();
        const { outcome } = await globalDeferredPrompt.userChoice;
        if (outcome === "accepted") {
          setIsInstalled(true);
        }
      } catch {
        // prompt() can only be called once
      }
      globalDeferredPrompt = null;
      setCanInstall(false);
    } else {
      // No deferred prompt — show manual instructions
      setShowGuide(true);
    }
  }, []);

  const handleDismiss = () => {
    setDismissed(true);
    sessionStorage.setItem("pwa-dismissed", "1");
  };

  // Don't show if installed or dismissed
  if (isInstalled || dismissed) return null;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-amber-500/30 bg-gradient-to-r from-amber-500/10 via-amber-600/5 to-transparent p-4 backdrop-blur-md shadow-lg shadow-amber-500/5">
      {/* Dismiss */}
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

        {/* Install Button — always visible */}
        <button
          onClick={handleInstall}
          className="flex-shrink-0 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-bold text-sm px-4 py-2.5 transition-all shadow-lg shadow-amber-500/20 hover:shadow-amber-500/30 active:scale-95"
        >
          Install
        </button>
      </div>

      {/* Manual Guide (shows when prompt not available) */}
      {showGuide && (
        <div className="mt-3 pt-3 border-t border-white/10 space-y-2">
          {isIOS ? (
            <>
              <p className="text-xs font-semibold text-amber-400 mb-2">
                Untuk iPhone/iPad (Safari):
              </p>
              <div className="flex items-start gap-2 text-sm text-slate-300">
                <span className="text-amber-400 font-bold">1.</span>
                <span>
                  Tap tombol{" "}
                  <Share className="inline h-4 w-4 text-blue-400 -mt-0.5" />{" "}
                  <strong>Share</strong> di bawah Safari
                </span>
              </div>
              <div className="flex items-start gap-2 text-sm text-slate-300">
                <span className="text-amber-400 font-bold">2.</span>
                <span>
                  Scroll ke bawah, tap{" "}
                  <strong>&quot;Add to Home Screen&quot;</strong>
                </span>
              </div>
              <div className="flex items-start gap-2 text-sm text-slate-300">
                <span className="text-amber-400 font-bold">3.</span>
                <span>
                  Tap <strong>&quot;Add&quot;</strong> — selesai! 🎉
                </span>
              </div>
            </>
          ) : (
            <>
              <p className="text-xs font-semibold text-amber-400 mb-2">
                Untuk Android (Chrome):
              </p>
              <div className="flex items-start gap-2 text-sm text-slate-300">
                <span className="text-amber-400 font-bold">1.</span>
                <span>
                  Tap <strong>⋮</strong> (titik tiga) di kanan atas Chrome
                </span>
              </div>
              <div className="flex items-start gap-2 text-sm text-slate-300">
                <span className="text-amber-400 font-bold">2.</span>
                <span>
                  Tap <strong>&quot;Install app&quot;</strong> atau{" "}
                  <strong>&quot;Add to Home screen&quot;</strong>
                </span>
              </div>
              <div className="flex items-start gap-2 text-sm text-slate-300">
                <span className="text-amber-400 font-bold">3.</span>
                <span>
                  Tap <strong>&quot;Install&quot;</strong> — selesai! 🎉
                </span>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
