import React, { useState } from 'react';
import { ExpiryItem, ConsumptionSchedule } from '../types';
import { getMedicineStockStats, formatQuantity, parseFractionQuantity, formatScheduleTime } from '../utils/medicineUtils';

interface ConsumptionPromptModalProps {
  item: ExpiryItem;
  schedule?: ConsumptionSchedule;
  onConfirmTaken: (item: ExpiryItem, amount: number, scheduleId?: string, scheduleLabel?: string) => void;
  onSnooze: (item: ExpiryItem, minutes: number) => void;
  onClose: () => void;
}

export const ConsumptionPromptModal: React.FC<ConsumptionPromptModalProps> = ({
  item,
  schedule,
  onConfirmTaken,
  onSnooze,
  onClose,
}) => {
  const stats = getMedicineStockStats(item);
  const defaultAmount = schedule ? schedule.amount : stats.dailyDosage;
  const [takeAmount, setTakeAmount] = useState<number>(defaultAmount);
  const isGrocery = item.category === 'groceries';

  const scheduledLabel = schedule?.label || (isGrocery ? 'Scheduled Serving' : 'Scheduled Medication Dose');
  const scheduledTimeFormatted = schedule ? formatScheduleTime(schedule.time) : 'Now';

  const newAvailableAfter = Math.max(0, Math.round((stats.available - takeAmount) * 1000) / 1000);

  const handleConfirm = () => {
    if (takeAmount <= 0) return;
    onConfirmTaken(item, takeAmount, schedule?.id, scheduledLabel);
    onClose();
  };

  const handleSnooze = (minutes: number = 10) => {
    onSnooze(item, minutes);
    onClose();
  };

  // Unit-aware fraction step and quick presets
  const isFluidOrWeight = stats.unit === 'kg' || stats.unit === 'ltr' || stats.unit === 'liters' || stats.unit === 'g';
  const isMl = stats.unit === 'ml';

  const presets = isMl
    ? [0.5, 1, 2.5, 2.75, 5, 10]
    : isFluidOrWeight
    ? [0.25, 0.5, 0.75, 1, 1.5, 2]
    : [0.5, 1, 1.5, 2, 3];

  const stepVal = isMl ? 0.25 : isFluidOrWeight ? 0.25 : 0.5;

  const handleStepDown = () => {
    setTakeAmount((prev) => Math.max(0.01, Math.round((prev - stepVal) * 100) / 100));
  };

  const handleStepUp = () => {
    setTakeAmount((prev) => Math.min(stats.available, Math.round((prev + stepVal) * 100) / 100));
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-[#131b2e] max-w-md w-full rounded-3xl shadow-2xl border-2 border-[#005c55]/30 dark:border-[#6df5e1]/30 overflow-hidden flex flex-col">
        {/* Header Alert Ribbon */}
        <div className="bg-gradient-to-r from-[#005c55] to-[#0f766e] text-white px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center animate-bounce">
              <span className="material-symbols-outlined text-[22px]">
                {isGrocery ? 'restaurant' : 'alarm_on'}
              </span>
            </div>
            <div>
              <span className="text-[11px] uppercase tracking-wider font-bold text-[#6df5e1] block">
                Intake Reminder &bull; {scheduledTimeFormatted}
              </span>
              <h2 className="text-base font-black">
                {isGrocery ? 'Time to Consume' : 'Time for Your Medicine'}
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/25 flex items-center justify-center text-white/80 hover:text-white transition-colors"
            title="Dismiss"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-4">
          {/* Item details banner */}
          <div className="p-3.5 rounded-2xl bg-[#f2f3ff] dark:bg-[#283044] flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-[#6df5e1]/30 dark:bg-[#005c55]/40 flex items-center justify-center text-[#005c55] dark:text-[#6df5e1] shrink-0 font-bold text-lg">
              <span className="material-symbols-outlined text-[28px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                {isGrocery ? 'kitchen' : 'pill'}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-base text-[#131b2e] dark:text-white truncate">
                {item.name}
              </h3>
              <p className="text-xs text-[#3e4947] dark:text-[#bdc9c6] truncate">
                {scheduledLabel} &bull; {item.storageLocation || 'Medicine Cabinet'}
              </p>
            </div>
          </div>

          {/* Amount to consume with fraction support, direct input & stepper */}
          <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#131b2e] dark:text-white">
                Amount to Take
              </span>
              <span className="text-xs font-semibold text-[#005c55] dark:text-[#6df5e1]">
                Scheduled: {formatQuantity(defaultAmount)} {stats.unit}
              </span>
            </div>

            {/* Stepper with direct decimal input */}
            <div className="flex items-center justify-center gap-3 py-1">
              <button
                type="button"
                onClick={handleStepDown}
                className="w-11 h-11 rounded-xl bg-white dark:bg-[#131b2e] border border-slate-300 dark:border-slate-600 font-black text-xl flex items-center justify-center shadow-xs active:scale-95 hover:bg-slate-100"
              >
                -
              </button>

              <div className="flex-1 max-w-[170px] flex items-center justify-center bg-white dark:bg-[#131b2e] rounded-xl border border-slate-300 dark:border-slate-600 px-3 py-1 shadow-inner">
                <input
                  type="number"
                  step="any"
                  min="0.01"
                  max={stats.available}
                  value={takeAmount}
                  onChange={(e) => setTakeAmount(parseFractionQuantity(e.target.value, 0.01))}
                  className="w-24 text-center font-black text-2xl text-[#131b2e] dark:text-white bg-transparent focus:outline-none"
                />
                <span className="text-xs font-bold text-slate-500 shrink-0">
                  {stats.unit}
                </span>
              </div>

              <button
                type="button"
                onClick={handleStepUp}
                disabled={takeAmount >= stats.available}
                className="w-11 h-11 rounded-xl bg-white dark:bg-[#131b2e] border border-slate-300 dark:border-slate-600 font-black text-xl flex items-center justify-center shadow-xs active:scale-95 hover:bg-slate-100 disabled:opacity-40"
              >
                +
              </button>
            </div>

            {/* Quick fractional presets (e.g. .5, 1.5, 2.75) */}
            <div className="flex items-center justify-center gap-1.5 pt-1 flex-wrap">
              {presets.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setTakeAmount(Math.min(stats.available, preset))}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                    takeAmount === preset
                      ? 'bg-[#005c55] text-white shadow-xs'
                      : 'bg-white dark:bg-[#131b2e] text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {formatQuantity(preset)} {stats.unit}
                </button>
              ))}
            </div>
          </div>

          {/* Inventory calculation preview */}
          <div className="p-3.5 rounded-2xl bg-[#eaedff] dark:bg-[#1f2638] border border-[#dae2fd] dark:border-[#2d374f] space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[#3e4947] dark:text-[#bdc9c6]">Current Available Stock:</span>
              <span className="font-bold text-[#131b2e] dark:text-white">
                {formatQuantity(stats.available)} {stats.unit}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs font-bold pt-1 border-t border-slate-200/80 dark:border-slate-700/60">
              <span className="text-[#005c55] dark:text-[#6df5e1] flex items-center gap-1">
                <span className="material-symbols-outlined text-[15px]">trending_down</span>
                Stock After Confirmation:
              </span>
              <span className={`text-sm ${newAvailableAfter <= (item.lowStockThreshold ?? 5) ? 'text-amber-600 dark:text-amber-400 font-bold' : 'text-[#005c55] dark:text-[#6df5e1] font-bold'}`}>
                {formatQuantity(newAvailableAfter)} {stats.unit} remaining
              </span>
            </div>

            {newAvailableAfter <= (item.lowStockThreshold ?? 5) && (
              <p className="text-[11px] text-amber-700 dark:text-amber-300 pt-0.5 flex items-center gap-1">
                <span className="material-symbols-outlined text-[13px]">warning</span>
                Stock will be low after this intake. Consider reordering soon.
              </p>
            )}
          </div>

          {/* Action buttons */}
          <div className="space-y-2 pt-2">
            <button
              onClick={handleConfirm}
              disabled={stats.available <= 0}
              className={`w-full py-3.5 rounded-2xl font-black text-sm flex items-center justify-center gap-2 shadow-md transition-all active:scale-[0.98] ${
                stats.available <= 0
                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  : 'bg-[#005c55] hover:bg-[#0f766e] text-white hover:shadow-lg'
              }`}
            >
              <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                check_circle
              </span>
              <span>
                {stats.available <= 0
                  ? 'Cannot Confirm - Completely Out of Stock'
                  : `Confirm I Have Taken This (-${formatQuantity(takeAmount)} ${stats.unit})`}
              </span>
            </button>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => handleSnooze(10)}
                className="py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-[#131b2e] hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-center gap-1.5 transition-colors"
              >
                <span className="material-symbols-outlined text-[16px] text-amber-600">
                  snooze
                </span>
                <span>Snooze (10 min)</span>
              </button>

              <button
                onClick={onClose}
                className="py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-[#131b2e] hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-bold text-slate-500 hover:text-slate-700 flex items-center justify-center gap-1.5 transition-colors"
              >
                <span className="material-symbols-outlined text-[16px]">
                  close
                </span>
                <span>Skip for Now</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
