import React, { useState } from 'react';
import { NotificationSettings } from '../types';

interface NotificationSettingsViewProps {
  settings: NotificationSettings;
  onSave: (newSettings: NotificationSettings) => void;
  onGoBack: () => void;
  showToast: (msg: string, icon?: string) => void;
}

export const NotificationSettingsView: React.FC<NotificationSettingsViewProps> = ({
  settings,
  onSave,
  onGoBack,
  showToast,
}) => {
  const [current, setCurrent] = useState<NotificationSettings>({ ...settings });

  const handleSave = () => {
    onSave(current);
    showToast('Notification preferences saved', 'check_circle');
    onGoBack();
  };

  const handleTestNotification = () => {
    showToast('🔔 ExpiTrack: Sony WH-1000XM5 warranty ends in 24 days. File claims now!', 'notifications_active');
  };

  return (
    <div className="flex flex-col gap-4 pb-28 pt-2">
      {/* Top Header */}
      <div className="flex items-center justify-between pt-1">
        <div>
          <h1 className="text-xl font-bold text-[#131b2e] dark:text-white">Alert Rules & Cadence</h1>
          <p className="text-xs text-[#3e4947] dark:text-[#bdc9c6]">
            Configure lead times, quiet hours & push protocols
          </p>
        </div>
        <button
          onClick={handleSave}
          className="px-4 py-1.5 rounded-xl bg-[#005c55] text-white text-xs font-bold shadow-xs hover:bg-[#0f766e] active:scale-95 transition-all"
        >
          Save
        </button>
      </div>

      {/* Master Push & Sound */}
      <div className="bg-white dark:bg-[#131b2e] p-4 rounded-2xl shadow-sm border border-[#eaedff] dark:border-[#283044] space-y-3">
        <span className="text-xs font-bold uppercase tracking-wider text-[#005c55] dark:text-[#6df5e1] flex items-center gap-1.5">
          <span className="material-symbols-outlined text-[18px]">toggle_on</span>
          Master Delivery Controls
        </span>

        {/* Master Toggle */}
        <div className="flex items-center justify-between py-1">
          <div className="flex flex-col">
            <span className="text-sm font-bold text-[#131b2e] dark:text-white">Push Notifications</span>
            <span className="text-xs text-[#3e4947] dark:text-[#bdc9c6]">
              Deliver milestone reminders to device lock screen
            </span>
          </div>
          <input
            type="checkbox"
            checked={current.pushEnabled}
            onChange={(e) => setCurrent({ ...current, pushEnabled: e.target.checked })}
            className="w-5 h-5 accent-[#005c55] rounded cursor-pointer"
          />
        </div>

        {/* Critical Override */}
        <div className="flex items-center justify-between py-1 border-t border-[#eaedff] dark:border-[#283044]">
          <div className="flex flex-col">
            <span className="text-sm font-bold text-[#131b2e] dark:text-white">Critical Priority Override</span>
            <span className="text-xs text-[#3e4947] dark:text-[#bdc9c6]">
              Break through Do Not Disturb for safety hazards & expiring medicines
            </span>
          </div>
          <input
            type="checkbox"
            checked={current.criticalOverride}
            onChange={(e) => setCurrent({ ...current, criticalOverride: e.target.checked })}
            className="w-5 h-5 accent-[#005c55] rounded cursor-pointer"
          />
        </div>

        {/* Sound Texture */}
        <div className="flex items-center justify-between py-1 border-t border-[#eaedff] dark:border-[#283044]">
          <div className="flex flex-col">
            <span className="text-sm font-bold text-[#131b2e] dark:text-white">Alert Tone & Texture</span>
            <span className="text-xs text-[#3e4947] dark:text-[#bdc9c6]">Acoustic feedback on dispatch</span>
          </div>
          <select
            value={current.sound}
            onChange={(e) => setCurrent({ ...current, sound: e.target.value as any })}
            className="px-3 py-1.5 rounded-xl bg-[#f2f3ff] dark:bg-[#283044] text-xs font-bold text-[#131b2e] dark:text-white focus:outline-none"
          >
            <option value="chime">🔔 Gentle Chime</option>
            <option value="pulse">⚡ Haptic Pulse</option>
            <option value="subtle">🍃 Subtle Whisper</option>
          </select>
        </div>
      </div>

      {/* Category Alert Staggering */}
      <div className="bg-white dark:bg-[#131b2e] p-4 rounded-2xl shadow-sm border border-[#eaedff] dark:border-[#283044] space-y-3">
        <span className="text-xs font-bold uppercase tracking-wider text-[#005c55] dark:text-[#6df5e1] flex items-center gap-1.5">
          <span className="material-symbols-outlined text-[18px]">tune</span>
          Category Lead Time Milestones
        </span>

        {/* Medicine */}
        <div className="p-3 rounded-xl bg-[#f2f3ff] dark:bg-[#283044] space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-bold text-xs text-[#131b2e] dark:text-white flex items-center gap-1">
              💊 Pharmacy & Medicines
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#ffdad6] text-[#ba1a1a]">
              Safety Critical
            </span>
          </div>
          <p className="text-[11px] text-[#3e4947] dark:text-[#bdc9c6]">
            Checkpoints: 30 days, 14 days, 7 days, 3 days, Day of expiry
          </p>
          <label className="flex items-center gap-2 pt-1 text-xs text-[#131b2e] dark:text-white cursor-pointer">
            <input
              type="checkbox"
              checked={current.medicineReqAck}
              onChange={(e) => setCurrent({ ...current, medicineReqAck: e.target.checked })}
              className="accent-[#005c55] rounded"
            />
            <span>Require explicit acknowledgment to dismiss</span>
          </label>

          {/* Medicine Stockout Alert Setting */}
          <div className="pt-2 border-t border-[#eaedff] dark:border-[#384259] space-y-1.5">
            <label className="flex items-center justify-between text-xs text-[#131b2e] dark:text-white cursor-pointer">
              <span className="font-bold flex items-center gap-1">
                <span className="material-symbols-outlined text-[15px] text-[#005c55] dark:text-[#6df5e1]">notification_important</span>
                Pre-Stockout Alerts (Before stock runs out)
              </span>
              <input
                type="checkbox"
                checked={current.medicineStockAlerts ?? true}
                onChange={(e) => setCurrent({ ...current, medicineStockAlerts: e.target.checked })}
                className="accent-[#005c55] rounded"
              />
            </label>
            <p className="text-[11px] text-[#3e4947] dark:text-[#bdc9c6]">
              Calculates depletion using daily tablet consumption and notifies before stockout.
            </p>
            {(current.medicineStockAlerts ?? true) && (
              <div className="flex items-center justify-between pt-1">
                <span className="text-[11px] text-slate-500 font-medium">Alert lead time:</span>
                <div className="flex items-center gap-1">
                  {[3, 5, 7].map((days) => (
                    <button
                      key={days}
                      type="button"
                      onClick={() => setCurrent({ ...current, medicineStockAlertDays: days })}
                      className={`px-2 py-0.5 rounded-lg text-xs font-bold transition-all ${
                        (current.medicineStockAlertDays ?? 5) === days
                          ? 'bg-[#005c55] text-white shadow-xs'
                          : 'bg-white dark:bg-[#131b2e] text-[#131b2e] dark:text-white'
                      }`}
                    >
                      {days} Days Before
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Warranties */}
        <div className="p-3 rounded-xl bg-[#f2f3ff] dark:bg-[#283044] space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-bold text-xs text-[#131b2e] dark:text-white flex items-center gap-1">
              ⚡ Warranties & Electronics
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#eaedff] dark:bg-[#131b2e] text-[#005c55] dark:text-[#6df5e1]">
              Financial Recovery
            </span>
          </div>
          <p className="text-[11px] text-[#3e4947] dark:text-[#bdc9c6]">
            Checkpoints: 60 days, 30 days, 7 days before coverage ends
          </p>
          <label className="flex items-center gap-2 pt-1 text-xs text-[#131b2e] dark:text-white cursor-pointer">
            <input
              type="checkbox"
              checked={current.warrantyAutoReceipt}
              onChange={(e) => setCurrent({ ...current, warrantyAutoReceipt: e.target.checked })}
              className="accent-[#005c55] rounded"
            />
            <span>Auto-prompt for invoice PDF download before deadline</span>
          </label>
        </div>

        {/* Groceries */}
        <div className="p-3 rounded-xl bg-[#f2f3ff] dark:bg-[#283044] space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-bold text-xs text-[#131b2e] dark:text-white flex items-center gap-1">
              🥑 Fresh Groceries & Pantry
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#6df5e1]/40 text-[#006f64] dark:text-[#6df5e1]">
              Zero Waste
            </span>
          </div>
          <p className="text-[11px] text-[#3e4947] dark:text-[#bdc9c6]">
            Checkpoints: 5 days, 3 days, 1 day before best-by date
          </p>
          <label className="flex items-center gap-2 pt-1 text-xs text-[#131b2e] dark:text-white cursor-pointer">
            <input
              type="checkbox"
              checked={current.groceryRecipes}
              onChange={(e) => setCurrent({ ...current, groceryRecipes: e.target.checked })}
              className="accent-[#005c55] rounded"
            />
            <span>Suggest pantry recipes to use items before expiration</span>
          </label>

          {/* Grocery Pre-Stockout Alert Setting */}
          <div className="pt-2 border-t border-[#eaedff] dark:border-[#384259] space-y-1.5">
            <label className="flex items-center justify-between text-xs text-[#131b2e] dark:text-white cursor-pointer">
              <span className="font-bold flex items-center gap-1">
                <span className="material-symbols-outlined text-[15px] text-[#005c55] dark:text-[#6df5e1]">
                  shopping_cart_checkout
                </span>
                Pre-Stockout Alerts (Notify before pantry runs out)
              </span>
              <input
                type="checkbox"
                checked={current.groceryStockAlerts ?? true}
                onChange={(e) => setCurrent({ ...current, groceryStockAlerts: e.target.checked })}
                className="accent-[#005c55] rounded"
              />
            </label>
            <p className="text-[11px] text-[#3e4947] dark:text-[#bdc9c6]">
              Calculates daily depletion based on units (pieces, packs, kg, ml) and warns you before you run out.
            </p>
            {(current.groceryStockAlerts ?? true) && (
              <div className="flex items-center justify-between pt-1">
                <span className="text-[11px] text-slate-500 font-medium">Alert lead time:</span>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 5].map((days) => (
                    <button
                      key={days}
                      type="button"
                      onClick={() => setCurrent({ ...current, groceryStockAlertDays: days })}
                      className={`px-2 py-0.5 rounded-lg text-xs font-bold transition-all ${
                        (current.groceryStockAlertDays ?? 2) === days
                          ? 'bg-[#005c55] text-white shadow-xs'
                          : 'bg-white dark:bg-[#131b2e] text-[#131b2e] dark:text-white'
                      }`}
                    >
                      {days}d Before
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Zero-Waste Spoilage Warning Alert */}
          <div className="pt-2 border-t border-[#eaedff] dark:border-[#384259] space-y-1">
            <label className="flex items-center justify-between text-xs text-[#131b2e] dark:text-white cursor-pointer">
              <span className="font-bold flex items-center gap-1">
                <span className="material-symbols-outlined text-[15px] text-[#c2410c]">
                  warning
                </span>
                Zero-Waste Spoilage Risk Alerts
              </span>
              <input
                type="checkbox"
                checked={current.groceryZeroWasteAlerts ?? true}
                onChange={(e) => setCurrent({ ...current, groceryZeroWasteAlerts: e.target.checked })}
                className="accent-[#005c55] rounded"
              />
            </label>
            <p className="text-[11px] text-[#3e4947] dark:text-[#bdc9c6]">
              Alerts if an item will reach its best-by date before you can finish it at your current daily consumption rate.
            </p>
          </div>
        </div>
      </div>

      {/* Snooze & Quiet Hours */}
      <div className="bg-white dark:bg-[#131b2e] p-4 rounded-2xl shadow-sm border border-[#eaedff] dark:border-[#283044] space-y-3">
        <span className="text-xs font-bold uppercase tracking-wider text-[#005c55] dark:text-[#6df5e1] flex items-center gap-1.5">
          <span className="material-symbols-outlined text-[18px]">bedtime</span>
          Snooze & Quiet Hours
        </span>

        {/* Default Snooze Span */}
        <div className="flex items-center justify-between py-1">
          <div className="flex flex-col">
            <span className="text-sm font-bold text-[#131b2e] dark:text-white">Default Snooze Span</span>
            <span className="text-xs text-[#3e4947] dark:text-[#bdc9c6]">When hitting snooze on alert</span>
          </div>
          <div className="flex items-center gap-1">
            {['12h', '24h', '3d', '1w'].map(span => (
              <button
                key={span}
                type="button"
                onClick={() => setCurrent({ ...current, snoozeSpan: span })}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                  current.snoozeSpan === span
                    ? 'bg-[#005c55] text-white shadow-xs'
                    : 'bg-[#f2f3ff] dark:bg-[#283044] text-[#3e4947] dark:text-[#bdc9c6]'
                }`}
              >
                {span}
              </button>
            ))}
          </div>
        </div>

        {/* Quiet Hours */}
        <div className="flex items-center justify-between py-1 border-t border-[#eaedff] dark:border-[#283044]">
          <div className="flex flex-col">
            <span className="text-sm font-bold text-[#131b2e] dark:text-white">Nighttime Quiet Hours</span>
            <span className="text-xs text-[#3e4947] dark:text-[#bdc9c6]">
              Silence non-critical alerts between 10:00 PM and 07:30 AM
            </span>
          </div>
          <input
            type="checkbox"
            checked={current.quietHoursActive}
            onChange={(e) => setCurrent({ ...current, quietHoursActive: e.target.checked })}
            className="w-5 h-5 accent-[#005c55] rounded cursor-pointer"
          />
        </div>
      </div>

      {/* Action Buttons */}
      <div className="space-y-2 pt-1">
        <button
          onClick={handleTestNotification}
          className="w-full py-3 rounded-xl bg-white dark:bg-[#131b2e] border border-[#eaedff] dark:border-[#283044] text-xs font-bold text-[#005c55] dark:text-[#6df5e1] hover:bg-slate-50 flex items-center justify-center gap-2 shadow-xs transition-colors"
        >
          <span className="material-symbols-outlined text-[18px]">ring_volume</span>
          <span>Send Test Notification Ping</span>
        </button>

        <button
          onClick={handleSave}
          className="w-full py-3.5 rounded-2xl bg-[#005c55] hover:bg-[#0f766e] text-white font-bold text-sm shadow-md active:scale-95 transition-all"
        >
          Save All Preferences
        </button>
      </div>
    </div>
  );
};
