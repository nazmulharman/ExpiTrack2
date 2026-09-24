import { ExpiryItem, ConsumptionSchedule } from '../types';
import { sounds } from '../utils/soundUtils';
import { formatScheduleTime, getMedicineStockStats } from '../utils/medicineUtils';

class NotificationService {
  private permission: NotificationPermission = 'default';
  private snoozedUntil: Map<string, number> = new Map(); // key: `${itemId}-${scheduleId}` -> timestamp
  private notifiedToday: Set<string> = new Set(); // key: `${itemId}-${scheduleId}-${dateStr}`

  constructor() {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      this.permission = Notification.permission;
    }
  }

  async requestPermission(): Promise<boolean> {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return false;
    }
    try {
      const perm = await Notification.requestPermission();
      this.permission = perm;
      return perm === 'granted';
    } catch {
      return false;
    }
  }

  isPermissionGranted(): boolean {
    return this.permission === 'granted';
  }

  snoozeSchedule(itemId: string, scheduleId: string, minutes: number = 10) {
    const key = `${itemId}-${scheduleId}`;
    const unpauseAt = Date.now() + minutes * 60 * 1000;
    this.snoozedUntil.set(key, unpauseAt);
  }

  /**
   * Fires a real or test intake notification and triggers sound
   */
  triggerIntakeAlert(
    item: ExpiryItem,
    schedule?: ConsumptionSchedule,
    isTest: boolean = false
  ) {
    const stats = getMedicineStockStats(item);
    const amount = schedule ? schedule.amount : stats.dailyDosage;
    const timeFormatted = schedule ? formatScheduleTime(schedule.time) : 'Now';
    const label = schedule?.label || (item.category === 'groceries' ? 'Scheduled Serving' : 'Daily Medication Dose');

    // 1. Play sound chime
    sounds.playNotificationChime();

    // 2. System Browser Notification if supported & permitted
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      try {
        const title = isTest
          ? `🔔 [TEST] Time for ${item.name}`
          : `⏰ Intake Reminder: ${item.name}`;
        const body = `Scheduled: ${amount} ${stats.unit} (${label} • ${timeFormatted}). Available: ${stats.available} ${stats.unit}. Click to confirm intake!`;

        const notification = new Notification(title, {
          body,
          icon: '/favicon.ico',
          tag: `consumption-${item.id}-${schedule?.id || 'manual'}`,
        });

        notification.onclick = () => {
          window.focus();
          notification.close();
        };
      } catch (e) {
        console.warn('Web notification dispatch failed', e);
      }
    }
  }

  /**
   * Evaluates if any scheduled alarms are due right now
   */
  checkDueSchedules(
    items: ExpiryItem[],
    onTriggerPrompt: (item: ExpiryItem, schedule: ConsumptionSchedule) => void
  ) {
    const now = new Date();
    const currentHours = String(now.getHours()).padStart(2, '0');
    const currentMinutes = String(now.getMinutes()).padStart(2, '0');
    const currentTimeStr = `${currentHours}:${currentMinutes}`;
    const todayStr = now.toISOString().split('T')[0];

    for (const item of items) {
      if (item.status !== 'active') continue;
      if (!item.consumptionSchedules || item.consumptionSchedules.length === 0) continue;

      for (const sch of item.consumptionSchedules) {
        if (!sch.enabled) continue;

        // Has it already been confirmed today?
        if (sch.lastConfirmedDate === todayStr) continue;

        const scheduleKey = `${item.id}-${sch.id}`;
        const todayNotifiedKey = `${scheduleKey}-${todayStr}`;

        // Is it currently snoozed?
        const snoozeEnd = this.snoozedUntil.get(scheduleKey);
        if (snoozeEnd && Date.now() < snoozeEnd) continue;

        // Is time matching current minute?
        if (sch.time === currentTimeStr && !this.notifiedToday.has(todayNotifiedKey)) {
          this.notifiedToday.add(todayNotifiedKey);
          this.triggerIntakeAlert(item, sch, false);
          onTriggerPrompt(item, sch);
        }
      }
    }
  }
}

export const notificationService = new NotificationService();
