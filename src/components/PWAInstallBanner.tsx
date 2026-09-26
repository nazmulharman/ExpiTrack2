import React, { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';

export const PWAInstallBanner: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [dismissed, setDismissed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('expitrack_pwa_banner_dismissed') === 'true';
    } catch {
      return false;
    }
  });
  const [showIOSModal, setShowIOSModal] = useState(false);

  if (isInstalled || dismissed) return null;
  if (!isInstallable && !isIOS) return null;

  const handleDismiss = () => {
    setDismissed(true);
    try {
      localStorage.setItem('expitrack_pwa_banner_dismissed', 'true');
    } catch {}
  };

  const handleInstallClick = async () => {
    if (isInstallable) {
      await install();
    } else if (isIOS) {
      setShowIOSModal(true);
    }
  };

  return (
    <>
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#005c55] via-[#0f766e] to-[#042f2c] p-3.5 text-white shadow-lg border border-[#6df5e1]/30 animate-in fade-in slide-in-from-top-2 duration-300">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-white/15 backdrop-blur-md flex items-center justify-center shrink-0 shadow-inner">
              <span className="material-symbols-outlined text-[24px] text-[#71f8e4]">
                install_mobile
              </span>
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-xs text-white">Install Mobile App</span>
                <span className="px-1.5 py-0.2 rounded-full bg-[#6df5e1] text-[#005c55] font-black text-[9px] uppercase tracking-wider">
                  Offline PWA
                </span>
              </div>
              <p className="text-[11px] text-white/80 truncate">
                Add to Home Screen for 100% offline access & instant launch
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={handleInstallClick}
              className="px-3 py-1.5 rounded-xl bg-[#6df5e1] hover:bg-[#a3faef] text-[#005c55] font-bold text-xs flex items-center gap-1 shadow-sm active:scale-95 transition-all cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">download</span>
              <span>Install</span>
            </button>
            <button
              onClick={handleDismiss}
              aria-label="Dismiss install banner"
              className="w-7 h-7 rounded-full flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-colors"
            >
              <span className="material-symbols-outlined text-[16px]">close</span>
            </button>
          </div>
        </div>
      </div>

      {/* iOS Instructions Modal */}
      {showIOSModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-end sm:items-center justify-center p-4">
          <div className="w-full max-w-sm bg-white dark:bg-[#131b2e] rounded-3xl p-5 shadow-2xl border border-[#eaedff] dark:border-[#283044] space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#005c55] dark:text-[#6df5e1] text-[24px]">
                  phone_iphone
                </span>
                <h3 className="font-bold text-sm text-[#131b2e] dark:text-white">
                  Install on iOS Safari
                </h3>
              </div>
              <button
                onClick={() => setShowIOSModal(false)}
                className="w-7 h-7 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <div className="space-y-3 text-xs text-[#3e4947] dark:text-[#bdc9c6]">
              <div className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-50 dark:bg-[#283044]">
                <span className="w-6 h-6 rounded-full bg-[#005c55] text-white flex items-center justify-center font-bold text-[11px] shrink-0">
                  1
                </span>
                <span>Tap the <strong>Share</strong> button <span className="inline-block px-1 bg-slate-200 dark:bg-slate-700 rounded">⎋</span> at the bottom of Safari.</span>
              </div>
              <div className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-50 dark:bg-[#283044]">
                <span className="w-6 h-6 rounded-full bg-[#005c55] text-white flex items-center justify-center font-bold text-[11px] shrink-0">
                  2
                </span>
                <span>Scroll down and tap <strong>Add to Home Screen</strong> <span className="inline-block px-1 bg-slate-200 dark:bg-slate-700 rounded">➕</span>.</span>
              </div>
              <div className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-50 dark:bg-[#283044]">
                <span className="w-6 h-6 rounded-full bg-[#005c55] text-white flex items-center justify-center font-bold text-[11px] shrink-0">
                  3
                </span>
                <span>Tap <strong>Add</strong> in the top right. ExpiTrack will appear on your home screen!</span>
              </div>
            </div>

            <button
              onClick={() => setShowIOSModal(false)}
              className="w-full py-2.5 rounded-xl bg-[#005c55] text-white font-bold text-xs"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  );
};
