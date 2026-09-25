import { ExpiryItem, NotificationSettings } from '../types';
import { INITIAL_ITEMS, DEFAULT_NOTIFICATION_SETTINGS } from '../data/initialData';
import { getDaysRemaining } from '../utils/dateUtils';

const ITEMS_STORAGE_KEY = 'expitrack_vault_items_v5';
const SETTINGS_STORAGE_KEY = 'expitrack_notification_settings_v2';
const RECENT_SCANS_KEY = 'expitrack_recent_scans_v2';

export function getStoredItems(): ExpiryItem[] {
  try {
    // Purge legacy storage versions so no stale demo data persists
    if (localStorage.getItem('expitrack_vault_items_v2')) {
      localStorage.removeItem('expitrack_vault_items_v2');
    }
    if (localStorage.getItem('expitrack_recent_scans_v2')) {
      localStorage.removeItem('expitrack_recent_scans_v2');
    }

    const raw = localStorage.getItem(ITEMS_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(ITEMS_STORAGE_KEY, JSON.stringify([]));
      return [];
    }
    const parsed: ExpiryItem[] = JSON.parse(raw);
    return parsed;
  } catch (e) {
    console.error('Error loading items from localStorage', e);
    return [];
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
