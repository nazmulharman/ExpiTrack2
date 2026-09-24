import React from 'react';
import { ActiveTab } from '../types';

interface BottomNavProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  urgentAlertsCount?: number;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  onSelectTab,
  urgentAlertsCount = 2,
}) => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 pb-safe bg-[#ffffff]/95 dark:bg-[#131b2e]/95 backdrop-blur-xl border-t border-[#eaedff] dark:border-[#283044] shadow-[0_-2px_12px_rgba(0,0,0,0.05)]">
      <div className="relative max-w-md mx-auto flex justify-around items-center h-16 px-1">
        {/* Home */}
        <button
          onClick={() => onSelectTab('dashboard')}
          className={`flex-1 flex flex-col items-center justify-center min-w-[44px] min-h-[48px] py-1 transition-colors ${
            activeTab === 'dashboard'
              ? 'text-[#005c55] dark:text-[#6df5e1] font-bold'
              : 'text-[#3e4947] dark:text-[#bdc9c6] hover:text-[#005c55]'
          }`}
        >
          <span
            className="material-symbols-outlined text-[24px]"
            style={activeTab === 'dashboard' ? { fontVariationSettings: "'FILL' 1" } : undefined}
          >
            grid_view
          </span>
          <span className="text-[11px] font-semibold mt-0.5">Home</span>
        </button>

        {/* Archive */}
        <button
          onClick={() => onSelectTab('archive')}
          className={`flex-1 flex flex-col items-center justify-center min-w-[44px] min-h-[48px] py-1 transition-colors ${
            activeTab === 'archive'
              ? 'text-[#005c55] dark:text-[#6df5e1] font-bold'
              : 'text-[#3e4947] dark:text-[#bdc9c6] hover:text-[#005c55]'
          }`}
        >
          <span
            className="material-symbols-outlined text-[24px]"
            style={activeTab === 'archive' ? { fontVariationSettings: "'FILL' 1" } : undefined}
          >
            inventory_2
          </span>
          <span className="text-[11px] font-semibold mt-0.5">Archive</span>
        </button>

        {/* Center Floating Action Button: Scan */}
        <div className="relative -top-5 flex flex-col items-center justify-center px-1">
          <button
            onClick={() => onSelectTab('scan')}
            aria-label="Scan Item"
            className="w-14 h-14 rounded-full bg-gradient-to-tr from-[#005c55] to-[#0f766e] flex items-center justify-center text-white shadow-[0_8px_20px_rgba(15,118,110,0.4)] active:scale-95 transition-transform"
          >
            <span className="material-symbols-outlined text-[28px]">document_scanner</span>
          </button>
          <span className="text-[11px] font-bold text-[#3e4947] dark:text-[#bdc9c6] mt-1">Scan</span>
        </div>

        {/* Alerts */}
        <button
          onClick={() => onSelectTab('alerts')}
          className={`flex-1 flex flex-col items-center justify-center min-w-[44px] min-h-[48px] py-1 transition-colors relative ${
            activeTab === 'alerts'
              ? 'text-[#005c55] dark:text-[#6df5e1] font-bold'
              : 'text-[#3e4947] dark:text-[#bdc9c6] hover:text-[#005c55]'
          }`}
        >
          <div className="relative">
            <span
              className="material-symbols-outlined text-[24px]"
              style={activeTab === 'alerts' ? { fontVariationSettings: "'FILL' 1" } : undefined}
            >
              notifications
            </span>
            {urgentAlertsCount > 0 && (
              <span className="absolute -top-0.5 -right-1 w-2.5 h-2.5 rounded-full bg-[#ba1a1a] ring-2 ring-white dark:ring-[#131b2e] animate-pulse"></span>
            )}
          </div>
          <span className="text-[11px] font-semibold mt-0.5">Alerts</span>
        </button>

        {/* Vault */}
        <button
          onClick={() => onSelectTab('vault')}
          className={`flex-1 flex flex-col items-center justify-center min-w-[44px] min-h-[48px] py-1 transition-colors ${
            activeTab === 'vault'
              ? 'text-[#005c55] dark:text-[#6df5e1] font-bold'
              : 'text-[#3e4947] dark:text-[#bdc9c6] hover:text-[#005c55]'
          }`}
        >
          <span
            className="material-symbols-outlined text-[24px]"
            style={activeTab === 'vault' ? { fontVariationSettings: "'FILL' 1" } : undefined}
          >
            tune
          </span>
          <span className="text-[11px] font-semibold mt-0.5">Vault</span>
        </button>
      </div>
    </nav>
  );
};
