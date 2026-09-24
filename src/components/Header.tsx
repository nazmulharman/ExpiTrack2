import React from 'react';
import { ActiveTab, ActiveView, UserProfile } from '../types';

interface HeaderProps {
  activeTab: ActiveTab;
  activeView: ActiveView;
  profile?: UserProfile;
  onGoBack: () => void;
  onOpenSettings: () => void;
  onOpenAccount?: () => void;
  onCloudSync: () => void;
  titleOverride?: string;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  activeView,
  profile,
  onGoBack,
  onOpenSettings,
  onOpenAccount,
  onCloudSync,
  titleOverride,
}) => {
  const isSubView = activeView !== 'tab';

  const getViewTitle = () => {
    if (titleOverride) return titleOverride;
    if (activeView === 'item-detail') return 'Item Detail';
    if (activeView === 'add-item') return 'Manual Entry';
    if (activeView === 'edit-item') return 'Edit Item';
    if (activeView === 'notification-settings') return 'Notification Settings';
    if (activeView === 'settings') return 'Settings';
    if (activeView === 'dossier') return 'Insurance Claim Dossier';

    switch (activeTab) {
      case 'dashboard':
        return 'Dashboard';
      case 'archive':
        return 'Archive';
      case 'scan':
        return 'Barcode Scanner';
      case 'alerts':
        return 'Alerts';
      case 'vault':
        return 'Vault';
      default:
        return 'Dashboard';
    }
  };

  return (
    <header className="fixed top-0 w-full z-40 pt-safe bg-[#ffffff]/90 dark:bg-[#131b2e]/90 backdrop-blur-xl shadow-[0_1px_8px_rgba(0,0,0,0.04)] border-b border-[#eaedff] dark:border-[#283044]">
      <div className="h-16 px-4 max-w-2xl mx-auto flex items-center justify-between">
        {/* Left Section */}
        <div className="flex items-center gap-2">
          {isSubView ? (
            <button
              onClick={onGoBack}
              aria-label="Go back"
              className="w-10 h-10 -ml-1 flex items-center justify-center rounded-full text-[#131b2e] dark:text-[#faf8ff] hover:bg-[#f2f3ff] dark:hover:bg-[#283044] transition-colors active:scale-95"
            >
              <span className="material-symbols-outlined text-[24px]">arrow_back_ios_new</span>
            </button>
          ) : null}

          {/* Logo */}
          <div
            className="flex items-center gap-2 cursor-pointer"
            onClick={() => {
              if (isSubView) onGoBack();
            }}
          >
            <img
              src="https://lh3.googleusercontent.com/aida/AEtjO1U5U0JV-qKAx9hwch6ezL0VvvLxorsvKCJy4WtE07JyNue3FvkZBN21UlDZvyJA0O21367XxzLJVVUcwO9U5wQ9IG1OjZi9yleAts3DI9n_bss3qvI_SCRHOH5ljgRgxvWP1g7adpwp2uufU3z2CY7nLdKKUcLSNyE5IlJTAGEwMSRCSwBa1sae4bNR5LYg1PJpIqsrRyBQXUWP9GJFTHQhvbG7cduRSfRo4sEq33v_PsSHia1cqP62OY4"
              alt="ExpiTrack Logo"
              className="h-8 w-auto object-contain"
            />
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="text-[17px] font-bold text-[#131b2e] dark:text-[#faf8ff] leading-none tracking-tight">
                  ExpiTrack
                </span>
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-[#6df5e1]/40 text-[#006f64] dark:text-[#6df5e1] font-bold text-[10px]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#0f766e] animate-pulse"></span>
                  Sync
                </span>
              </div>
              <span className="text-[12px] font-medium text-[#3e4947] dark:text-[#bdc9c6] truncate max-w-[150px]">
                {getViewTitle()}
              </span>
            </div>
          </div>
        </div>

        {/* Right Section */}
        <div className="flex items-center gap-1">
          <button
            onClick={onCloudSync}
            title={profile?.isGoogleLinked ? "Google Drive Cloud Backup Active" : "Google Drive Not Connected"}
            className="w-10 h-10 flex items-center justify-center rounded-full text-[#3e4947] dark:text-[#bdc9c6] hover:text-[#005c55] hover:bg-[#f2f3ff] dark:hover:bg-[#283044] transition-colors relative"
          >
            <span className={`material-symbols-outlined text-[22px] ${profile?.isGoogleLinked ? 'text-[#005c55] dark:text-[#6df5e1]' : 'opacity-60'}`}>
              {profile?.isGoogleLinked ? 'cloud_done' : 'cloud_off'}
            </span>
            {profile?.isGoogleLinked && (
              <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[#34A853] ring-1 ring-white"></span>
            )}
          </button>
          <button
            onClick={onOpenAccount || onOpenSettings}
            title="Account, Switch Account & Settings"
            className="w-10 h-10 flex items-center justify-center rounded-full p-0.5 hover:ring-2 hover:ring-[#005c55]/40 transition-all active:scale-95 relative"
          >
            <img
              src={profile?.avatarUrl || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80"}
              alt={profile?.name || "User Profile"}
              className="w-8 h-8 rounded-full object-cover border border-slate-200 dark:border-slate-700"
            />
            {profile?.isGoogleLinked && (
              <span className="absolute bottom-1 right-1 w-2.5 h-2.5 rounded-full bg-[#34A853] border-2 border-white dark:border-[#131b2e]"></span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
