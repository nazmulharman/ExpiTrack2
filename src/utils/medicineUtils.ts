import { ExpiryItem } from '../types';
import { getDaysRemaining } from './dateUtils';

/**
 * Formats a quantity or dosage cleanly:
 * Strips floating-point noise and shows fractions like 0.5, 2.75, 1.5, or integer 12.
 */
export function formatQuantity(val: number | undefined | null): string {
  if (val === undefined || val === null || isNaN(val)) return '0';
  const rounded = Math.round(val * 1000) / 1000;
  return Number(rounded.toFixed(3)).toString();
}

/**
 * Parses fractional quantity input string or number (e.g. ".5", "2.75", "1.5")
 */
export function parseFractionQuantity(val: string | number, fallback: number = 0): number {
  if (typeof val === 'number') return isNaN(val) ? fallback : Math.round(val * 1000) / 1000;
  if (!val) return fallback;
  const cleaned = val.trim();
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? fallback : Math.round(parsed * 1000) / 1000;
}

export interface MedicineStockStats {
  hasTracking: boolean;
  totalStock: number;
  consumed: number;
  available: number;
  unit: string;
  dailyDosage: number;
  daysOfSupplyLeft: number;
  stockoutDate: string | null;
  formattedStockoutDate: string;
  isStockedOut: boolean;
  isLowStock: boolean;
  consumedPercent: number;
  availablePercent: number;
  daysUntilExpiry: number;
  expiresBeforeStockout: boolean;
  stocksOutBeforeExpiry: boolean;
  daysDifference: number;
  wasteRiskUnits: number;
  timelineComparisonText: string;
  statusBadge: {
    label: string;
    badgeClass: string;
    icon: string;
    isCritical: boolean;
  };
}

// Convenient alias for general inventory/stock tracking
export type ItemStockStats = MedicineStockStats;

/**
 * Extracts and calculates comprehensive stock, consumed, available, stockout,
 * and dual expiration prediction metrics for medicines, groceries, and tracked goods.
 * Supports fractions like .5 kg, 2.75 ml, 1.5 ltr.
 */
export function getMedicineStockStats(item: ExpiryItem): MedicineStockStats {
  const isMedicineCategory = item.category === 'medicines';
  const isGroceryCategory = item.category === 'groceries';
  const hasExplicitStock =
    item.initialStock !== undefined ||
    item.currentStock !== undefined ||
    item.remainingStock !== undefined ||
    item.dailyDosage !== undefined;

  // If neither medicine nor grocery nor stock fields exist, return neutral stats
  if (!isMedicineCategory && !isGroceryCategory && !hasExplicitStock) {
    return {
      hasTracking: false,
      totalStock: 0,
      consumed: 0,
      available: 0,
      unit: 'units',
      dailyDosage: 1,
      daysOfSupplyLeft: Infinity,
      stockoutDate: null,
      formattedStockoutDate: 'N/A',
      isStockedOut: false,
      isLowStock: false,
      consumedPercent: 0,
      availablePercent: 0,
      daysUntilExpiry: 999,
      expiresBeforeStockout: false,
      stocksOutBeforeExpiry: false,
      daysDifference: 0,
      wasteRiskUnits: 0,
      timelineComparisonText: 'No stock data',
      statusBadge: {
        label: 'No stock data',
        badgeClass: 'bg-slate-100 text-slate-600',
        icon: 'info',
        isCritical: false,
      },
    };
  }

  // Parse total stock supporting fractional quantities (e.g. ".5 kg", "2.75 ml", "1.5 ltr")
  let totalStock = item.initialStock !== undefined ? Math.round(item.initialStock * 1000) / 1000 : 0;
  if (totalStock === 0 && item.quantity) {
    const match = item.quantity.match(/(\d*\.?\d+)/);
    if (match) {
      const parsed = parseFloat(match[1]);
      if (!isNaN(parsed) && parsed > 0) {
        totalStock = Math.round(parsed * 1000) / 1000;
      }
    }
  }
  if (totalStock === 0) {
    totalStock = isMedicineCategory ? 30 : 10; // sensible default pack size
  }

  const consumed = Math.max(0, item.consumedUnits !== undefined ? Math.round(item.consumedUnits * 1000) / 1000 : 0);
  const available = item.remainingStock !== undefined
    ? Math.max(0, Math.round(item.remainingStock * 1000) / 1000)
    : item.currentStock !== undefined
    ? Math.max(0, Math.round(item.currentStock * 1000) / 1000)
    : Math.max(0, Math.round((totalStock - consumed) * 1000) / 1000);

  // Determine standard unit
  let unit = item.unitType;
  if (!unit && item.quantity) {
    const qLower = item.quantity.toLowerCase().trim();
    if (qLower.includes('kg') || qLower.includes('kilo')) unit = 'kg';
    else if (qLower.includes('ml')) unit = 'ml';
    else if (qLower.includes('ltr') || qLower.includes('liter') || qLower.includes('litre')) unit = 'ltr';
    else if (qLower.includes('mg')) unit = 'mg';
    else if (qLower.includes('g') && !qLower.includes('egg')) unit = 'g';
    else if (qLower.includes('oz')) unit = 'oz';
    else if (qLower.includes('lbs') || qLower.includes('lb')) unit = 'lbs';
  }

  if (!unit) {
    const lowerName = item.name.toLowerCase();
    if (isGroceryCategory) {
      if (lowerName.includes('egg')) unit = 'eggs';
      else if (lowerName.includes('milk') || lowerName.includes('juice') || lowerName.includes('oil')) unit = 'ltr';
      else if (lowerName.includes('yogurt') || lowerName.includes('cup')) unit = 'cups';
      else if (lowerName.includes('bread') || lowerName.includes('toast')) unit = 'slices';
      else if (lowerName.includes('apple') || lowerName.includes('banana') || lowerName.includes('fruit')) unit = 'pieces';
      else if (lowerName.includes('can') || lowerName.includes('soda') || lowerName.includes('tuna')) unit = 'cans';
      else if (lowerName.includes('bottle')) unit = 'bottles';
      else unit = 'units';
    } else {
      unit = lowerName.includes('capsule') ? 'capsules' : 'tablets';
    }
  }

  const rawDaily = item.dailyDosage ?? (isGroceryCategory ? 1 : 2);
  const dailyDosage = Math.max(0.01, Math.round(rawDaily * 1000) / 1000);
  const thresholdDays = item.stockAlertThresholdDays ?? (isGroceryCategory ? 2 : 5);
  const lowStockThreshold = item.lowStockThreshold ?? (dailyDosage * 2);

  const daysOfSupplyLeft = dailyDosage > 0 ? Math.ceil(available / dailyDosage) : 999;
  const daysUntilExpiry = getDaysRemaining(item.expiryDate);

  // Calculate predicted stockout date
  let stockoutDate: string | null = null;
  let formattedStockoutDate = 'N/A';

  if (available > 0 && dailyDosage > 0) {
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + daysOfSupplyLeft);
    stockoutDate = targetDate.toISOString().split('T')[0];
    formattedStockoutDate = targetDate.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } else if (available === 0) {
    formattedStockoutDate = 'Out of Stock';
  }

  const isStockedOut = available <= 0;
  const isLowStock = !isStockedOut && (available <= lowStockThreshold || daysOfSupplyLeft <= thresholdDays);

  const consumedPercent = totalStock > 0 ? Math.min(100, Math.round((consumed / totalStock) * 100)) : 0;
  const availablePercent = Math.max(0, 100 - consumedPercent);

  // Dual comparison: Expiry Date vs Stockout Date
  const expiresBeforeStockout = available > 0 && daysUntilExpiry < daysOfSupplyLeft;
  const stocksOutBeforeExpiry = available > 0 && daysOfSupplyLeft <= daysUntilExpiry;
  const daysDifference = Math.abs(daysOfSupplyLeft - daysUntilExpiry);

  // How many units will expire before consumed at current daily rate?
  const consumableUnitsBeforeExpiry = Math.max(0, daysUntilExpiry * dailyDosage);
  const wasteRiskUnits = expiresBeforeStockout ? Math.max(0, Math.round((available - consumableUnitsBeforeExpiry) * 1000) / 1000) : 0;

  let timelineComparisonText = '';
  if (isStockedOut) {
    timelineComparisonText = 'Completely consumed / out of stock.';
  } else if (expiresBeforeStockout) {
    timelineComparisonText = `⚠️ Spoilage alert: ${formatQuantity(wasteRiskUnits)} ${unit} will expire in ${daysUntilExpiry}d before you can finish at ${formatQuantity(dailyDosage)} ${unit}/day!`;
  } else if (stocksOutBeforeExpiry) {
    timelineComparisonText = `Zero-waste safe: Stock finishes in ${daysOfSupplyLeft}d, well before expiration (${daysDifference}d buffer).`;
  } else {
    timelineComparisonText = `Supply duration matches shelf life (${daysOfSupplyLeft} days).`;
  }

  // Status Badge with formatted decimal support
  let statusBadge = {
    label: `${formatQuantity(available)} ${unit} left (${daysOfSupplyLeft}d supply)`,
    badgeClass: 'bg-[#6df5e1]/40 text-[#006f64] border border-[#6df5e1]/60',
    icon: 'check_circle',
    isCritical: false,
  };

  if (isStockedOut) {
    statusBadge = {
      label: `Out of Stock (0 ${unit})`,
      badgeClass: 'bg-[#ffdad6] text-[#ba1a1a] border border-[#ffb4ab] font-bold animate-pulse',
      icon: 'error',
      isCritical: true,
    };
  } else if (expiresBeforeStockout && daysUntilExpiry <= 5) {
    statusBadge = {
      label: `Expiring before stockout (${daysUntilExpiry}d left)`,
      badgeClass: 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-300 font-bold',
      icon: 'running_with_errors',
      isCritical: true,
    };
  } else if (isLowStock) {
    statusBadge = {
      label: `Low Stock: ${daysOfSupplyLeft}d left (${formatQuantity(available)} ${unit})`,
      badgeClass: 'bg-[#ffedd5] text-[#c2410c] border border-[#fed7aa] font-bold',
      icon: 'warning',
      isCritical: true,
    };
  }

  return {
    hasTracking: true,
    totalStock,
    consumed,
    available,
    unit,
    dailyDosage,
    daysOfSupplyLeft,
    stockoutDate,
    formattedStockoutDate,
    isStockedOut,
    isLowStock,
    consumedPercent,
    availablePercent,
    daysUntilExpiry,
    expiresBeforeStockout,
    stocksOutBeforeExpiry,
    daysDifference,
    wasteRiskUnits,
    timelineComparisonText,
    statusBadge,
  };
}

export const getStockStats = getMedicineStockStats;

/**
 * Formats 24h time "14:30" to readable "2:30 PM"
 */
export function formatScheduleTime(time24: string): string {
  if (!time24) return '';
  const parts = time24.split(':');
  if (parts.length < 2) return time24;
  let hours = parseInt(parts[0], 10);
  const minutes = parts[1].padStart(2, '0');
  if (isNaN(hours)) return time24;
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12; // 0 becomes 12
  return `${hours}:${minutes} ${ampm}`;
}

/**
 * Performs a dose/serving consumption (decrementing available stock, updating consumedUnits,
 * updating schedule confirmation if applicable, and saving to consumption history).
 * Accurately supports fractions like .5, 2.75, 1.5.
 */
export function recordDoseConsumption(
  item: ExpiryItem,
  amount?: number,
  scheduleId?: string,
  scheduleLabel?: string
): ExpiryItem {
  const stats = getMedicineStockStats(item);
  const rawDose = amount !== undefined ? amount : stats.dailyDosage;
  const dose = Math.max(0.001, Math.round(rawDose * 1000) / 1000);
  const newConsumed = Math.min(stats.totalStock, Math.round((stats.consumed + dose) * 1000) / 1000);
  const newAvailable = Math.max(0, Math.round((stats.totalStock - newConsumed) * 1000) / 1000);
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  // Update schedule status if this consumption was linked to a specific schedule
  let updatedSchedules = item.consumptionSchedules ? [...item.consumptionSchedules] : [];
  if (scheduleId && updatedSchedules.length > 0) {
    updatedSchedules = updatedSchedules.map((sch) => {
      if (sch.id === scheduleId) {
        return {
          ...sch,
          lastConfirmedDate: todayStr,
          lastConfirmedTime: timeStr,
        };
      }
      return sch;
    });
  }

  // Create new consumption history record
  const newLogRecord = {
    id: `clog-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    timestamp: now.toISOString(),
    date: todayStr,
    time: timeStr,
    amount: dose,
    unit: stats.unit,
    scheduleLabel: scheduleLabel || (scheduleId ? 'Scheduled Intake' : 'Manual Intake'),
    remainingAfter: newAvailable,
  };

  const history = [newLogRecord, ...(item.consumptionHistory || [])].slice(0, 50); // keep last 50 entries

  return {
    ...item,
    initialStock: stats.totalStock,
    consumedUnits: newConsumed,
    currentStock: newAvailable,
    remainingStock: newAvailable,
    dailyDosage: stats.dailyDosage,
    unitType: stats.unit,
    lastDoseDate: todayStr,
    consumptionSchedules: updatedSchedules.length > 0 ? updatedSchedules : item.consumptionSchedules,
    consumptionHistory: history,
  };
}

export const recordItemConsumption = recordDoseConsumption;

/**
 * Adds a new consumption time & amount schedule to an item (supporting fractional amounts)
 */
export function addConsumptionSchedule(
  item: ExpiryItem,
  schedule: { time: string; amount: number; label: string; enabled?: boolean }
): ExpiryItem {
  const cleanAmount = Math.max(0.01, Math.round(schedule.amount * 1000) / 1000);
  const newSchedule = {
    id: `sch-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    time: schedule.time,
    amount: cleanAmount,
    label: schedule.label || 'Scheduled Dose',
    enabled: schedule.enabled !== false,
  };

  const currentSchedules = item.consumptionSchedules || [];
  const updatedSchedules = [...currentSchedules, newSchedule].sort((a, b) =>
    a.time.localeCompare(b.time)
  );

  // If dailyDosage isn't explicitly set high enough, calculate total daily dosage from enabled schedules
  const totalDailyFromSchedules = updatedSchedules
    .filter((s) => s.enabled)
    .reduce((sum, s) => sum + s.amount, 0);

  return {
    ...item,
    consumptionSchedules: updatedSchedules,
    dailyDosage: totalDailyFromSchedules > 0 ? Math.round(totalDailyFromSchedules * 1000) / 1000 : item.dailyDosage,
  };
}

/**
 * Updates an existing consumption schedule
 */
export function updateConsumptionSchedule(
  item: ExpiryItem,
  scheduleId: string,
  updatedFields: Partial<{ time: string; amount: number; label: string; enabled: boolean }>
): ExpiryItem {
  const currentSchedules = item.consumptionSchedules || [];
  const updatedSchedules = currentSchedules.map((sch) => {
    if (sch.id === scheduleId) {
      const merged = { ...sch, ...updatedFields };
      if (merged.amount !== undefined) {
        merged.amount = Math.max(0.01, Math.round(merged.amount * 1000) / 1000);
      }
      return merged;
    }
    return sch;
  }).sort((a, b) => a.time.localeCompare(b.time));

  const totalDailyFromSchedules = updatedSchedules
    .filter((s) => s.enabled)
    .reduce((sum, s) => sum + s.amount, 0);

  return {
    ...item,
    consumptionSchedules: updatedSchedules,
    dailyDosage: totalDailyFromSchedules > 0 ? Math.round(totalDailyFromSchedules * 1000) / 1000 : item.dailyDosage,
  };
}

/**
 * Deletes a consumption schedule from an item
 */
export function deleteConsumptionSchedule(
  item: ExpiryItem,
  scheduleId: string
): ExpiryItem {
  const currentSchedules = item.consumptionSchedules || [];
  const updatedSchedules = currentSchedules.filter((sch) => sch.id !== scheduleId);

  const totalDailyFromSchedules = updatedSchedules
    .filter((s) => s.enabled)
    .reduce((sum, s) => sum + s.amount, 0);

  return {
    ...item,
    consumptionSchedules: updatedSchedules,
    dailyDosage: totalDailyFromSchedules > 0 ? Math.round(totalDailyFromSchedules * 1000) / 1000 : (item.dailyDosage ?? 1),
  };
}

/**
 * Toggles a consumption schedule on or off
 */
export function toggleConsumptionSchedule(
  item: ExpiryItem,
  scheduleId: string,
  enabled: boolean
): ExpiryItem {
  return updateConsumptionSchedule(item, scheduleId, { enabled });
}

/**
 * Adds refill/restock units to the total and available stock (supporting fractions)
 */
export function refillMedicineStock(
  item: ExpiryItem,
  additionalUnits: number
): ExpiryItem {
  const stats = getMedicineStockStats(item);
  const cleanAdd = Math.max(0, Math.round(additionalUnits * 1000) / 1000);
  const newTotal = Math.round((stats.totalStock + cleanAdd) * 1000) / 1000;
  const newAvailable = Math.round((stats.available + cleanAdd) * 1000) / 1000;

  return {
    ...item,
    initialStock: newTotal,
    consumedUnits: stats.consumed,
    currentStock: newAvailable,
    remainingStock: newAvailable,
    dailyDosage: stats.dailyDosage,
    unitType: stats.unit,
  };
}

export const refillItemStock = refillMedicineStock;

/**
 * Updates the daily consumption rate (supporting fractions like .5, 2.75, 1.5)
 */
export function updateMedicineDosage(
  item: ExpiryItem,
  dailyDosage: number
): ExpiryItem {
  return {
    ...item,
    dailyDosage: Math.max(0.01, Math.round(dailyDosage * 1000) / 1000),
  };
}

export const updateDailyConsumptionRate = updateMedicineDosage;

