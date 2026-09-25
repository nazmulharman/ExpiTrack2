import { ExpiryItem, NotificationSettings } from '../types';

export const INITIAL_ITEMS: ExpiryItem[] = [];

export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  pushEnabled: true,
  criticalOverride: true,
  weeklyDigest: true,
  digestTime: 'Sundays at 9:00 AM',
  sound: 'chime',
  medicineCheckpoints: [30, 14, 7, 3, 0],
  medicineReqAck: true,
  medicineStockAlerts: true,
  medicineStockAlertDays: 5,
  warrantyCheckpoints: [60, 30, 7],
  warrantyAutoReceipt: true,
  groceryCheckpoints: [5, 3, 1],
  groceryRecipes: true,
  groceryStockAlerts: true,
  groceryStockAlertDays: 2,
  groceryZeroWasteAlerts: true,
  stickyBanner: true,
  snoozeSpan: '24h',
  quietHoursActive: true,
  quietHoursStart: '10:00 PM',
  quietHoursEnd: '07:30 AM',
};
