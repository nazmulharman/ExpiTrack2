import React, { useState } from 'react';
import { UserProfile } from '../types';

interface AccountModalProps {
  profile: UserProfile;
  isOpen: boolean;
  onClose: () => void;
  onSwitchAccount: () => Promise<void>;
  onSignOut: (resetToGuest?: boolean) => Promise<void>;
  onOpenProfileEdit: () => void;
  onOpenSettings: () => void;
  onCloudSync: () => void;
  showToast: (msg: string, icon?: string) => void;
}

export const AccountModal: React.FC<AccountModalProps> = ({
  profile,
  isOpen,
  onClose,
  onSwitchAccount,
  onSignOut,
  onOpenProfileEdit,
  onOpenSettings,
  onCloudSync,
  showToast,
}) => {
  const [isSwitching, setIsSwitching] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);

  if (!isOpen) return null;

  const handleSwitch = async () => {
    setIsSwitching(true);
    try {
      await onSwitchAccount();
      onClose();
    } catch {
      // Error handled by parent
    } finally {
      setIsSwitching(false);
    }
  };

  const handleSignOut = async (resetToGuest: boolean) => {
    setIsSigningOut(true);
    try {
      await onSignOut(resetToGuest);
      setShowSignOutConfirm(false);
      onClose();
    } catch {
      // Error handled by parent
    } finally {
      setIsSigningOut(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div
        className="bg-white dark:bg-[#131b2e] w-full max-w-md rounded-3xl shadow-2xl overflow-hidden border border-[#eaedff] dark:border-[#283044] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-[#005c55] to-[#0f766e] text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center text-[#6df5e1] shadow-inner">
              <span className="material-symbols-outlined text-[24px]">account_circle</span>
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-[#a3faef] block">
                Account Manager
              </span>
              <h2 className="text-base font-bold leading-tight">Switch Account & Sign Out</h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          {/* Active Profile Card */}
          <div className="p-4 rounded-2xl bg-[#f2f3ff] dark:bg-[#283044] border border-[#eaedff] dark:border-[#384259] flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="relative shrink-0">
                <img
                  src={profile.avatarUrl}
                  alt={profile.name}
                  className="w-14 h-14 rounded-full object-cover shadow-sm border-2 border-white dark:border-[#131b2e]"
                />
                {profile.isGoogleLinked ? (
                  <div
                    className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-[#34A853] border-2 border-white dark:border-[#131b2e] flex items-center justify-center shadow-xs"
                    title="Google Account Connected"
                  >
                    <span className="material-symbols-outlined text-[12px] text-white font-bold">check</span>
                  </div>
                ) : (
                  <div
                    className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-[#005c55] border-2 border-white dark:border-[#131b2e] flex items-center justify-center text-white text-[10px]"
                    title="Local Vault Mode"
                  >
                    <span className="material-symbols-outlined text-[12px]">folder</span>
                  </div>
                )}
              </div>

              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <h3 className="font-bold text-sm text-[#131b2e] dark:text-white truncate">
                    {profile.name}
                  </h3>
                  {profile.isGoogleLinked ? (
                    <span className="px-1.5 py-0.5 rounded-full text-[9px] font-extrabold bg-[#34A853]/15 text-[#137333] dark:text-[#81c995] flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#34A853] animate-pulse"></span>
                      Google Linked
                    </span>
                  ) : (
                    <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                      Local Offline Vault
                    </span>
                  )}
                </div>

                <span className="text-xs text-[#3e4947] dark:text-[#bdc9c6] truncate mt-0.5">
                  {profile.email}
                </span>

                <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 truncate">
                  {profile.vaultName} &bull; <strong className="text-[#005c55] dark:text-[#6df5e1]">{profile.plan}</strong>
                </span>
              </div>
            </div>

            <button
              onClick={() => {
                onClose();
                onOpenProfileEdit();
              }}
              className="p-2 rounded-xl text-slate-500 hover:text-[#005c55] hover:bg-white dark:hover:bg-[#131b2e] transition-colors shrink-0"
              title="Edit Profile"
            >
              <span className="material-symbols-outlined text-[18px]">edit</span>
            </button>
          </div>

          {/* Sign Out Confirmation Panel */}
          {showSignOutConfirm ? (
            <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 space-y-3 animate-in zoom-in-95 duration-150">
              <div className="flex items-start gap-2.5">
                <span className="material-symbols-outlined text-amber-600 dark:text-amber-400 text-[22px] shrink-0 mt-0.5">
                  warning
                </span>
                <div>
                  <h4 className="text-xs font-bold text-amber-900 dark:text-amber-200">
                    Are you sure you want to sign out?
                  </h4>
                  <p className="text-[11px] text-amber-800/90 dark:text-amber-300/90 mt-0.5">
                    Your tracked items and medicine alerts will remain safely saved in this device's local vault.
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-2 pt-1">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleSignOut(false)}
                    disabled={isSigningOut}
                    className="flex-1 py-2 px-3 rounded-xl bg-red-600 text-white text-xs font-bold hover:bg-red-700 active:scale-95 transition-all shadow-xs flex items-center justify-center gap-1.5"
                  >
                    <span className="material-symbols-outlined text-[16px]">logout</span>
                    <span>{isSigningOut ? 'Signing Out...' : 'Sign Out & Keep Profile'}</span>
                  </button>

                  <button
                    onClick={() => setShowSignOutConfirm(false)}
                    className="py-2 px-3 rounded-xl bg-white dark:bg-[#131b2e] border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-50 transition-colors"
                  >
                    Cancel
                  </button>
                </div>

                <button
                  onClick={() => handleSignOut(true)}
                  disabled={isSigningOut}
                  className="w-full py-1.5 text-[11px] font-semibold text-slate-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                >
                  Or sign out and reset to clean Guest Vault
                </button>
              </div>
            </div>
          ) : (
            /* Primary Account Action Buttons */
            <div className="space-y-2.5">
              {/* Switch Account Button */}
              <button
                onClick={handleSwitch}
                disabled={isSwitching}
                className="w-full p-3.5 rounded-2xl bg-white dark:bg-[#131b2e] border border-[#eaedff] dark:border-[#283044] hover:border-[#005c55]/40 dark:hover:border-[#6df5e1]/40 shadow-xs hover:shadow-sm flex items-center justify-between group transition-all text-left cursor-pointer active:scale-[0.99]"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#f2f3ff] dark:bg-[#283044] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    {/* Google 4-Color Logo */}
                    <svg className="w-5 h-5" viewBox="0 0 48 48">
                      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                    </svg>
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-xs text-[#131b2e] dark:text-white">
                        {isSwitching ? 'Opening Account Chooser...' : 'Switch Google Account'}
                      </span>
                      <span className="px-1.5 py-0.2 rounded text-[9px] font-extrabold bg-[#005c55] text-white">
                        Chooser
                      </span>
                    </div>
                    <span className="text-[11px] text-[#3e4947] dark:text-[#bdc9c6] block">
                      Pick or add another Google account for vault & Drive sync
                    </span>
                  </div>
                </div>

                <span className="material-symbols-outlined text-[20px] text-slate-400 group-hover:text-[#005c55] group-hover:translate-x-0.5 transition-all">
                  arrow_forward
                </span>
              </button>

              {/* Sign Out Button */}
              {profile.isGoogleLinked ? (
                <button
                  onClick={() => setShowSignOutConfirm(true)}
                  className="w-full p-3.5 rounded-2xl bg-white dark:bg-[#131b2e] border border-red-100 dark:border-red-950 hover:bg-red-50/50 dark:hover:bg-red-950/20 shadow-xs flex items-center justify-between group transition-all text-left cursor-pointer active:scale-[0.99]"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-[20px]">logout</span>
                    </div>
                    <div>
                      <span className="font-bold text-xs text-red-600 dark:text-red-400 block">
                        Sign Out from Account
                      </span>
                      <span className="text-[11px] text-[#3e4947] dark:text-[#bdc9c6]">
                        Disconnect Google session & keep vault stored locally
                      </span>
                    </div>
                  </div>

                  <span className="material-symbols-outlined text-[20px] text-red-400 group-hover:translate-x-0.5 transition-all">
                    chevron_right
                  </span>
                </button>
              ) : (
                <button
                  onClick={handleSwitch}
                  disabled={isSwitching}
                  className="w-full p-3.5 rounded-2xl bg-[#005c55] text-white hover:bg-[#0f766e] shadow-sm flex items-center justify-center gap-2 font-bold text-xs active:scale-[0.98] transition-all"
                >
                  <span className="material-symbols-outlined text-[18px]">login</span>
                  <span>Sign In with Google</span>
                </button>
              )}
            </div>
          )}

          {/* Quick Navigation Links */}
          <div className="pt-2 border-t border-[#eaedff] dark:border-[#283044] grid grid-cols-2 gap-2">
            <button
              onClick={() => {
                onClose();
                onOpenProfileEdit();
              }}
              className="p-2.5 rounded-xl bg-[#f2f3ff] dark:bg-[#283044] text-xs font-bold text-[#005c55] dark:text-[#6df5e1] hover:bg-[#d8ddff] transition-colors flex items-center justify-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[16px]">badge</span>
              <span>Edit Profile Info</span>
            </button>

            <button
              onClick={() => {
                onClose();
                onOpenSettings();
              }}
              className="p-2.5 rounded-xl bg-[#f2f3ff] dark:bg-[#283044] text-xs font-bold text-[#005c55] dark:text-[#6df5e1] hover:bg-[#d8ddff] transition-colors flex items-center justify-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[16px]">settings</span>
              <span>Full Settings</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
