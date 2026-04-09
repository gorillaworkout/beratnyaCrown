"use client";

import { useState, useEffect, useCallback } from "react";
import { Download, X, Share, MoreVertical } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

let globalDeferredPrompt: BeforeInstallPromptEvent | null = null;

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    globalDeferredPrompt = e as BeforeInstallPromptEvent;
  });
}

type Platform = "android" | "ios-safari" | "ios-chrome" | "desktop" | "unknown";

function detectPlatform(): Platform {
  if (typeof window === "undefined") return "unknown";
  const ua = navigator.userAgent;

  const isIOS =
    /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

  if (isIOS) {
    // CriOS = Chrome on iOS
    if (/CriOS/i.test(ua)) return "ios-chrome";
    return "ios-safari";
  }

  if (/Android/i.test(ua)) return "android";
  return "desktop";
}

export function InstallPrompt() {
  const [canInstall, setCanInstall] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [platform, setPlatform] = useState<Platform>("unknown");

  useEffect(() => {
    if (
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone
    ) {
      setIsInstalled(true);
      return;
    }

    setPlatform(detectPlatform());

    const dismissedAt = localStorage.getItem("pwa-dismissed-at");
    if (dismissedAt) {
      const daysAgo =
        (Date.now() - parseInt(dismissedAt)) / (1000 * 60 * 60 * 24);
      if (daysAgo < 7) {
        setDismissed(true);
      } else {
        localStorage.removeItem("pwa-dismissed-at");
      }
    }

    if (globalDeferredPrompt) setCanInstall(true);

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
        if (outcome === "accepted") setIsInstalled(true);
      } catch {}
      globalDeferredPrompt = null;
      setCanInstall(false);
    }
  }, []);

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem("pwa-dismissed-at", Date.now().toString());
  };

  if (isInstalled || dismissed) return null;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-amber-500/30 bg-gradient-to-r from-amber-500/10 via-amber-600/5 to-transparent p-4 backdrop-blur-md shadow-lg shadow-amber-500/5">
      {/* Dismiss */}
      <button
        onClick={handleDismiss}
        className="absolute top-2 right-2 p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-colors z-10"
        aria-label="Tutup"
      >
        <X className="h-4 w-4" />
      </button>

      {/* Header */}
      <div className="flex items-center gap-3 mb-3">
        <div className="flex-shrink-0 rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 p-2.5 shadow-lg shadow-amber-500/20">
          <Download className="h-5 w-5 text-white" />
        </div>
        <div>
          <h3 className="font-bold text-white text-sm sm:text-base">
            Install CrownHub di HP kamu
          </h3>
          <p className="text-xs text-slate-400">
            Buka langsung dari home screen — tanpa buka browser!
          </p>
        </div>
      </div>

      {/* Auto Install Button (Chrome Android with prompt) */}
      {canInstall && (
        <button
          onClick={handleInstall}
          className="w-full rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-bold text-sm px-4 py-3 transition-all shadow-lg shadow-amber-500/20 hover:shadow-amber-500/30 active:scale-[0.98] mb-3"
        >
          ⚡ Install Sekarang
        </button>
      )}

      {/* iOS (Chrome or Safari — same steps, must use Safari) */}
      {!canInstall && (platform === "ios-chrome" || platform === "ios-safari") && (
        <div className="space-y-2.5">
          {platform === "ios-chrome" && (
            <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-3 mb-1">
              <p className="text-xs text-amber-300">
                💡 Buka halaman ini di <strong>Safari</strong> dulu, lalu ikuti langkah di bawah.
              </p>
            </div>
          )}
          <p className="text-xs font-semibold text-amber-400 uppercase tracking-wider">
            Cara Install di iPhone:
          </p>
          <div className="flex items-start gap-3 rounded-lg bg-white/5 border border-white/10 p-3">
            <div className="flex-shrink-0 w-7 h-7 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-400 font-bold text-xs mt-0.5">
              1
            </div>
            <div className="text-sm text-slate-300">
              <p>Buka <strong className="text-white">Safari</strong>, ketik di address bar:</p>
              <p className="mt-1 font-mono text-xs text-amber-300 bg-black/30 rounded px-2 py-1 select-all">app.crownallstar.com</p>
            </div>
          </div>
          <div className="flex items-start gap-3 rounded-lg bg-white/5 border border-white/10 p-3">
            <div className="flex-shrink-0 w-7 h-7 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-400 font-bold text-xs mt-0.5">
              2
            </div>
            <div className="text-sm text-slate-300">
              <p>Tap tombol <Share className="inline h-4 w-4 text-blue-400 -mt-0.5 mx-0.5" /> <strong className="text-white">Share</strong> di <strong className="text-white">bawah layar</strong> (kotak dengan panah ke atas)</p>
            </div>
          </div>
          <div className="flex items-start gap-3 rounded-lg bg-white/5 border border-white/10 p-3">
            <div className="flex-shrink-0 w-7 h-7 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-400 font-bold text-xs mt-0.5">
              3
            </div>
            <div className="text-sm text-slate-300">
              <p>Scroll ke bawah di menu Share, cari dan tap:</p>
              <p className="mt-1 inline-flex items-center gap-1.5 bg-white/10 rounded-lg px-3 py-1.5 text-white font-medium text-xs">
                <span className="text-base">➕</span> Add to Home Screen
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3 rounded-lg bg-white/5 border border-white/10 p-3">
            <div className="flex-shrink-0 w-7 h-7 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-400 font-bold text-xs mt-0.5">
              4
            </div>
            <div className="text-sm text-slate-300">
              <p>Tap <strong className="text-white">&quot;Add&quot;</strong> di kanan atas — selesai! 🎉</p>
              <p className="text-xs text-slate-500 mt-1">Icon CrownHub akan muncul di home screen kamu</p>
            </div>
          </div>
        </div>
      )}

      {/* Android Chrome (no prompt yet) */}
      {!canInstall && platform === "android" && (
        <div className="space-y-2.5">
          <p className="text-xs font-semibold text-amber-400 uppercase tracking-wider">
            Cara Install (Chrome):
          </p>
          <div className="flex items-center gap-3 rounded-lg bg-white/5 border border-white/10 p-3">
            <div className="flex-shrink-0 w-7 h-7 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-400 font-bold text-xs">
              1
            </div>
            <span className="text-sm text-slate-300">
              Tap{" "}
              <MoreVertical className="inline h-4 w-4 text-slate-300 -mt-0.5 mx-0.5" />{" "}
              <strong className="text-white">(titik tiga)</strong> di kanan atas
            </span>
          </div>
          <div className="flex items-center gap-3 rounded-lg bg-white/5 border border-white/10 p-3">
            <div className="flex-shrink-0 w-7 h-7 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-400 font-bold text-xs">
              2
            </div>
            <span className="text-sm text-slate-300">
              Pilih{" "}
              <strong className="text-white">
                &quot;Add to Home screen&quot;
              </strong>{" "}
              atau{" "}
              <strong className="text-white">&quot;Install app&quot;</strong>
            </span>
          </div>
          <div className="flex items-center gap-3 rounded-lg bg-white/5 border border-white/10 p-3">
            <div className="flex-shrink-0 w-7 h-7 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-400 font-bold text-xs">
              3
            </div>
            <span className="text-sm text-slate-300">
              Tap <strong className="text-white">&quot;Install&quot;</strong> —
              selesai! 🎉
            </span>
          </div>
        </div>
      )}

      {/* Desktop */}
      {!canInstall && platform === "desktop" && (
        <div className="space-y-2.5">
          <p className="text-xs font-semibold text-amber-400 uppercase tracking-wider">
            Cara Install (Desktop Chrome):
          </p>
          <div className="flex items-center gap-3 rounded-lg bg-white/5 border border-white/10 p-3">
            <div className="flex-shrink-0 w-7 h-7 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-400 font-bold text-xs">
              1
            </div>
            <span className="text-sm text-slate-300">
              Klik icon <strong className="text-white">install (⊕)</strong> di address bar
            </span>
          </div>
          <div className="flex items-center gap-3 rounded-lg bg-white/5 border border-white/10 p-3">
            <div className="flex-shrink-0 w-7 h-7 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-400 font-bold text-xs">
              2
            </div>
            <span className="text-sm text-slate-300">
              Klik <strong className="text-white">&quot;Install&quot;</strong> — selesai! 🎉
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
