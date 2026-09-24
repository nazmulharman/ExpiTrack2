import { ExpiryItem, NotificationSettings } from '../types';
import { INITIAL_ITEMS, DEFAULT_NOTIFICATION_SETTINGS } from '../data/initialData';
import { getDaysRemaining } from '../utils/dateUtils';

const ITEMS_STORAGE_KEY = 'expitrack_vault_items_v2';
const SETTINGS_STORAGE_KEY = 'expitrack_notification_settings_v2';
const RECENT_SCANS_KEY = 'expitrack_recent_scans_v2';

export function getStoredItems(): ExpiryItem[] {
  try {
    const raw = localStorage.getItem(ITEMS_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(ITEMS_STORAGE_KEY, JSON.stringify(INITIAL_ITEMS));
      return INITIAL_ITEMS;
    }
    const parsed: ExpiryItem[] = JSON.parse(raw);
    const hasAnyPinnedDefined = parsed.some(i => i.isPinned !== undefined);

    // Merge any missing initial items so newly introduced sample items appear
    const existingIds = new Set(parsed.map(i => i.id));
    const missingInitial = INITIAL_ITEMS.filter(i => !existingIds.has(i.id));
    const combinedList = [...parsed, ...missingInitial];

    // Backfill stock fields and isPinned for items if missing
    return combinedList.map(item => {
      let updatedItem = { ...item };
      if (!hasAnyPinnedDefined) {
        if (item.id === 'item-1' || item.id === 'item-3' || item.id === 'item-5') {
          updatedItem.isPinned = true;
        }
      }
      if (item.category === 'medicines' && item.initialStock === undefined) {
        let defaultStock = 30;
        if (item.quantity) {
          const match = item.quantity.match(/(\d+)/);
          if (match) defaultStock = parseInt(match[1], 10);
        }
        const consumed = item.status === 'expired' ? Math.max(0, defaultStock - 4) : Math.round(defaultStock * 0.35);
        updatedItem = {
          ...updatedItem,
          initialStock: defaultStock,
          consumedUnits: consumed,
          currentStock: Math.max(0, defaultStock - consumed),
          dailyDosage: 2,
          unitType: item.name.toLowerCase().includes('capsule') ? 'capsules' : 'tablets',
          lowStockThreshold: 6,
          stockAlertsEnabled: true,
          stockAlertThresholdDays: 5,
        };
      }
      return updatedItem;
    });
  } catch (e) {
    console.error('Error loading items from localStorage', e);
    return INITIAL_ITEMS;
  }
}

export function saveStoredItems(items: ExpiryItem[]): void {
  try {
    localStorage.setItem(ITEMS_STORAGE_KEY, JSON.stringify(items));
  } catch (e) {
    console.error('Error saving items to localStorage', e);
  }
}

export function getStoredNotificationSettings(): NotificationSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(DEFAULT_NOTIFICATION_SETTINGS));
      return DEFAULT_NOTIFICATION_SETTINGS;
    }
    return { ...DEFAULT_NOTIFICATION_SETTINGS, ...JSON.parse(raw) };
  } catch (e) {
    console.error('Error loading notification settings', e);
    return DEFAULT_NOTIFICATION_SETTINGS;
  }
}

export function saveStoredNotificationSettings(settings: NotificationSettings): void {
  try {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch (e) {
    console.error('Error saving notification settings', e);
  }
}

export function calculateVaultCounts(items: ExpiryItem[]) {
  const activeItems = items.filter(i => i.status === 'active' || i.status === 'expired');
  let critical = 0; // <= 0 days (expired or today)
  let warning = 0;  // 1 to 7 days
  let safe = 0;     // > 7 days
  let expired = 0;  // < 0 days

  activeItems.forEach(item => {
    const days = getDaysRemaining(item.expiryDate);
    if (days < 0) {
      expired++;
      critical++;
    } else if (days === 0) {
      critical++;
    } else if (days <= 7) {
      warning++;
    } else {
      safe++;
    }
  });

  return {
    total: activeItems.length,
    critical,
    warning,
    safe,
    expired,
  };
}

export function exportToCSV(items: ExpiryItem[]): string {
  const headers = ['Vault ID', 'Name', 'Category', 'Subcategory', 'Purchase Date', 'Expiry Date', 'Status', 'Vendor', 'Serial Number', 'Notes'];
  const rows = items.map(item => [
    `"${item.vaultId}"`,
    `"${item.name.replace(/"/g, '""')}"`,
    `"${item.category}"`,
    `"${item.subCategory}"`,
    `"${item.purchaseDate}"`,
    `"${item.expiryDate}"`,
    `"${item.status}"`,
    `"${(item.vendor || '').replace(/"/g, '""')}"`,
    `"${(item.serialNumber || '').replace(/"/g, '""')}"`,
    `"${(item.notes || '').replace(/"/g, '""')}"`,
  ]);

  return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
}

export function downloadFile(content: string, fileName: string, contentType: string) {
  const blob = new Blob([content], { type: contentType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
