import React, { useEffect } from 'react';

export interface ToastProps {
  message: string;
  icon?: string;
  type?: 'success' | 'info' | 'warning' | 'error';
  onClose: () => void;
  duration?: number;
}

export const Toast: React.FC<ToastProps> = ({
  message,
  icon = 'check_circle',
  onClose,
  duration = 3000,
}) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, duration);
    return () => clearTimeout(timer);
  }, [onClose, duration]);

  return (
    <div className="fixed top-20 left-4 right-4 z-50 max-w-sm mx-auto p-3.5 rounded-xl bg-[#283044] text-[#eef0ff] shadow-2xl flex items-center justify-between gap-3 animate-in fade-in slide-in-from-top-4 duration-300">
      <div className="flex items-center gap-2.5 min-w-0">
        <span className="material-symbols-outlined text-[20px] text-[#6df5e1] shrink-0" style={{ fontVariationSettings: "'FILL' 1" }}>
          {icon}
        </span>
        <span className="text-sm font-medium leading-snug truncate">{message}</span>
      </div>
      <button
        onClick={onClose}
        className="w-6 h-6 rounded-full hover:bg-white/10 flex items-center justify-center text-white/70 hover:text-white shrink-0 transition-colors"
        aria-label="Dismiss"
      >
        <span className="material-symbols-outlined text-[16px]">close</span>
      </button>
    </div>
  );
};
