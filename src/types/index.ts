export type ItemCategory = 'groceries' | 'medicines' | 'warranty' | 'documents';

export type ItemStatus = 'active' | 'expired' | 'used' | 'archived';

export interface ItemPhoto {
  id: string;
  url: string;
  title: string;
  type: 'receipt' | 'warranty' | 'barcode' | 'label' | 'product';
  dateAdded: string;
}

export interface ExpiryItem {
  id: string;
  vaultId: string;
  name: string;
  category: ItemCategory;
  subCategory: string;
  purchaseDate: string; // YYYY-MM-DD
  expiryDate: string; // YYYY-MM-DD
  quantity?: string;
  storageLocation?: string;
  vendor?: string;
  serialNumber?: string;
  protectionScope?: string;
  notes?: string;
  status: ItemStatus;
  photos: ItemPhoto[];
  reminderSettings: {
    daysBefore: number[];
    notifyOnDay: boolean;
  };
  claimedAmount?: number;
  isFavorite?: boolean;
  isPinned?: boolean;
  resolvedDate?: string;
  resolutionType?: 'claimed' | 'consumed' | 'disposed' | 'concluded';
  batchNumber?: string;
  cloudSynced?: boolean;
  tag?: string;

  // Medicine Stock & Daily Dosage tracking
  initialStock?: number; // Total tablets/units in package
  consumedUnits?: number; // Tablets/units consumed
  currentStock?: number; // Available tablets/units left
  remainingStock?: number; // Remaining stock available (tablets/units)
  dailyDosage?: number; // Daily tablets/units consumed rate
  unitType?: string; // e.g. 'tablets', 'capsules', 'pills', 'ml'
  lowStockThreshold?: number; // Alert when available <= this amount
  stockAlertsEnabled?: boolean; // Notify before stock out
  stockAlertThresholdDays?: number; // Days of supply remaining before stockout alert
  lastDoseDate?: string; // YYYY-MM-DD

  // Scheduled Consuming Times & Amounts (alarms & automatic stock deductions)
  consumptionSchedules?: ConsumptionSchedule[];
  consumptionHistory?: ConsumptionLog[];
}

export interface ConsumptionSchedule {
  id: string;
  time: string; // "HH:MM" 24h e.g. "08:00", "13:30", "20:00"
  amount: number; // e.g. 1 tablet, 2 capsules, 150ml
  label: string; // e.g. "Morning Dose", "After Lunch", "Bedtime", "Daily Snack"
  enabled: boolean;
  lastConfirmedDate?: string; // YYYY-MM-DD
  lastConfirmedTime?: string; // "HH:MM"
}

export interface ConsumptionLog {
  id: string;
  timestamp: string; // ISO string
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  amount: number;
  unit: string;
  scheduleLabel?: string;
  remainingAfter: number;
}

export type ActiveTab = 'dashboard' | 'archive' | 'scan' | 'alerts' | 'vault';

export type ActiveView = 
  | 'tab'
  | 'item-detail'
  | 'add-item'
  | 'edit-item'
  | 'notification-settings'
  | 'settings'
  | 'dossier';

export interface NotificationSettings {
  pushEnabled: boolean;
  criticalOverride: boolean;
  weeklyDigest: boolean;
  digestTime: string;
  sound: 'chime' | 'pulse' | 'subtle';
  medicineCheckpoints: number[];
  medicineReqAck: boolean;
  medicineStockAlerts: boolean; // Pre-stockout alert enabled
  medicineStockAlertDays: number; // Days before stockout to notify
  warrantyCheckpoints: number[];
  warrantyAutoReceipt: boolean;
  groceryCheckpoints: number[];
  groceryRecipes: boolean;
  groceryStockAlerts?: boolean; // Pre-stockout alert enabled for groceries
  groceryStockAlertDays?: number; // Days before stockout to notify for groceries
  groceryZeroWasteAlerts?: boolean; // Alert if grocery will expire before consumed
  stickyBanner: boolean;
  snoozeSpan: string;
  quietHoursActive: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;
}

export interface OCRResult {
  productName: string;
  expiryDate: string;
  category: ItemCategory;
  subCategory: string;
  storageLocation: string;
  vendor?: string;
  serialNumber?: string;
  batchNumber?: string;
  notes?: string;
  confidence: number;
  detectedElements: string[];
}

export interface UserProfile {
  name: string;
  email: string;
  avatarUrl: string;
  vaultName: string;
  plan: string;
  isGoogleLinked: boolean;
  googleUid?: string;
  lastDriveBackup?: string; // ISO string
}
