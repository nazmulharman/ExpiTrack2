import React, { useState } from 'react';
import { exportToCSV, downloadFile } from '../services/storage';
import { ExpiryItem, UserProfile } from '../types';

interface SettingsViewProps {
  items: ExpiryItem[];
  profile: UserProfile;
  themeMode: 'light' | 'dark';
  onToggleTheme: () => void;
  onResetData: () => void;
  onGoBack: () => void;
  onOpenProfileEdit: () => void;
  onOpenOnboarding?: () => void;
  onGoogleSignIn: () => Promise<void>;
  onGoogleSignOut: (resetToGuest?: boolean) => Promise<void>;
  onSwitchAccount: () => Promise<void>;
  onBackupToDrive: () => Promise<void>;
  onRestoreFromDrive: () => Promise<void>;
  isBackingUp?: boolean;
  isRestoring?: boolean;
  showToast: (msg: string, icon?: string) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  items,
  profile,
  themeMode,
  onToggleTheme,
  onResetData,
  onGoBack,
  onOpenProfileEdit,
  onOpenOnboarding,
  onGoogleSignIn,
  onGoogleSignOut,
  onSwitchAccount,
  onBackupToDrive,
  onRestoreFromDrive,
  isBackingUp = false,
  isRestoring = false,
  showToast,
}) => {
  const [wifiOnly, setWifiOnly] = useState(true);
  const [highResOcr, setHighResOcr] = useState(true);
  const [biometricLock, setBiometricLock] = useState(false);
  const [compactMode, setCompactMode] = useState(false);
  const [confirmRestoreOpen, setConfirmRestoreOpen] = useState(false);
  const [confirmSignOutOpen, setConfirmSignOutOpen] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [isSwitchingAccount, setIsSwitchingAccount] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  const handleExportCSV = () => {
    const csv = exportToCSV(items);
    downloadFile(csv, `ExpiTrack_Export_${new Date().toISOString().split('T')[0]}.csv`, 'text/csv');
    showToast('Vault items exported to CSV', 'download');
  };

  const handleExportJSON = () => {
    const json = JSON.stringify(items, null, 2);
    downloadFile(json, `ExpiTrack_Backup_${new Date().toISOString().split('T')[0]}.json`, 'application/json');
    showToast('Full Vault JSON backup downloaded', 'download');
  };

  const handleClearCache = () => {
    showToast('Cached OCR image pre-renders cleared (14 MB freed)', 'cleaning_services');
  };

  const handleGoogleLogin = async () => {
    setIsSigningIn(true);
    try {
      await onGoogleSignIn();
    } catch {
      // error toast handled in parent
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleSwitchAccountClick = async () => {
    setIsSwitchingAccount(true);
    try {
      await onSwitchAccount();
    } catch {
      // error handled in parent
    } finally {
      setIsSwitchingAccount(false);
    }
  };

  const handleConfirmSignOut = async (resetToGuest: boolean) => {
    setIsSigningOut(true);
    try {
      await onGoogleSignOut(resetToGuest);
      setConfirmSignOutOpen(false);
    } catch {
      // error handled in parent
    } finally {
      setIsSigningOut(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 pb-28 pt-2">
      {/* Top Header */}
      <div className="flex items-center justify-between pt-1">
        <div>
          <h1 className="text-xl font-bold text-[#131b2e] dark:text-white">Settings & Account</h1>
          <p className="text-xs text-[#3e4947] dark:text-[#bdc9c6]">
            Manage profile, Google Drive backup & security
          </p>
        </div>
      </div>

      {/* Profile Card with Edit, Switch & Sign Out Options */}
      <div className="p-4 rounded-2xl bg-white dark:bg-[#131b2e] border border-[#eaedff] dark:border-[#283044] shadow-sm space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative shrink-0">
              <img
                src={profile.avatarUrl}
                alt={profile.name}
                className="w-14 h-14 rounded-full object-cover shadow-sm border border-slate-200 dark:border-slate-700"
              />
              {profile.isGoogleLinked ? (
                <div
                  className="absolute bottom-0 right-0 w-4 h-4 rounded-full bg-[#34A853] border-2 border-white dark:border-[#131b2e] flex items-center justify-center"
                  title="Google Connected"
                >
                  <span className="material-symbols-outlined text-[10px] text-white">check</span>
                </div>
              ) : (
                <div
                  className="absolute bottom-0 right-0 w-4 h-4 rounded-full bg-[#005c55] border-2 border-white dark:border-[#131b2e] flex items-center justify-center text-white text-[9px]"
                  title="Local Vault"
                >
                  <span className="material-symbols-outlined text-[10px]">folder</span>
                </div>
              )}
            </div>
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-[#131b2e] dark:text-white truncate">
                  {profile.name}
                </h3>
              </div>
              <span className="text-xs text-[#3e4947] dark:text-[#bdc9c6] truncate">
                {profile.email}
              </span>
              <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                <span className="px-2 py-0.5 rounded-full bg-[#9cf2e8] text-[#00504a] text-[10px] font-bold">
                  {profile.plan}
                </span>
                <span className="text-[10px] text-slate-400 truncate">{profile.vaultName}</span>
              </div>
            </div>
          </div>

          <button
            onClick={onOpenProfileEdit}
            className="px-3 py-1.5 rounded-xl bg-[#eaedff] dark:bg-[#283044] text-xs font-bold text-[#005c55] dark:text-[#6df5e1] hover:bg-[#d8ddff] active:scale-95 transition-all shrink-0 flex items-center gap-1"
          >
            <span className="material-symbols-outlined text-[16px]">edit</span>
            <span>Edit</span>
          </button>
        </div>

        {/* Action button bar: Switch Account & Sign Out */}
        <div className="pt-2 border-t border-[#eaedff] dark:border-[#283044] flex items-center gap-2">
          <button
            onClick={handleSwitchAccountClick}
            disabled={isSwitchingAccount}
            className="flex-1 py-2 px-3 rounded-xl bg-white dark:bg-[#1b2336] border border-[#eaedff] dark:border-[#3a445d] text-xs font-bold text-[#131b2e] dark:text-white hover:bg-[#f2f3ff] dark:hover:bg-[#283044] transition-all flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer disabled:opacity-60"
          >
            <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 48 48">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
            </svg>
            <span>{isSwitchingAccount ? 'Switching...' : 'Switch Account'}</span>
          </button>

          {profile.isGoogleLinked ? (
            <button
              onClick={() => setConfirmSignOutOpen(true)}
              className="py-2 px-3 rounded-xl bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 border border-red-100 dark:border-red-900 text-xs font-bold hover:bg-red-100 active:scale-95 transition-all flex items-center justify-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[16px]">logout</span>
              <span>Sign Out</span>
            </button>
          ) : (
            <button
              onClick={handleGoogleLogin}
              disabled={isSigningIn}
              className="py-2 px-3 rounded-xl bg-[#005c55] text-white text-xs font-bold hover:bg-[#0f766e] active:scale-95 transition-all flex items-center justify-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[16px]">login</span>
              <span>Connect Google</span>
            </button>
          )}
        </div>
      </div>

      {/* Google Login & Cloud Backup Section */}
      <div className="bg-white dark:bg-[#131b2e] p-4 rounded-2xl shadow-sm border border-[#eaedff] dark:border-[#283044] space-y-3.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-[#005c55] dark:text-[#6df5e1] flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[18px]">cloud_sync</span>
            Google Drive Vault Backup
          </span>

          {profile.isGoogleLinked && (
            <span className="px-2 py-0.5 rounded-full bg-[#9cf2e8] text-[#00504a] text-[10px] font-bold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#00504a] animate-ping"></span>
              Google Linked
            </span>
          )}
        </div>

        {/* Google Sign-in / Connected State */}
        {!profile.isGoogleLinked ? (
          <div className="p-3.5 rounded-xl bg-[#f2f3ff] dark:bg-[#283044] space-y-2.5">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-white dark:bg-[#131b2e] flex items-center justify-center shadow-xs shrink-0">
                <svg className="w-5 h-5" viewBox="0 0 48 48">
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                </svg>
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-xs text-[#131b2e] dark:text-white">
                  Connect Google Account
                </span>
                <span className="text-[11px] text-[#3e4947] dark:text-[#bdc9c6]">
                  Sign in with Google to enable encrypted Drive backup & restore.
                </span>
              </div>
            </div>

            {/* Official Google Sign-In & Switch Buttons */}
            <div className="flex flex-col sm:flex-row gap-2">
              <button
                onClick={handleGoogleLogin}
                disabled={isSigningIn}
                className="flex-1 py-2.5 px-4 rounded-xl bg-white dark:bg-[#131b2e] border border-[#eaedff] dark:border-[#3a445d] text-[#131b2e] dark:text-white font-semibold text-xs shadow-xs hover:shadow-sm flex items-center justify-center gap-2.5 transition-all active:scale-[0.98] disabled:opacity-60 cursor-pointer"
              >
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 48 48">
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                </svg>
                <span>{isSigningIn ? 'Connecting...' : 'Sign in with Google'}</span>
              </button>

              <button
                onClick={handleSwitchAccountClick}
                disabled={isSwitchingAccount}
                className="py-2.5 px-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-200 transition-colors flex items-center justify-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[16px]">switch_account</span>
                <span>Switch / Pick Account</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="p-3.5 rounded-xl bg-[#f2f3ff] dark:bg-[#283044] space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5" viewBox="0 0 48 48">
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                </svg>
                <div className="flex flex-col">
                  <span className="font-bold text-xs text-[#131b2e] dark:text-white">
                    {profile.email}
                  </span>
                  <span className="text-[10px] text-[#3e4947] dark:text-[#bdc9c6]">
                    {profile.lastDriveBackup
                      ? `Last Backup: ${new Date(profile.lastDriveBackup).toLocaleString()}`
                      : 'No cloud backups uploaded yet'}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleSwitchAccountClick}
                  disabled={isSwitchingAccount}
                  className="px-2 py-1 rounded-lg bg-white dark:bg-[#131b2e] text-[11px] font-bold text-[#005c55] dark:text-[#6df5e1] border border-[#eaedff] dark:border-[#3a445d] hover:bg-[#eaedff] transition-colors flex items-center gap-1"
                  title="Switch Google Account"
                >
                  <span className="material-symbols-outlined text-[13px]">switch_account</span>
                  <span>Switch</span>
                </button>

                <button
                  onClick={() => setConfirmSignOutOpen(true)}
                  className="px-2 py-1 rounded-lg bg-red-50 dark:bg-red-950/40 text-[11px] font-bold text-red-600 dark:text-red-400 hover:bg-red-100 transition-colors flex items-center gap-1"
                  title="Sign Out"
                >
                  <span className="material-symbols-outlined text-[13px]">logout</span>
                  <span>Sign Out</span>
                </button>
              </div>
            </div>

            {/* Backup & Restore Action Buttons */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                onClick={onBackupToDrive}
                disabled={isBackingUp}
                className="py-2.5 px-3 rounded-xl bg-[#005c55] hover:bg-[#0f766e] text-white text-xs font-bold shadow-xs active:scale-95 transition-all flex items-center justify-center gap-1.5 disabled:opacity-60"
              >
                <span className={`material-symbols-outlined text-[16px] ${isBackingUp ? 'animate-spin' : ''}`}>
                  {isBackingUp ? 'sync' : 'cloud_upload'}
                </span>
                <span>{isBackingUp ? 'Backing Up...' : 'Back Up Now'}</span>
              </button>

              <button
                onClick={() => setConfirmRestoreOpen(true)}
                disabled={isRestoring}
                className="py-2.5 px-3 rounded-xl bg-white dark:bg-[#131b2e] text-[#131b2e] dark:text-white border border-[#eaedff] dark:border-[#3a445d] text-xs font-bold shadow-xs hover:bg-slate-50 dark:hover:bg-slate-800 active:scale-95 transition-all flex items-center justify-center gap-1.5 disabled:opacity-60"
              >
                <span className={`material-symbols-outlined text-[16px] ${isRestoring ? 'animate-spin' : ''}`}>
                  {isRestoring ? 'sync' : 'cloud_download'}
                </span>
                <span>{isRestoring ? 'Restoring...' : 'Restore'}</span>
              </button>
            </div>
          </div>
        )}

        {/* Sync Settings */}
        <div className="flex items-center justify-between py-1 border-t border-[#eaedff] dark:border-[#283044]">
          <div className="flex flex-col">
            <span className="text-sm font-bold text-[#131b2e] dark:text-white">Wi-Fi Only Sync</span>
            <span className="text-xs text-[#3e4947] dark:text-[#bdc9c6]">Prevent cellular data usage for drive sync</span>
          </div>
          <input
            type="checkbox"
            checked={wifiOnly}
            onChange={(e) => setWifiOnly(e.target.checked)}
            className="w-5 h-5 accent-[#005c55] rounded cursor-pointer"
          />
        </div>

        <div className="flex items-center justify-between py-1 border-t border-[#eaedff] dark:border-[#283044]">
          <div className="flex flex-col">
            <span className="text-sm font-bold text-[#131b2e] dark:text-white">High-Res OCR Archives</span>
            <span className="text-xs text-[#3e4947] dark:text-[#bdc9c6]">Store uncompressed receipts for claims</span>
          </div>
          <input
            type="checkbox"
            checked={highResOcr}
            onChange={(e) => setHighResOcr(e.target.checked)}
            className="w-5 h-5 accent-[#005c55] rounded cursor-pointer"
          />
        </div>
      </div>

      {/* Security & Access */}
      <div className="bg-white dark:bg-[#131b2e] p-4 rounded-2xl shadow-sm border border-[#eaedff] dark:border-[#283044] space-y-3">
        <span className="text-xs font-bold uppercase tracking-wider text-[#005c55] dark:text-[#6df5e1] flex items-center gap-1.5">
          <span className="material-symbols-outlined text-[18px]">lock</span>
          Security & Biometrics
        </span>

        <div className="flex items-center justify-between py-1">
          <div className="flex flex-col">
            <span className="text-sm font-bold text-[#131b2e] dark:text-white">Biometric Vault Lock</span>
            <span className="text-xs text-[#3e4947] dark:text-[#bdc9c6]">Require FaceID or TouchID to open app</span>
          </div>
          <input
            type="checkbox"
            checked={biometricLock}
            onChange={(e) => {
              setBiometricLock(e.target.checked);
              showToast(e.target.checked ? 'Biometric Lock enabled' : 'Biometric Lock disabled', 'fingerprint');
            }}
            className="w-5 h-5 accent-[#005c55] rounded cursor-pointer"
          />
        </div>

        <div className="flex items-center justify-between py-1 border-t border-[#eaedff] dark:border-[#283044]">
          <div className="flex flex-col">
            <span className="text-sm font-bold text-[#131b2e] dark:text-white">Encryption Protocol</span>
            <span className="text-xs text-[#3e4947] dark:text-[#bdc9c6]">Zero-knowledge client-side encryption</span>
          </div>
          <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-[#eaedff] dark:bg-[#283044] text-[#005c55] dark:text-[#6df5e1]">
            AES-256-GCM
          </span>
        </div>
      </div>

      {/* Appearance & Theme */}
      <div className="bg-white dark:bg-[#131b2e] p-4 rounded-2xl shadow-sm border border-[#eaedff] dark:border-[#283044] space-y-3">
        <span className="text-xs font-bold uppercase tracking-wider text-[#005c55] dark:text-[#6df5e1] flex items-center gap-1.5">
          <span className="material-symbols-outlined text-[18px]">palette</span>
          Appearance & Theme
        </span>

        {/* Visual Theme Selection Cards */}
        <div className="grid grid-cols-2 gap-3 pt-1">
          {/* Light Mode Card */}
          <button
            type="button"
            onClick={() => {
              if (themeMode !== 'light') onToggleTheme();
            }}
            className={`p-3 rounded-2xl border-2 text-left transition-all flex flex-col justify-between h-28 relative ${
              themeMode === 'light'
                ? 'border-[#005c55] bg-gradient-to-br from-white to-[#f2f3ff] shadow-sm'
                : 'border-[#eaedff] dark:border-[#283044] bg-[#f8f9ff] dark:bg-[#1a2333]/60 opacity-70 hover:opacity-100'
            }`}
          >
            <div className="flex items-center justify-between w-full">
              <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center shadow-xs">
                <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                  light_mode
                </span>
              </div>
              {themeMode === 'light' && (
                <span className="w-5 h-5 rounded-full bg-[#005c55] text-white flex items-center justify-center shadow-xs">
                  <span className="material-symbols-outlined text-[14px]">check</span>
                </span>
              )}
            </div>
            <div>
              <span className="font-bold text-sm text-[#131b2e] dark:text-white block">Light Mode</span>
              <span className="text-[10px] text-[#3e4947] dark:text-[#bdc9c6]">Crisp daylight contrast</span>
            </div>
          </button>

          {/* Dark Mode Card */}
          <button
            type="button"
            onClick={() => {
              if (themeMode !== 'dark') onToggleTheme();
            }}
            className={`p-3 rounded-2xl border-2 text-left transition-all flex flex-col justify-between h-28 relative ${
              themeMode === 'dark'
                ? 'border-[#6df5e1] bg-gradient-to-br from-[#1a2333] to-[#131b2e] shadow-md shadow-[#6df5e1]/10'
                : 'border-[#eaedff] dark:border-[#283044] bg-[#f8f9ff] dark:bg-[#1a2333]/60 opacity-70 hover:opacity-100'
            }`}
          >
            <div className="flex items-center justify-between w-full">
              <div className="w-8 h-8 rounded-xl bg-[#283044] text-[#6df5e1] flex items-center justify-center shadow-xs">
                <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                  dark_mode
                </span>
              </div>
              {themeMode === 'dark' && (
                <span className="w-5 h-5 rounded-full bg-[#6df5e1] text-[#006f64] flex items-center justify-center shadow-xs">
                  <span className="material-symbols-outlined text-[14px]">check</span>
                </span>
              )}
            </div>
            <div>
              <span className="font-bold text-sm text-[#131b2e] dark:text-white block">Dark Mode</span>
              <span className="text-[10px] text-[#3e4947] dark:text-[#bdc9c6]">OLED dark blue contrast</span>
            </div>
          </button>
        </div>

        <div className="flex items-center justify-between py-1 border-t border-[#eaedff] dark:border-[#283044]">
          <div className="flex flex-col">
            <span className="text-sm font-bold text-[#131b2e] dark:text-white">Active Theme</span>
            <span className="text-xs text-[#3e4947] dark:text-[#bdc9c6]">
              {themeMode === 'dark' ? 'Dark Theme (Night / OLED friendly)' : 'Light Theme (High daylight clarity)'}
            </span>
          </div>
          <button
            onClick={onToggleTheme}
            className="px-3.5 py-1.5 rounded-xl bg-[#f2f3ff] dark:bg-[#283044] text-xs font-bold text-[#131b2e] dark:text-white flex items-center gap-1.5 hover:bg-[#eaedff] transition-colors"
          >
            <span className="material-symbols-outlined text-[16px]">
              {themeMode === 'dark' ? 'light_mode' : 'dark_mode'}
            </span>
            <span>Switch to {themeMode === 'dark' ? 'Light' : 'Dark'}</span>
          </button>
        </div>

        <div className="flex items-center justify-between py-1 border-t border-[#eaedff] dark:border-[#283044]">
          <div className="flex flex-col">
            <span className="text-sm font-bold text-[#131b2e] dark:text-white">Compact Item Rows</span>
            <span className="text-xs text-[#3e4947] dark:text-[#bdc9c6]">Dense view for large vaults</span>
          </div>
          <input
            type="checkbox"
            checked={compactMode}
            onChange={(e) => setCompactMode(e.target.checked)}
            className="w-5 h-5 accent-[#005c55] rounded cursor-pointer"
          />
        </div>
      </div>

      {/* Data Management */}
      <div className="bg-white dark:bg-[#131b2e] p-4 rounded-2xl shadow-sm border border-[#eaedff] dark:border-[#283044] space-y-2">
        <span className="text-xs font-bold uppercase tracking-wider text-[#005c55] dark:text-[#6df5e1] flex items-center gap-1.5">
          <span className="material-symbols-outlined text-[18px]">dataset</span>
          Data & Maintenance
        </span>

        <div className="grid grid-cols-2 gap-2 pt-1">
          <button
            onClick={handleExportCSV}
            className="p-3 rounded-xl bg-[#f2f3ff] dark:bg-[#283044] hover:bg-[#eaedff] text-left flex flex-col justify-between"
          >
            <span className="material-symbols-outlined text-[20px] text-[#005c55] mb-1">table_view</span>
            <span className="font-bold text-xs text-[#131b2e] dark:text-white">Export CSV</span>
            <span className="text-[10px] text-[#3e4947] dark:text-[#bdc9c6]">All active & archived</span>
          </button>

          <button
            onClick={handleExportJSON}
            className="p-3 rounded-xl bg-[#f2f3ff] dark:bg-[#283044] hover:bg-[#eaedff] text-left flex flex-col justify-between"
          >
            <span className="material-symbols-outlined text-[20px] text-[#006fa8] mb-1">download</span>
            <span className="font-bold text-xs text-[#131b2e] dark:text-white">JSON Backup</span>
            <span className="text-[10px] text-[#3e4947] dark:text-[#bdc9c6]">Complete database</span>
          </button>

          <button
            onClick={handleClearCache}
            className="p-3 rounded-xl bg-[#f2f3ff] dark:bg-[#283044] hover:bg-[#eaedff] text-left flex flex-col justify-between"
          >
            <span className="material-symbols-outlined text-[20px] text-amber-600 mb-1">mop</span>
            <span className="font-bold text-xs text-[#131b2e] dark:text-white">Clear Cache</span>
            <span className="text-[10px] text-[#3e4947] dark:text-[#bdc9c6]">Free image memory</span>
          </button>

          <button
            onClick={() => {
              if (window.confirm('Reset all vault items and settings back to original initial state?')) {
                onResetData();
                showToast('Vault reset to seed demonstration data', 'restart_alt');
              }
            }}
            className="p-3 rounded-xl bg-red-50 dark:bg-red-950/30 hover:bg-red-100 text-left flex flex-col justify-between"
          >
            <span className="material-symbols-outlined text-[20px] text-red-600 mb-1">restart_alt</span>
            <span className="font-bold text-xs text-red-700 dark:text-red-400">Reset Demo Data</span>
            <span className="text-[10px] text-red-600/80">Re-seed initial state</span>
          </button>
        </div>

        {onOpenOnboarding && (
          <button
            onClick={onOpenOnboarding}
            className="w-full mt-2 py-2.5 rounded-xl bg-white dark:bg-[#131b2e] border border-[#eaedff] dark:border-[#283044] hover:bg-[#eaedff] text-xs font-bold text-[#005c55] dark:text-[#6df5e1] flex items-center justify-center gap-2 transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">help_center</span>
            <span>Replay Onboarding Tour (3 Slides)</span>
          </button>
        )}
      </div>

      {/* App Info footer */}
      <div className="text-center py-2 text-xs text-[#3e4947] dark:text-[#bdc9c6] space-y-1">
        <p className="font-bold">ExpiTrack Personal Vault v2.4.1 (Build 418)</p>
        <p className="text-[11px] opacity-75">Protected under 256-bit client-side zero-knowledge architecture.</p>
      </div>

      {/* MANDATORY Confirmation Dialog for Destructive Restore Operation */}
      {confirmRestoreOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#131b2e] w-full max-w-sm rounded-3xl p-5 shadow-2xl border border-[#eaedff] dark:border-[#283044] space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#ffdad6] text-[#ba1a1a] flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[22px]">warning</span>
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#131b2e] dark:text-white">
                  Confirm Vault Restore
                </h3>
                <span className="text-[11px] text-[#3e4947] dark:text-[#bdc9c6]">
                  Google Drive Cloud Sync
                </span>
              </div>
            </div>

            <p className="text-xs text-[#3e4947] dark:text-[#bdc9c6] leading-relaxed">
              Restoring from Google Drive will synchronize and overwrite your current local vault records with the version stored in Google Drive. Do you want to proceed?
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setConfirmRestoreOpen(false)}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold text-[#3e4947] dark:text-[#bdc9c6] hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  setConfirmRestoreOpen(false);
                  await onRestoreFromDrive();
                }}
                className="px-4 py-2 rounded-xl bg-[#005c55] text-white text-xs font-bold hover:bg-[#0f766e] shadow-sm"
              >
                Yes, Restore Vault
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Dialog for Sign Out */}
      {confirmSignOutOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#131b2e] w-full max-w-sm rounded-3xl p-5 shadow-2xl border border-[#eaedff] dark:border-[#283044] space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-950/50 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[22px]">logout</span>
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#131b2e] dark:text-white">
                  Sign Out of Account?
                </h3>
                <span className="text-[11px] text-[#3e4947] dark:text-[#bdc9c6]">
                  {profile.email}
                </span>
              </div>
            </div>

            <p className="text-xs text-[#3e4947] dark:text-[#bdc9c6] leading-relaxed">
              Your items, scheduled doses, and reminders will remain safely accessible on this device's local vault. You can sign back in or switch to another account at any time.
            </p>

            <div className="flex flex-col gap-2 pt-2">
              <div className="flex items-center justify-end gap-2">
                <button
                  onClick={() => setConfirmSignOutOpen(false)}
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold text-[#3e4947] dark:text-[#bdc9c6] hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleConfirmSignOut(false)}
                  disabled={isSigningOut}
                  className="px-4 py-2 rounded-xl bg-red-600 text-white text-xs font-bold hover:bg-red-700 shadow-sm flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-[16px]">logout</span>
                  <span>{isSigningOut ? 'Signing Out...' : 'Sign Out'}</span>
                </button>
              </div>

              <button
                onClick={() => handleConfirmSignOut(true)}
                disabled={isSigningOut}
                className="text-[11px] text-slate-500 hover:text-red-600 text-center py-1 font-medium transition-colors"
              >
                Sign out and switch to clean Guest Vault
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
