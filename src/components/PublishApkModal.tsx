import React, { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { downloadFile } from '../services/storage';

interface PublishApkModalProps {
  isOpen: boolean;
  onClose: () => void;
  showToast: (msg: string, icon?: string) => void;
}

export const PublishApkModal: React.FC<PublishApkModalProps> = ({
  isOpen,
  onClose,
  showToast,
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [activeTab, setActiveTab] = useState<'cloud' | 'bubblewrap' | 'capacitor' | 'install'>('cloud');
  const [copiedCmd, setCopiedCmd] = useState<string | null>(null);

  if (!isOpen) return null;

  const rawOrigin = typeof window !== 'undefined' ? window.location.origin : 'https://ais-pre-26v6egkflimebrf3l4xb5y-739790172309.asia-east1.run.app';
  // Use public preview origin if on ais-dev so external packaging bots can reach the URL
  const currentOrigin = rawOrigin.replace('ais-dev-', 'ais-pre-');
  const manifestUrl = `${currentOrigin}/manifest.json`;
  const pwaBuilderUrl = `https://www.pwabuilder.com/reportcard?site=${encodeURIComponent(currentOrigin)}`;

  const cleanManifestObject = {
    id: "app.expitrack.vault",
    name: "ExpiTrack - Personal Expiry Vault",
    short_name: "ExpiTrack",
    description: "Personal vault that tracks expiry dates for groceries, medicines, and warranties with photo proof, smart OCR, and proactive reminders.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait-primary",
    background_color: "#131b2e",
    theme_color: "#131b2e",
    categories: ["utilities", "lifestyle", "productivity"],
    icons: [
      {
        src: `${currentOrigin}/pwa-192x192.png`,
        sizes: "192x192",
        type: "image/png",
        purpose: "any"
      },
      {
        src: `${currentOrigin}/pwa-512x512.png`,
        sizes: "512x512",
        type: "image/png",
        purpose: "any"
      },
      {
        src: `${currentOrigin}/pwa-maskable-512x512.png`,
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable"
      }
    ],
    shortcuts: [
      {
        name: "Scan Receipt or Bottle",
        short_name: "Scan OCR",
        description: "Quickly scan barcode or OCR expiry text",
        url: "/?action=scan",
        icons: [{ src: `${currentOrigin}/pwa-192x192.png`, sizes: "192x192", type: "image/png" }]
      },
      {
        name: "View Urgency Alerts",
        short_name: "Alerts",
        description: "Check expiring items and medicine schedules",
        url: "/?action=alerts",
        icons: [{ src: `${currentOrigin}/pwa-192x192.png`, sizes: "192x192", type: "image/png" }]
      }
    ],
    related_applications: [
      {
        platform: "play",
        id: "app.expitrack.vault"
      }
    ]
  };

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text).catch(() => {});
    setCopiedCmd(label);
    showToast(`Copied ${label} to clipboard`, 'content_copy');
    setTimeout(() => setCopiedCmd(null), 2500);
  };

  const handleCopyManifest = () => {
    navigator.clipboard.writeText(JSON.stringify(cleanManifestObject, null, 2)).catch(() => {});
    showToast('Clean Manifest JSON copied to clipboard', 'content_copy');
  };

  const handleDownloadAndroidBundle = () => {
    const bundle = {
      appId: "app.expitrack.vault",
      appName: "ExpiTrack - Personal Expiry Vault",
      version: "1.0.0",
      versionCode: 1,
      webManifestUrl: manifestUrl,
      targetPlatform: "Android (APK / AAB Google Play)",
      twaManifest: {
        packageId: "app.expitrack.vault",
        host: currentOrigin.replace(/^https?:\/\//, ''),
        name: "ExpiTrack",
        launcherName: "ExpiTrack",
        themeColor: "#131B2E",
        navigationColor: "#131B2E",
        backgroundColor: "#131B2E",
        startUrl: "/",
        iconUrl: `${currentOrigin}/pwa-512x512.png`,
        maskableIconUrl: `${currentOrigin}/pwa-maskable-512x512.png`
      },
      cliCommands: {
        bubblewrap: [
          "npm install -g @bubblewrap/cli",
          `bubblewrap init --manifest=${manifestUrl}`,
          "bubblewrap build"
        ],
        capacitor: [
          "npm install @capacitor/core @capacitor/cli @capacitor/android",
          "npx cap init ExpiTrack app.expitrack.vault --web-dir=dist",
          "npm run build",
          "npx cap add android",
          "npx cap open android"
        ]
      },
      generatedAt: new Date().toISOString()
    };

    downloadFile(
      JSON.stringify(bundle, null, 2),
      `ExpiTrack-Android-APK-Config-${new Date().toISOString().split('T')[0]}.json`,
      'application/json'
    );
    showToast('Android APK & Google Play package config downloaded', 'download');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div
        className="bg-white dark:bg-[#131b2e] w-full max-w-xl rounded-3xl shadow-2xl overflow-hidden border border-[#eaedff] dark:border-[#283044] flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-[#005c55] via-[#0f766e] to-[#131b2e] text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src="/logo.jpg"
              alt="ExpiTrack App Logo"
              className="w-12 h-12 rounded-2xl object-cover shadow-inner shrink-0 border border-white/25"
              referrerPolicy="no-referrer"
            />
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-[#6df5e1]">
                  Google Play & Android
                </span>
                <span className="px-2 py-0.5 rounded-full bg-white/20 text-[10px] font-bold">
                  v1.0.0 APK
                </span>
              </div>
              <h2 className="text-base font-bold">Publish & Build Android APK</h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-[#eaedff] dark:border-[#283044] bg-[#f8f9ff] dark:bg-[#1a2333]/50 px-3 pt-2 gap-1 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveTab('cloud')}
            className={`px-3 py-2 text-xs font-bold rounded-t-xl transition-all flex items-center gap-1.5 shrink-0 ${
              activeTab === 'cloud'
                ? 'bg-white dark:bg-[#131b2e] text-[#005c55] dark:text-[#6df5e1] border-t-2 border-t-[#005c55] dark:border-t-[#6df5e1] shadow-xs'
                : 'text-[#3e4947] dark:text-[#bdc9c6] hover:text-[#005c55]'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">cloud_download</span>
            <span>1-Click APK Generator</span>
          </button>

          <button
            onClick={() => setActiveTab('bubblewrap')}
            className={`px-3 py-2 text-xs font-bold rounded-t-xl transition-all flex items-center gap-1.5 shrink-0 ${
              activeTab === 'bubblewrap'
                ? 'bg-white dark:bg-[#131b2e] text-[#005c55] dark:text-[#6df5e1] border-t-2 border-t-[#005c55] dark:border-t-[#6df5e1] shadow-xs'
                : 'text-[#3e4947] dark:text-[#bdc9c6] hover:text-[#005c55]'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">terminal</span>
            <span>Google Bubblewrap (TWA)</span>
          </button>

          <button
            onClick={() => setActiveTab('capacitor')}
            className={`px-3 py-2 text-xs font-bold rounded-t-xl transition-all flex items-center gap-1.5 shrink-0 ${
              activeTab === 'capacitor'
                ? 'bg-white dark:bg-[#131b2e] text-[#005c55] dark:text-[#6df5e1] border-t-2 border-t-[#005c55] dark:border-t-[#6df5e1] shadow-xs'
                : 'text-[#3e4947] dark:text-[#bdc9c6] hover:text-[#005c55]'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">code</span>
            <span>Capacitor / Studio</span>
          </button>

          <button
            onClick={() => setActiveTab('install')}
            className={`px-3 py-2 text-xs font-bold rounded-t-xl transition-all flex items-center gap-1.5 shrink-0 ${
              activeTab === 'install'
                ? 'bg-white dark:bg-[#131b2e] text-[#005c55] dark:text-[#6df5e1] border-t-2 border-t-[#005c55] dark:border-t-[#6df5e1] shadow-xs'
                : 'text-[#3e4947] dark:text-[#bdc9c6] hover:text-[#005c55]'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">smartphone</span>
            <span>Phone WebAPK</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {/* TAB 1: 1-Click Cloud APK Generator */}
          {activeTab === 'cloud' && (
            <div className="space-y-4">
              {/* Fix for Error during package creation banner */}
              <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-start gap-3">
                <span className="material-symbols-outlined text-[22px] text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5">
                  task_alt
                </span>
                <div className="text-xs space-y-1">
                  <strong className="text-emerald-900 dark:text-emerald-200 block font-bold">
                    Resolved: &ldquo;Error during package creation&rdquo;
                  </strong>
                  <p className="text-emerald-800 dark:text-emerald-300 leading-relaxed text-[11px]">
                    All manifest icons have been converted to validated 512px and 192px PNG format (removing incompatible SVGs and remote CDN links that caused Bubblewrap/PWABuilder to crash during image processing).
                  </p>
                  <p className="text-emerald-800 dark:text-emerald-300 leading-relaxed text-[11px]">
                    Note: If PWABuilder ever blocks automated scraping due to Cloud Run cookie challenges, click <strong>Copy Clean Manifest</strong> below and paste it into PWABuilder, or run the 1-line Bubblewrap CLI command in the next tab.
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-[#f2f3ff] dark:bg-[#283044] border border-[#eaedff] dark:border-[#384259] flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#6df5e1]/30 text-[#005c55] dark:text-[#6df5e1] flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[24px]">verified</span>
                </div>
                <div className="text-xs">
                  <span className="font-bold text-[#131b2e] dark:text-white block text-sm mb-0.5">
                    PWABuilder Instant Google Play APK & AAB
                  </span>
                  <p className="text-[#3e4947] dark:text-[#bdc9c6] leading-relaxed">
                    ExpiTrack now contains the complete compliant Web App Manifest, Service Worker, and 512px maskable icons. You can generate a signed Google Play Store package (<code>.apk</code> and <code>.aab</code>) directly in the cloud in under 60 seconds with no Android SDK required.
                  </p>
                </div>
              </div>

              {/* Package Details */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-[#131b2e] dark:text-white uppercase tracking-wider">
                  Android App Package Specs
                </span>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                    <span className="text-[10px] text-slate-400 block">Package ID</span>
                    <strong className="text-[#005c55] dark:text-[#6df5e1] font-mono">app.expitrack.vault</strong>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                    <span className="text-[10px] text-slate-400 block">App Name</span>
                    <strong className="text-[#131b2e] dark:text-white font-mono">ExpiTrack</strong>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                    <span className="text-[10px] text-slate-400 block">Target Formats</span>
                    <strong className="text-[#131b2e] dark:text-white font-mono">.APK & .AAB (Play Store)</strong>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                    <span className="text-[10px] text-slate-400 block">App Architecture</span>
                    <strong className="text-[#131b2e] dark:text-white font-mono">PWA / TWA Fullscreen</strong>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2 pt-2">
                <a
                  href={pwaBuilderUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full py-3 px-4 rounded-xl bg-[#005c55] hover:bg-[#0f766e] text-white font-bold text-sm shadow-md flex items-center justify-center gap-2 active:scale-95 transition-all text-center"
                >
                  <span className="material-symbols-outlined text-[20px]">rocket_launch</span>
                  <span>Generate APK / AAB on PWABuilder</span>
                  <span className="material-symbols-outlined text-[16px]">open_in_new</span>
                </a>

                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={handleCopyManifest}
                    className="py-2.5 px-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors text-center"
                  >
                    <span className="material-symbols-outlined text-[16px]">content_copy</span>
                    <span className="truncate">Copy Manifest</span>
                  </button>

                  <a
                    href="/pwa-512x512.png"
                    download="expitrack-icon-512x512.png"
                    className="py-2.5 px-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors text-center"
                  >
                    <span className="material-symbols-outlined text-[16px]">image</span>
                    <span className="truncate">512px Icon</span>
                  </a>

                  <button
                    type="button"
                    onClick={handleDownloadAndroidBundle}
                    className="py-2.5 px-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors text-center"
                  >
                    <span className="material-symbols-outlined text-[16px]">download</span>
                    <span className="truncate">Config Kit</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Bubblewrap CLI */}
          {activeTab === 'bubblewrap' && (
            <div className="space-y-3 text-xs">
              <p className="text-[#3e4947] dark:text-[#bdc9c6]">
                Google&apos;s official command-line tool <strong>Bubblewrap</strong> wraps your web app into a high-performance Android Trusted Web Activity (TWA) with zero browser chrome:
              </p>

              <div className="space-y-2">
                <div>
                  <span className="font-bold text-[#131b2e] dark:text-white block mb-1">
                    Step 1: Install Google Bubblewrap CLI
                  </span>
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900 text-slate-100 font-mono text-[11px]">
                    <code>npm install -g @bubblewrap/cli</code>
                    <button
                      onClick={() => handleCopy("npm install -g @bubblewrap/cli", "Step 1")}
                      className="p-1 hover:text-[#6df5e1] text-slate-400"
                    >
                      <span className="material-symbols-outlined text-[15px]">
                        {copiedCmd === "Step 1" ? 'check' : 'content_copy'}
                      </span>
                    </button>
                  </div>
                </div>

                <div>
                  <span className="font-bold text-[#131b2e] dark:text-white block mb-1">
                    Step 2: Initialize from Live Manifest
                  </span>
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900 text-slate-100 font-mono text-[11px]">
                    <code className="truncate max-w-[340px]">bubblewrap init --manifest={manifestUrl}</code>
                    <button
                      onClick={() => handleCopy(`bubblewrap init --manifest=${manifestUrl}`, "Step 2")}
                      className="p-1 hover:text-[#6df5e1] text-slate-400"
                    >
                      <span className="material-symbols-outlined text-[15px]">
                        {copiedCmd === "Step 2" ? 'check' : 'content_copy'}
                      </span>
                    </button>
                  </div>
                </div>

                <div>
                  <span className="font-bold text-[#131b2e] dark:text-white block mb-1">
                    Step 3: Build Signed APK & AAB
                  </span>
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900 text-slate-100 font-mono text-[11px]">
                    <code>bubblewrap build</code>
                    <button
                      onClick={() => handleCopy("bubblewrap build", "Step 3")}
                      className="p-1 hover:text-[#6df5e1] text-slate-400"
                    >
                      <span className="material-symbols-outlined text-[15px]">
                        {copiedCmd === "Step 3" ? 'check' : 'content_copy'}
                      </span>
                    </button>
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                <span className="font-bold block">Outputs generated:</span>
                <ul className="list-disc pl-4 mt-1 space-y-0.5">
                  <li><code>app-release-signed.apk</code> — Sideload directly to Android devices</li>
                  <li><code>app-release-bundle.aab</code> — Upload directly to Google Play Console</li>
                </ul>
              </div>
            </div>
          )}

          {/* TAB 3: Capacitor / Android Studio */}
          {activeTab === 'capacitor' && (
            <div className="space-y-3 text-xs">
              <p className="text-[#3e4947] dark:text-[#bdc9c6]">
                Prefer full native Android Studio integration? Use <strong>Capacitor</strong>:
              </p>

              <div className="space-y-2">
                <div className="p-2.5 rounded-xl bg-slate-900 text-slate-100 font-mono text-[11px] space-y-1">
                  <div className="text-slate-400"># 1. Install Capacitor packages</div>
                  <div>npm i @capacitor/core @capacitor/android</div>
                  <div className="text-slate-400 mt-2"># 2. Add Android platform</div>
                  <div>npx cap add android</div>
                  <div className="text-slate-400 mt-2"># 3. Build & launch Android Studio</div>
                  <div>npm run build && npx cap open android</div>
                </div>
              </div>

              <p className="text-[#3e4947] dark:text-[#bdc9c6]">
                In Android Studio, click <strong>Build &gt; Build Bundle(s) / APK(s) &gt; Build APK(s)</strong> to generate your final APK in <code>android/app/build/outputs/apk/release/</code>.
              </p>
            </div>
          )}

          {/* TAB 4: Instant Phone Sideload / Install WebAPK */}
          {activeTab === 'install' && (
            <div className="space-y-3 text-xs">
              <div className="p-4 rounded-2xl bg-[#f2f3ff] dark:bg-[#283044] border border-[#eaedff] dark:border-[#384259] text-center space-y-3">
                <div className="w-14 h-14 rounded-2xl bg-[#005c55] text-white flex items-center justify-center mx-auto shadow-md">
                  <span className="material-symbols-outlined text-[32px]">smartphone</span>
                </div>
                <div>
                  <h3 className="font-bold text-sm text-[#131b2e] dark:text-white">
                    Direct WebAPK Install (No Play Store Required)
                  </h3>
                  <p className="text-[#3e4947] dark:text-[#bdc9c6] text-xs mt-1">
                    On Android, Chromium generates an official system WebAPK that lives in your app drawer alongside native apps.
                  </p>
                </div>

                {isInstalled ? (
                  <div className="p-2.5 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-bold flex items-center justify-center gap-2">
                    <span className="material-symbols-outlined text-[18px]">verified</span>
                    <span>Already Running as Installed App</span>
                  </div>
                ) : isInstallable ? (
                  <button
                    onClick={async () => {
                      const success = await install();
                      if (success) {
                        showToast('ExpiTrack installed to your device!', 'check_circle');
                        onClose();
                      }
                    }}
                    className="py-2.5 px-5 rounded-xl bg-[#005c55] hover:bg-[#0f766e] text-white font-bold text-xs shadow-md active:scale-95 transition-all inline-flex items-center gap-2"
                  >
                    <span className="material-symbols-outlined text-[18px]">download_for_offline</span>
                    <span>Install ExpiTrack on this Device</span>
                  </button>
                ) : isIOS ? (
                  <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-left space-y-1">
                    <strong className="block text-[#131b2e] dark:text-white">To install on iPhone/iPad:</strong>
                    <p className="text-[11px] text-[#3e4947] dark:text-[#bdc9c6]">
                      1. Tap the <strong>Share</strong> button in Safari.<br />
                      2. Scroll down and choose <strong>Add to Home Screen</strong>.
                    </p>
                  </div>
                ) : (
                  <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 text-left">
                    <span className="font-bold block">How to install on Android phone:</span>
                    <span className="text-[11px]">
                      Open this app in Chrome on your phone, tap the three dots (⋮) menu in the top right, and select <strong>&quot;Install app&quot;</strong> or <strong>&quot;Add to Home screen&quot;</strong>.
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-[#f8f9ff] dark:bg-[#1a2333]/50 border-t border-[#eaedff] dark:border-[#283044] flex items-center justify-between">
          <span className="text-[11px] text-[#3e4947] dark:text-[#bdc9c6]">
            Bundle ID: <code className="font-mono text-[#005c55] dark:text-[#6df5e1]">app.expitrack.vault</code>
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-[#eaedff] dark:bg-[#283044] text-xs font-bold text-[#131b2e] dark:text-white hover:bg-slate-200 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
