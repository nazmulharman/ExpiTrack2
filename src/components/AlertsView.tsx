import React, { useState } from 'react';
import { ExpiryItem, NotificationSettings, ConsumptionSchedule } from '../types';
import { getDaysRemaining, formatDisplayDate } from '../utils/dateUtils';
import { getMedicineStockStats, recordDoseConsumption, refillMedicineStock, formatScheduleTime, formatQuantity } from '../utils/medicineUtils';
import { sounds } from '../utils/soundUtils';
import { notificationService } from '../services/notificationService';

interface AlertsViewProps {
  items: ExpiryItem[];
  notificationSettings: NotificationSettings;
  onOpenItemDetail: (item: ExpiryItem) => void;
  onOpenNotificationSettings: () => void;
  onMarkConsumed: (item: ExpiryItem) => void;
  onUpdateItem?: (item: ExpiryItem) => void;
  showToast: (msg: string, icon?: string) => void;
  onTriggerAlarmPrompt?: (item: ExpiryItem, schedule?: ConsumptionSchedule) => void;
}

export const AlertsView: React.FC<AlertsViewProps> = ({
  items,
  notificationSettings,
  onOpenItemDetail,
  onOpenNotificationSettings,
  onMarkConsumed,
  onUpdateItem,
  showToast,
  onTriggerAlarmPrompt,
}) => {
  const [activeFilter, setActiveFilter] = useState<'all' | 'schedule' | 'stock' | 'urgent' | 'upcoming' | 'digest'>('all');

  const activeItems = items.filter(i => i.status === 'active' || i.status === 'expired');
  const todayStr = new Date().toISOString().split('T')[0];

  // Daily Scheduled Intakes
  const scheduledIntakes = activeItems.flatMap(item => {
    if (!item.consumptionSchedules || item.consumptionSchedules.length === 0) return [];
    return item.consumptionSchedules.map(sch => ({
      item,
      schedule: sch,
      isTakenToday: sch.lastConfirmedDate === todayStr,
    }));
  }).sort((a, b) => a.schedule.time.localeCompare(b.schedule.time));

  // Pre-stockout & Zero-Waste Spoilage alerts (medicines & groceries)
  const stockAlerts = activeItems.filter(item => {
    if (item.category !== 'medicines' && item.category !== 'groceries' && item.initialStock === undefined && item.remainingStock === undefined) {
      return false;
    }
    if (item.stockAlertsEnabled === false) return false;
    const stats = getMedicineStockStats(item);
    return stats.isStockedOut || stats.isLowStock || (item.category === 'groceries' && stats.expiresBeforeStockout && stats.available > 0);
  });

  const urgentItems = activeItems.filter(i => getDaysRemaining(i.expiryDate) <= 7);
  const upcomingItems = activeItems.filter(i => {
    const days = getDaysRemaining(i.expiryDate);
    return days > 7 && days <= 30;
  });

  const handleSnooze = (itemName: string) => {
    showToast(`Alert for "${itemName}" snoozed for ${notificationSettings.snoozeSpan}`, 'snooze');
  };

  const handleQuickDose = (item: ExpiryItem) => {
    const stats = getMedicineStockStats(item);
    if (stats.available <= 0) {
      showToast(`Cannot consume: ${item.name} is completely out of stock!`, 'error');
      return;
    }
    const isGrocery = item.category === 'groceries';
    const updated = recordDoseConsumption(item, stats.dailyDosage);
    if (onUpdateItem) onUpdateItem(updated);
    showToast(
      isGrocery
        ? `Logged ${formatQuantity(stats.dailyDosage)} ${stats.unit} consumed. ${formatQuantity(Math.max(0, Math.round((stats.available - stats.dailyDosage) * 1000) / 1000))} remaining.`
        : `Logged ${formatQuantity(stats.dailyDosage)} ${stats.unit} taken. ${formatQuantity(Math.max(0, Math.round((stats.available - stats.dailyDosage) * 1000) / 1000))} remaining.`,
      isGrocery ? 'restaurant' : 'medication'
    );
  };

  const handleQuickRefill = (item: ExpiryItem) => {
    const stats = getMedicineStockStats(item);
    const isGrocery = item.category === 'groceries';
    const amount = stats.unit === 'eggs' ? 12 : (stats.unit === 'ml' || stats.unit === 'g' ? 500 : (stats.unit === 'kg' || stats.unit === 'ltr' || stats.unit === 'liters' ? 1 : (isGrocery ? 6 : 30)));
    const updated = refillMedicineStock(item, amount);
    if (onUpdateItem) onUpdateItem(updated);
    showToast(`Restocked +${formatQuantity(amount)} ${stats.unit} for ${item.name}`, isGrocery ? 'shopping_bag' : 'add_circle');
  };

  const handleTestPing = () => {
    showToast('🔔 ExpiTrack Ping: Amoxicillin 500mg requires attention!', 'notifications_active');
  };

  return (
    <div className="flex flex-col gap-4 pb-28 pt-2">
      {/* Header & Cadence Pill Banner */}
      <div className="flex items-center justify-between pt-1">
        <div>
          <h1 className="text-xl font-bold text-[#131b2e] dark:text-white">Smart Alerts & Reminders</h1>
          <p className="text-xs text-[#3e4947] dark:text-[#bdc9c6]">
            Proactive deadlines, pre-stockout alerts & digests
          </p>
        </div>
        <button
          onClick={onOpenNotificationSettings}
          className="w-10 h-10 rounded-full bg-white dark:bg-[#131b2e] border border-[#eaedff] dark:border-[#283044] flex items-center justify-center text-[#005c55] dark:text-[#6df5e1] hover:bg-[#eaedff] transition-all shadow-xs"
          title="Notification Settings"
        >
          <span className="material-symbols-outlined text-[20px]">tune</span>
        </button>
      </div>

      {/* Category Default Lead Times Banner */}
      <div className="p-3.5 rounded-2xl bg-gradient-to-r from-[#005c55] to-[#0f766e] text-white shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-[#6df5e1] shrink-0">
            <span className="material-symbols-outlined text-[22px]">alarm_on</span>
          </div>
          <div className="flex flex-col text-xs">
            <span className="font-bold text-sm">Active Proactive Monitors</span>
            <span className="text-[#a3faef] text-[11px]">
              Stockout Alerts Active • Meds Lead Time: 30d, 14d, 7d, 3d • Pantry: 5d, 3d, 1d
            </span>
          </div>
        </div>
        <button
          onClick={onOpenNotificationSettings}
          className="px-3 py-1.5 rounded-xl bg-white/20 hover:bg-white/30 text-white font-bold text-xs shrink-0 transition-colors"
        >
          Edit
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
        <button
          onClick={() => setActiveFilter('all')}
          className={`px-3.5 py-1.5 rounded-full text-xs font-semibold shrink-0 transition-all ${
            activeFilter === 'all'
              ? 'bg-[#005c55] text-white'
              : 'bg-white dark:bg-[#131b2e] text-[#3e4947] dark:text-[#bdc9c6] border border-[#eaedff] dark:border-[#283044]'
          }`}
        >
          All Alerts ({urgentItems.length + upcomingItems.length + stockAlerts.length})
        </button>

        {scheduledIntakes.length > 0 && (
          <button
            onClick={() => setActiveFilter('schedule')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold shrink-0 transition-all flex items-center gap-1.5 ${
              activeFilter === 'schedule'
                ? 'bg-[#005c55] text-white shadow-xs'
                : 'bg-[#eaedff] text-[#005c55] dark:bg-[#283044] dark:text-[#6df5e1] border border-[#dae2fd]'
            }`}
          >
            <span className="material-symbols-outlined text-[14px]">alarm</span>
            <span>⏰ Consuming Alarms ({scheduledIntakes.length})</span>
          </button>
        )}

        {stockAlerts.length > 0 && (
          <button
            onClick={() => setActiveFilter('stock')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold shrink-0 transition-all flex items-center gap-1.5 ${
              activeFilter === 'stock'
                ? 'bg-[#c2410c] text-white shadow-xs'
                : 'bg-[#fff7ed] text-[#c2410c] border border-[#fed7aa] dark:bg-amber-950/40 dark:text-amber-300'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-[#ea580c] animate-pulse"></span>
            📦 Stock & Spoilage ({stockAlerts.length})
          </button>
        )}

        <button
          onClick={() => setActiveFilter('urgent')}
          className={`px-3.5 py-1.5 rounded-full text-xs font-semibold shrink-0 transition-all flex items-center gap-1.5 ${
            activeFilter === 'urgent'
              ? 'bg-[#005c55] text-white'
              : 'bg-white dark:bg-[#131b2e] text-[#3e4947] dark:text-[#bdc9c6] border border-[#eaedff] dark:border-[#283044]'
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-[#ba1a1a]"></span>
          Urgent ({urgentItems.length})
        </button>
        <button
          onClick={() => setActiveFilter('upcoming')}
          className={`px-3.5 py-1.5 rounded-full text-xs font-semibold shrink-0 transition-all ${
            activeFilter === 'upcoming'
              ? 'bg-[#005c55] text-white'
              : 'bg-white dark:bg-[#131b2e] text-[#3e4947] dark:text-[#bdc9c6] border border-[#eaedff] dark:border-[#283044]'
          }`}
        >
          Upcoming ({upcomingItems.length})
        </button>
        <button
          onClick={() => setActiveFilter('digest')}
          className={`px-3.5 py-1.5 rounded-full text-xs font-semibold shrink-0 transition-all ${
            activeFilter === 'digest'
              ? 'bg-[#005c55] text-white'
              : 'bg-white dark:bg-[#131b2e] text-[#3e4947] dark:text-[#bdc9c6] border border-[#eaedff] dark:border-[#283044]'
          }`}
        >
          Weekly Digest
        </button>
      </div>

      {/* Scheduled Intakes Section (Medicines & Groceries) */}
      {(activeFilter === 'all' || activeFilter === 'schedule') && scheduledIntakes.length > 0 && (
        <div className="flex flex-col gap-2.5">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-bold uppercase tracking-wider text-[#005c55] dark:text-[#6df5e1] flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[18px]">alarm</span>
              Today's Scheduled Intakes & Alarms
            </span>
            <span className="text-[11px] font-semibold text-[#005c55] dark:text-[#6df5e1] bg-[#eaedff] dark:bg-[#283044] px-2 py-0.5 rounded-full border border-[#dae2fd] dark:border-[#384259]">
              {scheduledIntakes.filter(s => s.isTakenToday).length} of {scheduledIntakes.length} Taken Today
            </span>
          </div>

          <div className="space-y-2.5">
            {scheduledIntakes.map(({ item, schedule, isTakenToday }) => {
              const stats = getMedicineStockStats(item);
              const isGrocery = item.category === 'groceries';

              return (
                <div
                  key={`sch-alert-${item.id}-${schedule.id}`}
                  className={`p-4 rounded-2xl bg-white dark:bg-[#131b2e] shadow-xs flex flex-col gap-3 border-l-4 ${
                    isTakenToday
                      ? 'border-l-emerald-500 border border-emerald-100 dark:border-emerald-900/40'
                      : 'border-l-[#005c55] border border-[#eaedff] dark:border-[#283044]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 font-black ${
                        isTakenToday
                          ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40'
                          : 'bg-[#eaedff] text-[#005c55] dark:bg-[#283044] dark:text-[#6df5e1]'
                      }`}>
                        <span className="material-symbols-outlined text-[24px]">
                          {isTakenToday ? 'check_circle' : isGrocery ? 'restaurant' : 'alarm'}
                        </span>
                      </div>

                      <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-[#005c55] text-white">
                            {formatScheduleTime(schedule.time)}
                          </span>
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#6df5e1]/30 text-[#006f64] dark:text-[#6df5e1]">
                            Take {formatQuantity(schedule.amount)} {stats.unit}
                          </span>
                          {isTakenToday && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300">
                              ✓ Taken Today
                            </span>
                          )}
                        </div>

                        <h3
                          onClick={() => onOpenItemDetail(item)}
                          className="font-bold text-sm text-[#131b2e] dark:text-white truncate cursor-pointer hover:underline"
                        >
                          {item.name}
                        </h3>

                        <span className="text-xs text-[#3e4947] dark:text-[#bdc9c6]">
                          {schedule.label} &bull; Available: <strong>{formatQuantity(stats.available)} {stats.unit}</strong>
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => onOpenItemDetail(item)}
                      className="p-1.5 rounded-lg hover:bg-[#eaedff] dark:hover:bg-[#283044] text-[#3e4947] dark:text-[#bdc9c6]"
                      title="View item detail"
                    >
                      <span className="material-symbols-outlined text-[18px]">chevron_right</span>
                    </button>
                  </div>

                  {/* Stock impact preview */}
                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 text-xs flex items-center justify-between">
                    <span className="text-slate-600 dark:text-slate-400">
                      When confirmed, available stock will automatically reduce from <strong>{formatQuantity(stats.available)}</strong> to <strong>{formatQuantity(Math.max(0, Math.round((stats.available - schedule.amount) * 1000) / 1000))} {stats.unit}</strong>.
                    </span>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center justify-between gap-2 pt-1 border-t border-[#eaedff] dark:border-[#283044]">
                    <button
                      onClick={() => {
                        notificationService.triggerIntakeAlert(item, schedule, true);
                        if (onTriggerAlarmPrompt) {
                          onTriggerAlarmPrompt(item, schedule);
                        } else {
                          showToast(`🔔 [Test Alarm] Time for ${item.name} (${formatQuantity(schedule.amount)} ${stats.unit})`, 'alarm_on');
                        }
                      }}
                      className="px-3 py-1.5 rounded-xl text-xs font-semibold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 flex items-center gap-1 transition-colors"
                      title="Trigger audible alarm and intake dialog immediately"
                    >
                      <span className="material-symbols-outlined text-[15px]">alarm_on</span>
                      <span>Test Alarm</span>
                    </button>

                    <button
                      onClick={() => {
                        if (stats.available <= 0) {
                          showToast(`Cannot consume: ${item.name} is completely out of stock!`, 'error');
                          return;
                        }
                        const updated = recordDoseConsumption(item, schedule.amount, schedule.id, schedule.label);
                        sounds.playSuccessChime();
                        if (onUpdateItem) onUpdateItem(updated);
                        const newLeft = Math.max(0, Math.round((stats.available - schedule.amount) * 1000) / 1000);
                        showToast(`Confirmed! Took ${formatQuantity(schedule.amount)} ${stats.unit}. ${formatQuantity(newLeft)} ${stats.unit} remaining.`, 'check_circle');
                      }}
                      disabled={stats.available <= 0}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-bold shadow-xs flex items-center gap-1 active:scale-95 transition-all ${
                        isTakenToday
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300 hover:bg-emerald-200'
                          : stats.available <= 0
                          ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                          : 'bg-[#005c55] text-white hover:bg-[#0f766e]'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[15px]">
                        {isTakenToday ? 'done_all' : 'check'}
                      </span>
                      <span>
                        {isTakenToday
                          ? 'Take Dose Again'
                          : `Confirm I Took This (-${formatQuantity(schedule.amount)} ${stats.unit})`}
                      </span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 1. Pre-Stockout & Spoilage Alerts Section (Groceries & Medicines) */}
      {(activeFilter === 'all' || activeFilter === 'stock') && stockAlerts.length > 0 && (
        <div className="flex flex-col gap-2.5">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-bold uppercase tracking-wider text-[#c2410c] flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[18px]">notification_important</span>
              Pre-Stockout & Zero-Waste Alerts
            </span>
            <span className="text-[11px] font-semibold text-[#c2410c] bg-[#fff7ed] dark:bg-amber-950/40 px-2 py-0.5 rounded-full border border-[#fed7aa]">
              {stockAlerts.length} Item{stockAlerts.length !== 1 ? 's' : ''} Monitored
            </span>
          </div>

          {stockAlerts.map(item => {
            const stats = getMedicineStockStats(item);
            const isGrocery = item.category === 'groceries';
            const refillAmount = stats.unit === 'eggs' ? 12 : (stats.unit === 'ml' || stats.unit === 'g' ? 500 : (isGrocery ? 6 : 30));

            return (
              <div
                key={`stock-${item.id}`}
                className={`p-4 rounded-2xl bg-white dark:bg-[#131b2e] border-l-4 shadow-xs flex flex-col gap-3 ${
                  stats.expiresBeforeStockout && stats.available > 0
                    ? 'border-l-rose-600 border border-rose-200 dark:border-rose-900/60'
                    : 'border-l-[#c2410c] border border-[#fed7aa] dark:border-amber-900/60'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className={`relative w-12 h-12 rounded-xl overflow-hidden flex items-center justify-center shrink-0 border ${
                      stats.expiresBeforeStockout && stats.available > 0
                        ? 'bg-rose-50 text-rose-600 border-rose-200 dark:bg-rose-950/40 dark:border-rose-900/50'
                        : 'bg-amber-50 text-[#c2410c] border-amber-200 dark:bg-amber-950/40 dark:border-amber-900/50'
                    }`}>
                      <span className="material-symbols-outlined text-[24px]">
                        {isGrocery ? 'kitchen' : 'pill'}
                      </span>
                    </div>

                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          stats.isStockedOut
                            ? 'bg-[#ffdad6] text-[#ba1a1a]'
                            : stats.expiresBeforeStockout && stats.available > 0
                            ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                            : 'bg-[#ffedd5] text-[#c2410c]'
                        }`}>
                          {stats.isStockedOut
                            ? 'Out of Stock'
                            : stats.expiresBeforeStockout && stats.available > 0
                            ? `⚠️ Spoilage Warning: Expires in ${stats.daysUntilExpiry}d`
                            : `Low Stock: ${stats.daysOfSupplyLeft} Day${stats.daysOfSupplyLeft === 1 ? '' : 's'} Left`}
                        </span>
                        <span className="text-[11px] text-[#3e4947] dark:text-[#bdc9c6] truncate">
                          {item.storageLocation || (isGrocery ? 'Pantry / Refrigerator' : 'Medicine Cabinet')}
                        </span>
                      </div>

                      <h3
                        onClick={() => onOpenItemDetail(item)}
                        className="font-bold text-sm text-[#131b2e] dark:text-white truncate cursor-pointer hover:underline"
                      >
                        {item.name}
                      </h3>

                      <span className="text-xs text-[#3e4947] dark:text-[#bdc9c6]">
                        Stock: <strong>{formatQuantity(stats.totalStock)}</strong> | Consumed: <strong>{formatQuantity(stats.consumed)}</strong> | Available:{' '}
                        <strong className={stats.isStockedOut ? 'text-red-600' : 'text-amber-600'}>
                          {formatQuantity(stats.available)} {stats.unit}
                        </strong>
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => onOpenItemDetail(item)}
                    className="p-1.5 rounded-lg hover:bg-[#eaedff] dark:hover:bg-[#283044] text-[#3e4947] dark:text-[#bdc9c6]"
                  >
                    <span className="material-symbols-outlined text-[18px]">chevron_right</span>
                  </button>
                </div>

                {/* Warning & Dual Prediction Card */}
                <div className={`p-2.5 rounded-xl text-xs flex items-start gap-2 border ${
                  stats.expiresBeforeStockout && stats.available > 0
                    ? 'bg-rose-50/80 dark:bg-rose-950/30 text-rose-900 dark:text-rose-200 border-rose-200/80 dark:border-rose-900/40'
                    : 'bg-[#fff7ed] dark:bg-amber-950/30 text-[#3e4947] dark:text-[#bdc9c6] border border-[#fed7aa] dark:border-amber-900/40'
                }`}>
                  <span className={`material-symbols-outlined text-[18px] shrink-0 mt-0.5 ${
                    stats.expiresBeforeStockout && stats.available > 0 ? 'text-rose-600' : 'text-[#c2410c]'
                  }`}>
                    {stats.expiresBeforeStockout && stats.available > 0 ? 'alarm' : 'warning'}
                  </span>
                  <div>
                    <span className="font-bold text-[#131b2e] dark:text-white block">
                      Daily Consumption: {formatQuantity(stats.dailyDosage)} {stats.unit} consumed daily • Best-By: {formatDisplayDate(item.expiryDate)}
                    </span>
                    <span className="text-[11px] leading-relaxed">
                      {stats.isStockedOut ? (
                        'Inventory has completely run out. Restock immediately.'
                      ) : stats.expiresBeforeStockout && stats.available > 0 ? (
                        <>
                          <strong>Zero-Waste Spoilage Alert:</strong> Best-by date is in{' '}
                          <strong>{stats.daysUntilExpiry} days</strong>, but at {formatQuantity(stats.dailyDosage)} {stats.unit}/day you will have{' '}
                          <strong>{formatQuantity(stats.wasteRiskUnits)} {stats.unit} unconsumed</strong> when it expires! Increase daily usage or freeze.
                        </>
                      ) : (
                        <>
                          At this rate, supply will run out on <strong>{stats.formattedStockoutDate}</strong> ({stats.daysOfSupplyLeft} days left).
                          Stockout alert dispatched beforehand.
                        </>
                      )}
                    </span>
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex items-center justify-between gap-2 pt-1 border-t border-[#eaedff] dark:border-[#283044]">
                  <button
                    onClick={() => handleSnooze(item.name)}
                    className="px-3 py-1.5 rounded-xl text-xs font-semibold text-[#3e4947] dark:text-[#bdc9c6] hover:bg-[#eaedff] dark:hover:bg-[#283044] flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-[16px]">snooze</span>
                    Snooze
                  </button>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleQuickDose(item)}
                      disabled={stats.available <= 0}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold shadow-xs flex items-center gap-1 active:scale-95 transition-all ${
                        stats.available <= 0
                          ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                          : 'bg-[#005c55] text-white hover:bg-[#0f766e]'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[14px]">
                        {isGrocery ? 'restaurant' : 'medication'}
                      </span>
                      <span>{isGrocery ? `Consume (-${formatQuantity(stats.dailyDosage)})` : 'Take Dose'}</span>
                    </button>

                    <button
                      onClick={() => handleQuickRefill(item)}
                      className="px-3 py-1.5 rounded-xl bg-[#c2410c] text-white text-xs font-bold shadow-xs hover:bg-[#9a3412] flex items-center gap-1 active:scale-95 transition-all"
                    >
                      <span className="material-symbols-outlined text-[14px]">
                        {isGrocery ? 'add_shopping_cart' : 'local_pharmacy'}
                      </span>
                      <span>{isGrocery ? `Restock +${formatQuantity(refillAmount)}` : `Refill +${formatQuantity(refillAmount)}`}</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Action Window Closing Priority Banner */}
      {(activeFilter === 'all' || activeFilter === 'urgent') && urgentItems.length > 0 && (
        <div className="flex flex-col gap-2.5">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-bold uppercase tracking-wider text-[#ba1a1a] flex items-center gap-1">
              <span className="material-symbols-outlined text-[16px]">priority_high</span>
              Critical Triage • Action Window Closing
            </span>
            <span className="text-[11px] text-[#3e4947] dark:text-[#bdc9c6]">Requires Decision</span>
          </div>

          {urgentItems.map(item => {
            const days = getDaysRemaining(item.expiryDate);
            const isExpired = days < 0;

            return (
              <div
                key={item.id}
                className="p-4 rounded-2xl bg-white dark:bg-[#131b2e] border-l-4 border-l-[#ba1a1a] border border-[#eaedff] dark:border-[#283044] shadow-xs flex flex-col gap-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-slate-100 shrink-0">
                      {item.photos[0] ? (
                        <img src={item.photos[0].url} alt={item.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-400">
                          <span className="material-symbols-outlined text-[20px]">warning</span>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#ffdad6] text-[#ba1a1a]">
                          {isExpired ? `Expired ${Math.abs(days)}d ago` : `${days} days left`}
                        </span>
                        <span className="text-[11px] text-[#3e4947] dark:text-[#bdc9c6] truncate">
                          {item.storageLocation || item.subCategory}
                        </span>
                      </div>
                      <h3
                        onClick={() => onOpenItemDetail(item)}
                        className="font-bold text-sm text-[#131b2e] dark:text-white truncate cursor-pointer hover:underline"
                      >
                        {item.name}
                      </h3>
                      <span className="text-xs text-[#3e4947] dark:text-[#bdc9c6]">
                        Deadline: {formatDisplayDate(item.expiryDate)}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => onOpenItemDetail(item)}
                    className="p-1.5 rounded-lg hover:bg-[#eaedff] dark:hover:bg-[#283044] text-[#3e4947] dark:text-[#bdc9c6]"
                  >
                    <span className="material-symbols-outlined text-[18px]">chevron_right</span>
                  </button>
                </div>

                <p className="text-xs text-[#3e4947] dark:text-[#bdc9c6] bg-[#f2f3ff] dark:bg-[#283044] p-2.5 rounded-xl">
                  {item.notes || 'Deadline milestone active. Review item to prevent loss or expired usage.'}
                </p>

                <div className="flex items-center justify-between gap-2 pt-1 border-t border-[#eaedff] dark:border-[#283044]">
                  <button
                    onClick={() => handleSnooze(item.name)}
                    className="px-3 py-1.5 rounded-xl text-xs font-semibold text-[#3e4947] dark:text-[#bdc9c6] hover:bg-[#eaedff] dark:hover:bg-[#283044] flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-[16px]">snooze</span>
                    Snooze ({notificationSettings.snoozeSpan})
                  </button>

                  {item.category === 'groceries' ? (
                    <button
                      onClick={() => onMarkConsumed(item)}
                      className="px-3.5 py-1.5 rounded-xl bg-[#005c55] text-white text-xs font-bold shadow-xs hover:bg-[#0f766e] flex items-center gap-1 active:scale-95"
                    >
                      <span className="material-symbols-outlined text-[16px]">check_circle</span>
                      Mark Consumed
                    </button>
                  ) : item.category === 'warranty' ? (
                    <button
                      onClick={() => onOpenItemDetail(item)}
                      className="px-3.5 py-1.5 rounded-xl bg-[#0f766e] text-white text-xs font-bold shadow-xs hover:bg-[#005c55] flex items-center gap-1 active:scale-95"
                    >
                      <span className="material-symbols-outlined text-[16px]">open_in_new</span>
                      File Claim
                    </button>
                  ) : (
                    <button
                      onClick={() => onOpenItemDetail(item)}
                      className="px-3.5 py-1.5 rounded-xl bg-[#005c55] text-white text-xs font-bold shadow-xs hover:bg-[#0f766e] flex items-center gap-1 active:scale-95"
                    >
                      <span className="material-symbols-outlined text-[16px]">visibility</span>
                      {item.category === 'medicines' ? 'Review Rx Expiry' : 'Review Details'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Upcoming Reminders List */}
      {(activeFilter === 'all' || activeFilter === 'upcoming') && upcomingItems.length > 0 && (
        <div className="flex flex-col gap-2.5 mt-2">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-bold uppercase tracking-wider text-[#3e4947] dark:text-[#bdc9c6]">
              Upcoming This Month
            </span>
            <span className="text-[11px] text-[#3e4947] dark:text-[#bdc9c6]">
              {upcomingItems.length} Milestones Scheduled
            </span>
          </div>

          {upcomingItems.map(item => {
            const days = getDaysRemaining(item.expiryDate);

            return (
              <div
                key={item.id}
                onClick={() => onOpenItemDetail(item)}
                className="p-3.5 rounded-2xl bg-white dark:bg-[#131b2e] border border-[#eaedff] dark:border-[#283044] shadow-xs flex items-center justify-between gap-3 cursor-pointer hover:border-[#005c55]/40 transition-all"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="relative w-11 h-11 rounded-xl overflow-hidden bg-slate-100 shrink-0">
                    {item.photos[0] ? (
                      <img src={item.photos[0].url} alt={item.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-400">
                        <span className="material-symbols-outlined text-[20px]">notifications</span>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <h3 className="font-bold text-sm text-[#131b2e] dark:text-white truncate">
                      {item.name}
                    </h3>
                    <span className="text-xs text-[#3e4947] dark:text-[#bdc9c6]">
                      Exp: {formatDisplayDate(item.expiryDate)} • {item.subCategory}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-1 shrink-0">
                  <span className="px-2.5 py-0.5 rounded-full bg-[#eaedff] dark:bg-[#283044] text-[#005c55] dark:text-[#6df5e1] text-xs font-bold">
                    {days} days left
                  </span>
                  <span className="text-[10px] text-slate-400">30d Trigger</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Weekly Digest Section */}
      {(activeFilter === 'all' || activeFilter === 'digest') && (
        <div className="p-4 rounded-2xl bg-[#eaedff] dark:bg-[#283044] flex flex-col gap-3 mt-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[#005c55] dark:text-[#6df5e1] text-[20px]">
                mark_email_read
              </span>
              <span className="font-bold text-sm text-[#131b2e] dark:text-white">Weekly ExpiTrack Digest</span>
            </div>
            <span className="px-2 py-0.5 rounded-full bg-[#6df5e1]/40 text-[#006f64] dark:text-[#6df5e1] text-[10px] font-bold">
              {notificationSettings.digestTime}
            </span>
          </div>

          <p className="text-xs text-[#3e4947] dark:text-[#bdc9c6] leading-relaxed">
            Consolidates expiring food, medicine expiration warnings, and warranty deadlines into a tidy summary so your push inbox remains uncluttered.
          </p>

          <div className="flex items-center justify-between pt-1">
            <button
              onClick={handleTestPing}
              className="text-xs font-bold text-[#005c55] dark:text-[#6df5e1] hover:underline flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-[16px]">play_arrow</span>
              Test Notification Ping
            </button>
            <button
              onClick={onOpenNotificationSettings}
              className="px-3 py-1.5 rounded-xl bg-[#005c55] text-white text-xs font-bold shadow-xs hover:bg-[#0f766e]"
            >
              Manage Digest
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
