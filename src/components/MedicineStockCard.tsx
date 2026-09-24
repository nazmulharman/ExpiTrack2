import React, { useState } from 'react';
import { ExpiryItem, ConsumptionSchedule } from '../types';
import {
  getMedicineStockStats,
  recordDoseConsumption,
  refillMedicineStock,
  updateMedicineDosage,
  addConsumptionSchedule,
  deleteConsumptionSchedule,
  toggleConsumptionSchedule,
  formatScheduleTime,
  formatQuantity,
  parseFractionQuantity,
} from '../utils/medicineUtils';
import { formatDisplayDate } from '../utils/dateUtils';
import { sounds } from '../utils/soundUtils';
import { notificationService } from '../services/notificationService';

interface MedicineStockCardProps {
  item: ExpiryItem;
  onUpdateItem: (updatedItem: ExpiryItem) => void;
  showToast: (msg: string, icon?: string) => void;
  variant?: 'full' | 'compact';
  onTriggerAlarmPrompt?: (item: ExpiryItem, schedule?: ConsumptionSchedule) => void;
}

export const MedicineStockCard: React.FC<MedicineStockCardProps> = ({
  item,
  onUpdateItem,
  showToast,
  variant = 'full',
  onTriggerAlarmPrompt,
}) => {
  const stats = getMedicineStockStats(item);
  const isGrocery = item.category === 'groceries';
  const [isEditingDosage, setIsEditingDosage] = useState(false);
  const [tempDosage, setTempDosage] = useState(stats.dailyDosage);

  // Custom Fractional Consumption Modal (e.g. .5 kg, 2.75 ml, 1.5 ltr)
  const [showCustomConsumeModal, setShowCustomConsumeModal] = useState(false);
  const [customConsumeAmount, setCustomConsumeAmount] = useState<number>(stats.dailyDosage);

  // Refill Modal
  const [showRefillModal, setShowRefillModal] = useState(false);
  const defaultRefill = stats.unit === 'eggs'
    ? 12
    : (stats.unit === 'ml' ? 250 : (stats.unit === 'g' ? 500 : (stats.unit === 'kg' || stats.unit === 'ltr' || stats.unit === 'liters' ? 1 : (isGrocery ? 2 : 30))));
  const [refillAmount, setRefillAmount] = useState<number>(defaultRefill);

  // Adjust Stock Modal
  const [showAdjustStockModal, setShowAdjustStockModal] = useState(false);
  const [customRemainingStock, setCustomRemainingStock] = useState<number>(stats.available);

  // Add Consuming Time & Amount Modal
  const [showAddScheduleModal, setShowAddScheduleModal] = useState(false);
  const [newScheduleTime, setNewScheduleTime] = useState('08:00');
  const [newScheduleAmount, setNewScheduleAmount] = useState<number>(
    stats.unit === 'kg' || stats.unit === 'ltr' || stats.unit === 'liters' ? 0.5 : (stats.unit === 'ml' ? 2.5 : 1)
  );
  const [newScheduleLabel, setNewScheduleLabel] = useState(isGrocery ? 'Breakfast Serving' : 'Morning Dose');

  // Intake History Modal
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  const todayStr = new Date().toISOString().split('T')[0];

  // Fraction step size tailored to unit
  const isFractionalUnit = stats.unit === 'kg' || stats.unit === 'ltr' || stats.unit === 'liters' || stats.unit === 'g';
  const isMl = stats.unit === 'ml';
  const dosageStep = isMl ? 0.25 : isFractionalUnit ? 0.25 : 0.5;

  const handleTakeDailyDose = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (stats.available <= 0) {
      showToast(`Cannot consume: ${item.name} is completely out of stock!`, 'error');
      return;
    }
    const amountToTake = Math.min(stats.available, stats.dailyDosage);
    const updated = recordDoseConsumption(item, amountToTake);
    sounds.playSuccessChime();
    onUpdateItem(updated);
    const remaining = Math.max(0, Math.round((stats.available - amountToTake) * 1000) / 1000);
    showToast(
      isGrocery
        ? `Logged ${formatQuantity(amountToTake)} ${stats.unit} consumed. ${formatQuantity(remaining)} ${stats.unit} remaining.`
        : `Logged ${formatQuantity(amountToTake)} ${stats.unit} taken. ${formatQuantity(remaining)} ${stats.unit} remaining.`,
      isGrocery ? 'restaurant' : 'medication'
    );
  };

  const handleConfirmCustomConsume = (e: React.FormEvent) => {
    e.preventDefault();
    if (customConsumeAmount <= 0) return;
    if (stats.available <= 0) {
      showToast(`Cannot consume: ${item.name} is out of stock!`, 'error');
      return;
    }
    const amountToTake = Math.min(stats.available, customConsumeAmount);
    const updated = recordDoseConsumption(item, amountToTake, undefined, 'Manual Intake');
    sounds.playSuccessChime();
    onUpdateItem(updated);
    setShowCustomConsumeModal(false);
    const remaining = Math.max(0, Math.round((stats.available - amountToTake) * 1000) / 1000);
    showToast(
      `Logged ${formatQuantity(amountToTake)} ${stats.unit} consumed. ${formatQuantity(remaining)} ${stats.unit} remaining.`,
      isGrocery ? 'restaurant' : 'medication'
    );
  };

  // Specific scheduled dose intake confirmation
  const handleTakeScheduleDose = (sch: ConsumptionSchedule, e: React.MouseEvent) => {
    e.stopPropagation();
    if (stats.available <= 0) {
      showToast(`Cannot consume: ${item.name} is out of stock!`, 'error');
      return;
    }
    const doseAmount = Math.min(stats.available, sch.amount);
    const updated = recordDoseConsumption(item, doseAmount, sch.id, sch.label);
    sounds.playSuccessChime();
    onUpdateItem(updated);
    const remainingAfter = Math.max(0, Math.round((stats.available - doseAmount) * 1000) / 1000);
    showToast(
      `Confirmed! Took ${formatQuantity(doseAmount)} ${stats.unit} (${sch.label}). ${formatQuantity(remainingAfter)} ${stats.unit} remaining.`,
      'check_circle'
    );
  };

  // Test notification button for a schedule
  const handleTestScheduleNotification = (sch: ConsumptionSchedule, e: React.MouseEvent) => {
    e.stopPropagation();
    notificationService.triggerIntakeAlert(item, sch, true);
    if (onTriggerAlarmPrompt) {
      onTriggerAlarmPrompt(item, sch);
    } else {
      showToast(
        `🔔 [Test Alarm] Time for ${item.name} (${formatQuantity(sch.amount)} ${stats.unit} • ${formatScheduleTime(sch.time)})`,
        'alarm_on'
      );
    }
  };

  const handleToggleSchedule = (schId: string, enabled: boolean, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = toggleConsumptionSchedule(item, schId, enabled);
    onUpdateItem(updated);
    showToast(enabled ? 'Consuming reminder enabled' : 'Consuming reminder paused', enabled ? 'alarm_on' : 'alarm_off');
  };

  const handleDeleteSchedule = (schId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = deleteConsumptionSchedule(item, schId);
    onUpdateItem(updated);
    showToast('Consuming schedule removed', 'delete');
  };

  const handleAddScheduleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newScheduleAmount <= 0) return;
    const updated = addConsumptionSchedule(item, {
      time: newScheduleTime,
      amount: newScheduleAmount,
      label: newScheduleLabel.trim() || 'Scheduled Intake',
      enabled: true,
    });
    onUpdateItem(updated);
    setShowAddScheduleModal(false);
    showToast(
      `Added alarm for ${formatScheduleTime(newScheduleTime)} (${formatQuantity(newScheduleAmount)} ${stats.unit})`,
      'alarm_on'
    );
  };

  const handleSaveDosage = (e: React.MouseEvent) => {
    e.stopPropagation();
    const cleanDosage = Math.max(0.01, tempDosage);
    const updated = updateMedicineDosage(item, cleanDosage);
    onUpdateItem(updated);
    setIsEditingDosage(false);
    showToast(`Daily consumption set to ${formatQuantity(cleanDosage)} ${stats.unit} / day`, 'tune');
  };

  const handleSaveRemainingStock = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanRemaining = Math.max(0, Math.round(customRemainingStock * 1000) / 1000);
    const newConsumed = Math.max(0, Math.round((stats.totalStock - cleanRemaining) * 1000) / 1000);
    const updated: ExpiryItem = {
      ...item,
      remainingStock: cleanRemaining,
      currentStock: cleanRemaining,
      consumedUnits: newConsumed,
    };
    onUpdateItem(updated);
    setShowAdjustStockModal(false);
    showToast(`Remaining stock updated to ${formatQuantity(cleanRemaining)} ${stats.unit}`, 'inventory_2');
  };

  const handleRefillSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (refillAmount <= 0) return;
    const updated = refillMedicineStock(item, refillAmount);
    onUpdateItem(updated);
    setShowRefillModal(false);
    showToast(`Added +${formatQuantity(refillAmount)} ${stats.unit} to ${item.name} stock`, 'add_circle');
  };

  const toggleStockAlerts = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    const updated: ExpiryItem = {
      ...item,
      stockAlertsEnabled: e.target.checked,
    };
    onUpdateItem(updated);
    showToast(
      e.target.checked ? 'Pre-stockout notification enabled' : 'Pre-stockout alerts disabled',
      e.target.checked ? 'notifications_active' : 'notifications_off'
    );
  };

  if (!stats.hasTracking) return null;

  const schedules = item.consumptionSchedules || [];

  // COMPACT VARIANT (for Dashboard cards or lists)
  if (variant === 'compact') {
    return (
      <div className="mt-2.5 pt-2.5 border-t border-[#eaedff] dark:border-[#283044] space-y-2">
        {/* Stock Metrics Bar */}
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 font-bold text-[#131b2e] dark:text-white">
            <span className="material-symbols-outlined text-[16px] text-[#005c55] dark:text-[#6df5e1]">
              {isGrocery ? 'kitchen' : 'pill'}
            </span>
            <span>Stock: {formatQuantity(stats.totalStock)} {stats.unit}</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] text-[#3e4947] dark:text-[#bdc9c6]">
              Consumed: <strong className="text-[#131b2e] dark:text-white">{formatQuantity(stats.consumed)}</strong>
            </span>
            <span className="text-[11px] font-bold text-[#005c55] dark:text-[#6df5e1]">
              Available: {formatQuantity(stats.available)} {stats.unit}
            </span>
          </div>
        </div>

        {/* Progress meter */}
        <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden flex">
          <div
            className={`h-full transition-all duration-500 ${
              stats.isStockedOut
                ? 'bg-red-500'
                : stats.isLowStock
                ? 'bg-amber-500'
                : 'bg-[#005c55]'
            }`}
            style={{ width: `${stats.availablePercent}%` }}
            title={`${formatQuantity(stats.available)} available (${stats.availablePercent}%)`}
          ></div>
        </div>

        {/* Scheduled Alarms Pill Chip if any */}
        {schedules.length > 0 && (
          <div className="flex items-center justify-between gap-1 text-[11px] bg-slate-100 dark:bg-[#1a2333] px-2 py-1 rounded-lg">
            <div className="flex items-center gap-1 text-[#005c55] dark:text-[#6df5e1] font-semibold truncate">
              <span className="material-symbols-outlined text-[13px]">alarm</span>
              <span>
                {schedules.length} Scheduled Time{schedules.length > 1 ? 's' : ''}: {schedules.map(s => formatScheduleTime(s.time)).join(', ')}
              </span>
            </div>
            {schedules.some(s => s.lastConfirmedDate === todayStr) && (
              <span className="text-[10px] text-emerald-600 font-bold shrink-0 flex items-center gap-0.5">
                <span className="material-symbols-outlined text-[11px]">check_circle</span>
                Dose Taken Today
              </span>
            )}
          </div>
        )}

        {/* Dosage / Daily consumption and Action */}
        <div className="flex items-center justify-between gap-2 pt-0.5">
          <span className="text-[11px] text-[#3e4947] dark:text-[#bdc9c6] flex items-center gap-1">
            <span className="material-symbols-outlined text-[14px] text-slate-400">schedule</span>
            Daily: <strong>{formatQuantity(stats.dailyDosage)} {stats.unit}/day</strong>
          </span>

          <div className="flex items-center gap-1.5">
            {stats.isLowStock && (
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#ffdad6] text-[#ba1a1a] flex items-center gap-0.5">
                <span className="material-symbols-outlined text-[12px]">warning</span>
                {stats.daysOfSupplyLeft}d left
              </span>
            )}
            <button
              onClick={handleTakeDailyDose}
              disabled={stats.available <= 0}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition-all ${
                stats.available <= 0
                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  : 'bg-[#005c55] text-white hover:bg-[#0f766e] active:scale-95 shadow-xs'
              }`}
            >
              <span className="material-symbols-outlined text-[14px]">
                {isGrocery ? 'restaurant' : 'medication'}
              </span>
              <span>{isGrocery ? `Consume (-${formatQuantity(stats.dailyDosage)})` : `Take Dose (-${formatQuantity(stats.dailyDosage)})`}</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // FULL DETAILED VARIANT (for ItemDetailView)
  return (
    <div className="bg-white dark:bg-[#131b2e] rounded-2xl p-4 shadow-sm border border-[#eaedff] dark:border-[#283044] space-y-4">
      {/* Title & Status */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-[#6df5e1]/30 dark:bg-[#005c55]/30 flex items-center justify-center text-[#006f64] dark:text-[#6df5e1]">
            <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>
              {isGrocery ? 'kitchen' : 'pill'}
            </span>
          </div>
          <div>
            <h3 className="font-bold text-sm text-[#131b2e] dark:text-white">
              {isGrocery ? '🥑 Grocery Stock & Fraction Consumption' : 'Medicine Stock & Fraction Dosage Monitor'}
            </h3>
            <p className="text-[11px] text-[#3e4947] dark:text-[#bdc9c6]">
              {isGrocery
                ? 'Precision pantry tracking (.5 kg, 1.5 ltr), timed consumption & alerts'
                : 'Fractional dosage tracking (2.75 ml, 0.5 tab), timed alarms & stockout alerts'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {item.consumptionHistory && item.consumptionHistory.length > 0 && (
            <button
              onClick={() => setShowHistoryModal(true)}
              className="px-2 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1 transition-colors"
              title="View intake history"
            >
              <span className="material-symbols-outlined text-[14px]">history</span>
              <span className="hidden sm:inline">History</span>
            </button>
          )}

          <button
            onClick={() => setShowRefillModal(true)}
            className="px-2.5 py-1 rounded-xl bg-[#eaedff] dark:bg-[#283044] hover:bg-[#dae2fd] text-xs font-bold text-[#005c55] dark:text-[#6df5e1] flex items-center gap-1 transition-colors"
          >
            <span className="material-symbols-outlined text-[15px]">
              {isGrocery ? 'add_shopping_cart' : 'add_circle'}
            </span>
            <span>{isGrocery ? 'Restock Item' : 'Refill Stock'}</span>
          </button>
        </div>
      </div>

      {/* 3 Metric Cards: Stock, Consumed, Available */}
      <div className="grid grid-cols-3 gap-2.5">
        {/* Total Stock */}
        <div className="p-3 rounded-xl bg-[#f2f3ff] dark:bg-[#283044] flex flex-col justify-between">
          <span className="text-[11px] font-semibold text-[#3e4947] dark:text-[#bdc9c6] flex items-center gap-1">
            <span className="material-symbols-outlined text-[14px]">inventory_2</span>
            Total Stock
          </span>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-xl font-black text-[#131b2e] dark:text-white">
              {formatQuantity(stats.totalStock)}
            </span>
            <span className="text-[11px] text-[#3e4947] dark:text-[#bdc9c6]">
              {stats.unit}
            </span>
          </div>
          <span className="text-[10px] text-slate-400 mt-0.5">Initial pack</span>
        </div>

        {/* Consumed */}
        <div className="p-3 rounded-xl bg-[#f2f3ff] dark:bg-[#283044] flex flex-col justify-between">
          <span className="text-[11px] font-semibold text-[#3e4947] dark:text-[#bdc9c6] flex items-center gap-1">
            <span className="material-symbols-outlined text-[14px] text-slate-500">done</span>
            Consumed
          </span>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-xl font-black text-slate-700 dark:text-slate-300">
              {formatQuantity(stats.consumed)}
            </span>
            <span className="text-[11px] text-[#3e4947] dark:text-[#bdc9c6]">
              ({stats.consumedPercent}%)
            </span>
          </div>
          <span className="text-[10px] text-slate-400 mt-0.5">
            {isGrocery ? 'Quantity consumed' : 'Quantity taken'}
          </span>
        </div>

        {/* Remaining Stock */}
        <div className={`p-3 rounded-xl flex flex-col justify-between border ${
          stats.isStockedOut
            ? 'bg-[#ffdad6]/40 dark:bg-red-950/40 border-[#ffb4ab]'
            : stats.isLowStock
            ? 'bg-[#ffedd5]/50 dark:bg-amber-950/40 border-[#fed7aa]'
            : 'bg-[#6df5e1]/20 dark:bg-emerald-950/30 border-[#6df5e1]/40'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[#131b2e] dark:text-white flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px] text-[#005c55] dark:text-[#6df5e1]">
                check_circle
              </span>
              Remaining
            </span>
            <button
              onClick={() => {
                setCustomRemainingStock(item.remainingStock ?? stats.available);
                setShowAdjustStockModal(true);
              }}
              title="Directly adjust remaining stock count"
              className="text-[10px] text-[#005c55] dark:text-[#6df5e1] font-bold hover:underline flex items-center gap-0.5"
            >
              <span>Edit</span>
              <span className="material-symbols-outlined text-[12px]">edit</span>
            </button>
          </div>
          <div className="mt-1 flex items-baseline gap-1">
            <span className={`text-xl font-black ${
              stats.isStockedOut ? 'text-[#ba1a1a]' : stats.isLowStock ? 'text-[#c2410c]' : 'text-[#005c55] dark:text-[#6df5e1]'
            }`}>
              {formatQuantity(item.remainingStock ?? stats.available)}
            </span>
            <span className="text-[11px] font-semibold text-[#3e4947] dark:text-[#bdc9c6]">
              {stats.unit}
            </span>
          </div>
          <span className="text-[10px] font-semibold text-[#005c55] dark:text-[#6df5e1] mt-0.5">
            {stats.daysOfSupplyLeft} days left
          </span>
        </div>
      </div>

      {/* Progress Bar of Stock depletion */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="text-[#3e4947] dark:text-[#bdc9c6] text-[11px]">
            Inventory Depletion:
          </span>
          <span className="font-bold text-xs text-[#131b2e] dark:text-white">
            {formatQuantity(stats.available)} of {formatQuantity(stats.totalStock)} {stats.unit} remaining
          </span>
        </div>
        <div className="w-full bg-[#eaedff] dark:bg-[#283044] h-3 rounded-full overflow-hidden flex shadow-inner">
          <div
            className={`h-full transition-all duration-700 rounded-full ${
              stats.isStockedOut
                ? 'bg-[#ba1a1a]'
                : stats.isLowStock
                ? 'bg-gradient-to-r from-[#ea580c] to-[#f59e0b]'
                : 'bg-gradient-to-r from-[#005c55] to-[#0f766e]'
            }`}
            style={{ width: `${stats.availablePercent}%` }}
          ></div>
        </div>
      </div>

      {/* ⏰ SCHEDULED CONSUMING TIMES & TIMED ALARMS SECTION */}
      <div className="p-3.5 rounded-2xl bg-gradient-to-br from-[#f8faff] to-[#f0f4ff] dark:from-[#1b2336] dark:to-[#171f30] border border-[#d8e2fd] dark:border-[#2d3a54] space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[#005c55] text-white flex items-center justify-center">
              <span className="material-symbols-outlined text-[16px]">alarm</span>
            </div>
            <div>
              <h4 className="text-xs font-bold text-[#131b2e] dark:text-white flex items-center gap-1.5">
                <span>Timed Consuming Alarms & Deductions</span>
                <span className="text-[10px] font-normal px-1.5 py-0.2 rounded-full bg-[#6df5e1]/40 text-[#006f64] dark:text-[#6df5e1]">
                  {schedules.length} configured
                </span>
              </h4>
              <p className="text-[10px] text-slate-500 dark:text-slate-400">
                Receive notification at this time &bull; Confirm intake to auto-deduct available stock
              </p>
            </div>
          </div>

          <button
            onClick={() => setShowAddScheduleModal(true)}
            className="px-2.5 py-1.5 rounded-xl bg-[#005c55] hover:bg-[#0f766e] text-white text-xs font-bold flex items-center gap-1 shadow-xs transition-all active:scale-95"
          >
            <span className="material-symbols-outlined text-[15px]">add_alarm</span>
            <span>Add Time & Amount</span>
          </button>
        </div>

        {/* List of Scheduled Intake Times */}
        {schedules.length === 0 ? (
          <div className="py-4 px-3 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 text-center space-y-2">
            <span className="material-symbols-outlined text-slate-400 text-[24px]">alarm_off</span>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              No specific consuming times set yet. Add a time (e.g. 08:30 AM) and dose amount (e.g. {formatQuantity(stats.dailyDosage)} {stats.unit}) to get notified!
            </p>
            <button
              onClick={() => setShowAddScheduleModal(true)}
              className="inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-bold text-[#005c55] dark:text-[#6df5e1] bg-[#6df5e1]/20 hover:bg-[#6df5e1]/40 transition-colors"
            >
              <span className="material-symbols-outlined text-[14px]">add</span>
              <span>Set First Consuming Time</span>
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {schedules.map((sch) => {
              const isTakenToday = sch.lastConfirmedDate === todayStr;
              return (
                <div
                  key={sch.id}
                  className={`p-3 rounded-xl border transition-all ${
                    isTakenToday
                      ? 'bg-emerald-50/80 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800'
                      : !sch.enabled
                      ? 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 opacity-60'
                      : 'bg-white dark:bg-[#131b2e] border-[#eaedff] dark:border-[#283044] shadow-xs'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                        isTakenToday
                          ? 'bg-emerald-500 text-white'
                          : sch.enabled
                          ? 'bg-[#005c55] text-white'
                          : 'bg-slate-300 text-slate-600'
                      }`}>
                        <span className="material-symbols-outlined text-[18px]">
                          {isTakenToday ? 'check' : 'notifications_active'}
                        </span>
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-black text-sm text-[#131b2e] dark:text-white">
                            {formatScheduleTime(sch.time)}
                          </span>
                          <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-[#6df5e1]/30 text-[#006f64] dark:text-[#6df5e1]">
                            {formatQuantity(sch.amount)} {stats.unit}
                          </span>
                          {isTakenToday ? (
                            <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300">
                              ✓ Taken today ({sch.lastConfirmedTime || 'Logged'})
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.2 rounded text-[10px] font-medium bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                              Upcoming
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                          {sch.label}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {/* Confirm Taken action button */}
                      <button
                        onClick={(e) => handleTakeScheduleDose(sch, e)}
                        disabled={stats.available <= 0}
                        title={`Confirm intake of ${formatQuantity(sch.amount)} ${stats.unit} now`}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-all ${
                          isTakenToday
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300 hover:bg-emerald-200'
                            : stats.available <= 0
                            ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                            : 'bg-[#005c55] hover:bg-[#0f766e] text-white shadow-xs active:scale-95'
                        }`}
                      >
                        <span className="material-symbols-outlined text-[14px]">
                          {isTakenToday ? 'done_all' : 'check'}
                        </span>
                        <span>{isTakenToday ? 'Take Again' : `Take ${formatQuantity(sch.amount)}`}</span>
                      </button>

                      {/* Test Notification / Trigger Alarm */}
                      <button
                        onClick={(e) => handleTestScheduleNotification(sch, e)}
                        title="Simulate / Trigger Alarm Notification Now"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-[#005c55] hover:bg-slate-100 dark:hover:bg-[#283044] transition-colors"
                      >
                        <span className="material-symbols-outlined text-[16px]">notifications</span>
                      </button>

                      {/* Toggle On/Off */}
                      <button
                        onClick={(e) => handleToggleSchedule(sch.id, !sch.enabled, e)}
                        title={sch.enabled ? 'Pause schedule' : 'Resume schedule'}
                        className={`p-1.5 rounded-lg transition-colors ${
                          sch.enabled
                            ? 'text-[#005c55] dark:text-[#6df5e1] hover:bg-slate-100 dark:hover:bg-[#283044]'
                            : 'text-slate-400 hover:bg-slate-100'
                        }`}
                      >
                        <span className="material-symbols-outlined text-[16px]">
                          {sch.enabled ? 'toggle_on' : 'toggle_off'}
                        </span>
                      </button>

                      {/* Delete */}
                      <button
                        onClick={(e) => handleDeleteSchedule(sch.id, e)}
                        title="Delete schedule"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-slate-100 dark:hover:bg-[#283044] transition-colors"
                      >
                        <span className="material-symbols-outlined text-[16px]">delete</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Daily Consumption Rate Editor (Supporting Fractions: .5, 2.75, 1.5) */}
      <div className="p-3.5 rounded-xl bg-[#f2f3ff] dark:bg-[#283044] space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-[#131b2e] dark:text-white flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[16px] text-[#005c55] dark:text-[#6df5e1]">
              speed
            </span>
            Daily Consumption Rate
          </span>
          {!isEditingDosage ? (
            <button
              onClick={() => {
                setTempDosage(stats.dailyDosage);
                setIsEditingDosage(true);
              }}
              className="text-xs font-bold text-[#005c55] dark:text-[#6df5e1] hover:underline flex items-center gap-0.5"
            >
              <span>Change</span>
              <span className="material-symbols-outlined text-[14px]">edit</span>
            </button>
          ) : (
            <div className="flex items-center gap-1">
              <button
                onClick={() => setIsEditingDosage(false)}
                className="px-2 py-0.5 text-xs text-slate-500 hover:text-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveDosage}
                className="px-2.5 py-0.5 rounded-lg bg-[#005c55] text-white text-xs font-bold"
              >
                Save
              </button>
            </div>
          )}
        </div>

        {!isEditingDosage ? (
          <div className="flex items-center justify-between">
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-black text-[#131b2e] dark:text-white">
                {formatQuantity(stats.dailyDosage)}
              </span>
              <span className="text-xs text-[#3e4947] dark:text-[#bdc9c6]">
                {stats.unit} daily consumed
              </span>
            </div>
            <div className="text-right">
              <span className="text-xs text-[#3e4947] dark:text-[#bdc9c6] block">
                {isGrocery ? 'Last Consumed' : 'Last Dose Taken'}
              </span>
              <span className="text-xs font-semibold text-[#131b2e] dark:text-white">
                {item.lastDoseDate || 'Not logged today'}
              </span>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3 pt-1">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setTempDosage((prev) => Math.max(0.01, Math.round((prev - dosageStep) * 100) / 100))}
                className="w-8 h-8 rounded-lg bg-white dark:bg-[#131b2e] border border-slate-300 dark:border-slate-600 font-bold text-base flex items-center justify-center hover:bg-slate-100"
              >
                -
              </button>
              <input
                type="number"
                step="any"
                min="0.01"
                max="10000"
                value={tempDosage}
                onChange={(e) => setTempDosage(parseFractionQuantity(e.target.value, 0.01))}
                className="w-20 h-8 text-center rounded-lg bg-white dark:bg-[#131b2e] border border-slate-300 dark:border-slate-600 font-bold text-sm"
              />
              <button
                type="button"
                onClick={() => setTempDosage((prev) => Math.round((prev + dosageStep) * 100) / 100)}
                className="w-8 h-8 rounded-lg bg-white dark:bg-[#131b2e] border border-slate-300 dark:border-slate-600 font-bold text-base flex items-center justify-center hover:bg-slate-100"
              >
                +
              </button>
            </div>
            <span className="text-xs text-[#3e4947] dark:text-[#bdc9c6]">
              {stats.unit} / day
            </span>
          </div>
        )}
      </div>

      {/* Before Stock Out & Dual Expiry Notification Card */}
      <div className={`p-3.5 rounded-xl border space-y-2.5 ${
        stats.isStockedOut
          ? 'bg-[#ffdad6]/60 dark:bg-red-950/40 border-[#ffb4ab]'
          : stats.isLowStock
          ? 'bg-[#ffedd5]/70 dark:bg-amber-950/40 border-[#fed7aa]'
          : 'bg-[#eaedff] dark:bg-[#283044] border-[#dae2fd] dark:border-[#384259]'
      }`}>
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-2.5">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
              stats.isStockedOut
                ? 'bg-[#ba1a1a] text-white'
                : stats.isLowStock
                ? 'bg-[#c2410c] text-white animate-bounce'
                : 'bg-[#005c55] text-white'
            }`}>
              <span className="material-symbols-outlined text-[18px]">
                {stats.isStockedOut ? 'error' : stats.isLowStock ? 'notification_important' : 'notifications_active'}
              </span>
            </div>
            <div>
              <span className="font-bold text-xs text-[#131b2e] dark:text-white block">
                {stats.isStockedOut
                  ? 'Out of Stock Alert'
                  : stats.isLowStock
                  ? 'Stockout Warning'
                  : 'Automated Stockout Alert Active'}
              </span>
              <p className="text-[11px] text-[#3e4947] dark:text-[#bdc9c6] mt-0.5">
                {stats.isStockedOut
                  ? `${item.name} has 0 ${stats.unit} remaining. Restock immediately.`
                  : stats.isLowStock
                  ? `Only ${stats.daysOfSupplyLeft} day${stats.daysOfSupplyLeft === 1 ? '' : 's'} of supply remaining (${formatQuantity(stats.available)} ${stats.unit}). Restock recommended.`
                  : `Predicted stock exhaustion on ${stats.formattedStockoutDate} (${stats.daysOfSupplyLeft} days of supply left).`}
              </p>
            </div>
          </div>

          <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-0.5">
            <input
              type="checkbox"
              checked={item.stockAlertsEnabled !== false}
              onChange={toggleStockAlerts}
              className="sr-only peer"
            />
            <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#005c55]"></div>
          </label>
        </div>

        {/* Dual Comparison: Expiry Date vs Stockout Date */}
        <div className="pt-2 border-t border-slate-200/80 dark:border-slate-700/60 text-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[#3e4947] dark:text-[#bdc9c6]">Expiration Date:</span>
            <span className="font-semibold text-[#131b2e] dark:text-white">
              {formatDisplayDate(item.expiryDate)} ({stats.daysUntilExpiry} days left)
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[#3e4947] dark:text-[#bdc9c6]">Projected Stockout Date:</span>
            <span className="font-semibold text-[#131b2e] dark:text-white">
              {stats.formattedStockoutDate}
            </span>
          </div>

          {stats.expiresBeforeStockout ? (
            <div className="p-2 rounded-lg bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 text-[11px] font-medium flex items-start gap-1.5 mt-1.5">
              <span className="material-symbols-outlined text-[15px] shrink-0 text-rose-600 mt-0.5">
                warning
              </span>
              <span>
                <strong>Early Spoilage Alert:</strong> Best-by date occurs <strong>{stats.daysDifference} days before stockout</strong>. Approximately <strong>{formatQuantity(stats.wasteRiskUnits)} {stats.unit}</strong> risk expiring before consumption!
              </span>
            </div>
          ) : stats.stocksOutBeforeExpiry ? (
            <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 text-[11px] font-medium flex items-start gap-1.5 mt-1.5">
              <span className="material-symbols-outlined text-[15px] shrink-0 text-emerald-600 mt-0.5">
                verified
              </span>
              <span>
                <strong>Zero-Waste Safe:</strong> Stock will be safely consumed <strong>{stats.daysDifference} days before best-by date</strong>.
              </span>
            </div>
          ) : null}
        </div>
      </div>

      {/* Main Action Buttons */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
        <button
          onClick={handleTakeDailyDose}
          disabled={stats.available <= 0}
          className={`py-3 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition-all ${
            stats.available <= 0
              ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
              : 'bg-[#005c55] hover:bg-[#0f766e] text-white'
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">
            {isGrocery ? 'restaurant' : 'medication'}
          </span>
          <span>{isGrocery ? `Consume (-${formatQuantity(stats.dailyDosage)})` : `Take (-${formatQuantity(stats.dailyDosage)})`}</span>
        </button>

        <button
          onClick={() => {
            setCustomConsumeAmount(stats.dailyDosage);
            setShowCustomConsumeModal(true);
          }}
          disabled={stats.available <= 0}
          className="py-3 px-3 rounded-xl bg-[#6df5e1]/40 hover:bg-[#6df5e1]/60 text-[#006f64] dark:text-[#131b2e] border border-[#6df5e1]/60 font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs active:scale-95 transition-all disabled:opacity-50"
        >
          <span className="material-symbols-outlined text-[18px]">
            colorize
          </span>
          <span>Log Fraction (.5, 2.75)</span>
        </button>

        <button
          onClick={() => setShowRefillModal(true)}
          className="py-3 px-3 rounded-xl bg-white dark:bg-[#283044] border border-[#eaedff] dark:border-slate-700 text-[#131b2e] dark:text-white hover:bg-slate-50 font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs active:scale-95 transition-all"
        >
          <span className="material-symbols-outlined text-[18px] text-[#006fa8]">
            {isGrocery ? 'add_shopping_cart' : 'local_pharmacy'}
          </span>
          <span>{isGrocery ? 'Restock Item' : 'Refill Supply'}</span>
        </button>
      </div>

      {/* Log Custom Fractional Consumption Modal */}
      {showCustomConsumeModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <form
            onSubmit={handleConfirmCustomConsume}
            className="bg-white dark:bg-[#131b2e] max-w-sm w-full p-5 rounded-3xl shadow-2xl space-y-4 border border-[#eaedff] dark:border-[#283044]"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[#005c55] text-white flex items-center justify-center">
                  <span className="material-symbols-outlined text-[18px]">colorize</span>
                </div>
                <div>
                  <h3 className="font-bold text-base text-[#131b2e] dark:text-white">
                    Log Consumption
                  </h3>
                  <p className="text-[11px] text-slate-500">For {item.name}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCustomConsumeModal(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <p className="text-xs text-[#3e4947] dark:text-[#bdc9c6]">
              Enter the exact fractional or standard amount consumed (e.g. <strong>.5 kg</strong>, <strong>2.75 ml</strong>, <strong>1.5 ltr</strong>).
            </p>

            {/* Quick preset chips */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#131b2e] dark:text-white">
                Quick Amounts ({stats.unit})
              </label>
              <div className="flex items-center gap-1.5 flex-wrap">
                {(isMl
                  ? [0.5, 1, 2.5, 2.75, 5, 10]
                  : isFractionalUnit
                  ? [0.25, 0.5, 0.75, 1, 1.5, 2]
                  : [0.5, 1, 1.5, 2, 3]
                ).map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setCustomConsumeAmount(Math.min(stats.available, preset))}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                      customConsumeAmount === preset
                        ? 'bg-[#005c55] text-white shadow-xs'
                        : 'bg-[#f2f3ff] dark:bg-[#283044] text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                    }`}
                  >
                    {formatQuantity(preset)} {stats.unit}
                  </button>
                ))}
              </div>
            </div>

            {/* Direct Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#131b2e] dark:text-white">
                Amount Consumed ({stats.unit})
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  step="any"
                  min="0.001"
                  max={stats.available}
                  required
                  value={customConsumeAmount}
                  onChange={(e) => setCustomConsumeAmount(parseFractionQuantity(e.target.value, 0.01))}
                  className="flex-1 h-11 px-3 rounded-xl bg-[#f2f3ff] dark:bg-[#283044] text-[#131b2e] dark:text-white text-base font-black focus:outline-none focus:ring-2 focus:ring-[#005c55]"
                />
                <span className="text-xs font-bold text-slate-600 dark:text-slate-300 w-16 text-center">
                  {stats.unit}
                </span>
              </div>
            </div>

            {/* Inventory calculation preview */}
            <div className="p-3 rounded-xl bg-[#eaedff] dark:bg-[#1f2638] text-xs space-y-1 border border-[#dae2fd] dark:border-[#2d374f]">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Current available:</span>
                <span className="font-bold text-[#131b2e] dark:text-white">{formatQuantity(stats.available)} {stats.unit}</span>
              </div>
              <div className="flex items-center justify-between font-bold pt-1 border-t border-slate-200 dark:border-slate-700">
                <span className="text-[#005c55] dark:text-[#6df5e1]">Remaining after:</span>
                <span>
                  {formatQuantity(Math.max(0, Math.round((stats.available - customConsumeAmount) * 1000) / 1000))} {stats.unit}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowCustomConsumeModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-[#005c55] text-white text-xs font-bold hover:bg-[#0f766e] active:scale-95 transition-all shadow-md flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-[15px]">check_circle</span>
                <span>Log {formatQuantity(customConsumeAmount)} {stats.unit}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Add Consuming Time & Amount Modal (supporting fractions: e.g. .5 kg, 2.75 ml, 1.5 ltr) */}
      {showAddScheduleModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <form
            onSubmit={handleAddScheduleSubmit}
            className="bg-white dark:bg-[#131b2e] max-w-sm w-full p-5 rounded-3xl shadow-2xl space-y-4 border border-[#eaedff] dark:border-[#283044]"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[#005c55] text-white flex items-center justify-center">
                  <span className="material-symbols-outlined text-[18px]">add_alarm</span>
                </div>
                <div>
                  <h3 className="font-bold text-base text-[#131b2e] dark:text-white">
                    Add Consuming Time & Amount
                  </h3>
                  <p className="text-[11px] text-slate-500">For {item.name}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddScheduleModal(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            {/* Time Presets & Picker */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-[#131b2e] dark:text-white flex items-center gap-1">
                <span className="material-symbols-outlined text-[15px] text-[#005c55] dark:text-[#6df5e1]">schedule</span>
                Consuming Time
              </label>

              {/* Quick time chips */}
              <div className="grid grid-cols-4 gap-1.5">
                {[
                  { time: '08:00', label: '8:00 AM' },
                  { time: '13:00', label: '1:00 PM' },
                  { time: '18:30', label: '6:30 PM' },
                  { time: '21:00', label: '9:00 PM' },
                ].map((preset) => (
                  <button
                    key={preset.time}
                    type="button"
                    onClick={() => {
                      setNewScheduleTime(preset.time);
                      if (preset.time === '08:00') setNewScheduleLabel('Morning Dose');
                      if (preset.time === '13:00') setNewScheduleLabel('After Lunch');
                      if (preset.time === '18:30') setNewScheduleLabel('Evening with Dinner');
                      if (preset.time === '21:00') setNewScheduleLabel('Bedtime');
                    }}
                    className={`py-1 rounded-lg text-xs font-bold transition-all ${
                      newScheduleTime === preset.time
                        ? 'bg-[#005c55] text-white'
                        : 'bg-[#f2f3ff] dark:bg-[#283044] text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>

              <input
                type="time"
                required
                value={newScheduleTime}
                onChange={(e) => setNewScheduleTime(e.target.value)}
                className="w-full h-11 px-3 rounded-xl bg-[#f2f3ff] dark:bg-[#283044] text-[#131b2e] dark:text-white text-base font-bold focus:outline-none focus:ring-2 focus:ring-[#005c55]"
              />
            </div>

            {/* Amount stepper supporting fractional values */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-[#131b2e] dark:text-white flex items-center gap-1">
                  <span className="material-symbols-outlined text-[15px] text-[#005c55] dark:text-[#6df5e1]">colorize</span>
                  Amount to Consume
                </label>
                <span className="text-xs text-slate-500">
                  Available: {formatQuantity(stats.available)} {stats.unit}
                </span>
              </div>

              {/* Fraction amount chips */}
              <div className="flex items-center gap-1.5 flex-wrap pb-1">
                {(isMl
                  ? [0.5, 1, 2.5, 2.75, 5]
                  : isFractionalUnit
                  ? [0.25, 0.5, 0.75, 1, 1.5, 2]
                  : [0.5, 1, 1.5, 2, 3]
                ).map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setNewScheduleAmount(preset)}
                    className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                      newScheduleAmount === preset
                        ? 'bg-[#005c55] text-white'
                        : 'bg-[#f2f3ff] dark:bg-[#283044] text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {formatQuantity(preset)}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setNewScheduleAmount((prev) => Math.max(0.01, Math.round((prev - dosageStep) * 100) / 100))}
                  className="w-10 h-10 rounded-xl bg-[#f2f3ff] dark:bg-[#283044] font-black text-base flex items-center justify-center hover:bg-slate-200"
                >
                  -
                </button>
                <input
                  type="number"
                  step="any"
                  min="0.01"
                  max={Math.max(1, stats.totalStock)}
                  required
                  value={newScheduleAmount}
                  onChange={(e) => setNewScheduleAmount(parseFractionQuantity(e.target.value, 0.01))}
                  className="flex-1 h-10 text-center rounded-xl bg-[#f2f3ff] dark:bg-[#283044] text-[#131b2e] dark:text-white font-black text-base focus:outline-none focus:ring-2 focus:ring-[#005c55]"
                />
                <button
                  type="button"
                  onClick={() => setNewScheduleAmount((prev) => Math.round((prev + dosageStep) * 100) / 100)}
                  className="w-10 h-10 rounded-xl bg-[#f2f3ff] dark:bg-[#283044] font-black text-base flex items-center justify-center hover:bg-slate-200"
                >
                  +
                </button>
                <span className="text-xs font-bold text-slate-600 dark:text-slate-300 w-14">
                  {stats.unit}
                </span>
              </div>
            </div>

            {/* Label */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#131b2e] dark:text-white">
                Routine / Label (Optional)
              </label>
              <input
                type="text"
                value={newScheduleLabel}
                onChange={(e) => setNewScheduleLabel(e.target.value)}
                placeholder="e.g. Morning with Water, Bedtime, After Lunch"
                className="w-full h-10 px-3 rounded-xl bg-[#f2f3ff] dark:bg-[#283044] text-[#131b2e] dark:text-white text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#005c55]"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddScheduleModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-[#005c55] text-white text-xs font-bold hover:bg-[#0f766e] active:scale-95 transition-all shadow-md flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-[15px]">alarm_on</span>
                <span>Save Alarm</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Intake History Modal */}
      {showHistoryModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#131b2e] max-w-md w-full p-5 rounded-3xl shadow-2xl space-y-4 border border-[#eaedff] dark:border-[#283044] max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[#005c55] text-white flex items-center justify-center">
                  <span className="material-symbols-outlined text-[18px]">history</span>
                </div>
                <div>
                  <h3 className="font-bold text-base text-[#131b2e] dark:text-white">
                    Intake & Consumption History
                  </h3>
                  <p className="text-[11px] text-slate-500">{item.name}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowHistoryModal(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {!item.consumptionHistory || item.consumptionHistory.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-8">
                  No consumption events logged yet.
                </p>
              ) : (
                item.consumptionHistory.map((log) => (
                  <div
                    key={log.id}
                    className="p-3 rounded-xl bg-[#f2f3ff] dark:bg-[#283044] flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="flex items-center gap-1.5 font-bold text-[#131b2e] dark:text-white">
                        <span>-{formatQuantity(log.amount)} {log.unit}</span>
                        <span className="text-[10px] font-normal px-1.5 py-0.2 rounded bg-[#eaedff] dark:bg-[#1b2336] text-slate-600 dark:text-slate-300">
                          {log.scheduleLabel || 'Intake'}
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-500">
                        {log.date} &bull; {log.time}
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="text-[11px] text-slate-500 block">Remaining</span>
                      <span className="font-bold text-[#005c55] dark:text-[#6df5e1]">
                        {formatQuantity(log.remainingAfter)} {log.unit}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>

            <button
              onClick={() => setShowHistoryModal(false)}
              className="w-full py-2.5 rounded-xl bg-slate-100 dark:bg-[#283044] text-[#131b2e] dark:text-white text-xs font-bold hover:bg-slate-200 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Refill Stock Modal (supporting fractions: .5 kg, 1.5 ltr, 250 ml) */}
      {showRefillModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <form
            onSubmit={handleRefillSubmit}
            className="bg-white dark:bg-[#131b2e] max-w-sm w-full p-5 rounded-3xl shadow-2xl space-y-4 border border-[#eaedff] dark:border-[#283044]"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#005c55] dark:text-[#6df5e1] text-[24px]">
                  {isGrocery ? 'add_shopping_cart' : 'local_pharmacy'}
                </span>
                <h3 className="font-bold text-base text-[#131b2e] dark:text-white">
                  {isGrocery ? `Restock ${item.name}` : 'Refill Medication'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowRefillModal(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <p className="text-xs text-[#3e4947] dark:text-[#bdc9c6]">
              {isGrocery
                ? `Add newly purchased ${stats.unit} to pantry inventory for `
                : `Add new medication units to your inventory for `}
              <strong>{item.name}</strong>.
            </p>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#131b2e] dark:text-white">
                Quantity to Add ({stats.unit})
              </label>
              <div className="flex items-center gap-2 flex-wrap">
                {(stats.unit === 'eggs'
                  ? [6, 12, 24]
                  : stats.unit === 'ml'
                  ? [5, 10, 50, 250, 500]
                  : stats.unit === 'g'
                  ? [100, 250, 500, 1000]
                  : stats.unit === 'kg' || stats.unit === 'ltr' || stats.unit === 'liters'
                  ? [0.5, 1, 1.5, 2, 5]
                  : isGrocery
                  ? [0.5, 1, 2, 6, 12]
                  : [10, 30, 60, 90]
                ).map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setRefillAmount(preset)}
                    className={`flex-1 min-w-[50px] py-1.5 rounded-xl text-xs font-bold transition-all ${
                      refillAmount === preset
                        ? 'bg-[#005c55] text-white shadow-xs'
                        : 'bg-[#f2f3ff] dark:bg-[#283044] text-[#131b2e] dark:text-white'
                    }`}
                  >
                    +{formatQuantity(preset)}
                  </button>
                ))}
              </div>
              <input
                type="number"
                step="any"
                min="0.01"
                required
                value={refillAmount}
                onChange={(e) => setRefillAmount(parseFractionQuantity(e.target.value, 0.01))}
                className="w-full h-11 px-3 mt-1.5 rounded-xl bg-[#f2f3ff] dark:bg-[#283044] text-[#131b2e] dark:text-white text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[#005c55]"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowRefillModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-[#005c55] text-white text-xs font-bold hover:bg-[#0f766e] active:scale-95 transition-all shadow-md"
              >
                {isGrocery ? 'Add Restock Units' : 'Add Refill Units'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Adjust Remaining Stock Modal (supporting fractions: .5 kg, 2.75 ml, 1.5 ltr) */}
      {showAdjustStockModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveRemainingStock}
            className="bg-white dark:bg-[#131b2e] max-w-sm w-full p-5 rounded-2xl shadow-2xl space-y-4 border border-[#eaedff] dark:border-[#283044]"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#005c55] text-[22px]">inventory</span>
                <h3 className="font-bold text-base text-[#131b2e] dark:text-white">Adjust Remaining Stock</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAdjustStockModal(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <p className="text-xs text-[#3e4947] dark:text-[#bdc9c6]">
              Set the exact number of remaining {stats.unit} on hand for <strong>{item.name}</strong>.
            </p>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#131b2e] dark:text-white">
                Remaining Stock Count ({stats.unit})
              </label>
              <input
                type="number"
                step="any"
                min="0"
                max={stats.totalStock * 2}
                required
                value={customRemainingStock}
                onChange={(e) => setCustomRemainingStock(parseFractionQuantity(e.target.value, 0))}
                className="w-full h-11 px-3 mt-1.5 rounded-xl bg-[#f2f3ff] dark:bg-[#283044] text-[#131b2e] dark:text-white text-base font-black focus:outline-none focus:ring-2 focus:ring-[#005c55]"
              />
              <span className="text-[11px] text-slate-400 block">
                Total pack size: {formatQuantity(stats.totalStock)} {stats.unit}
              </span>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAdjustStockModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-[#005c55] text-white text-xs font-bold hover:bg-[#0f766e] active:scale-95 transition-all shadow-md"
              >
                Save Remaining Stock
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
