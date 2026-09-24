import React, { useState, useMemo } from 'react';
import { ExpiryItem, ItemCategory } from '../types';
import { getDaysRemaining, formatDisplayDate, getExpiryStatus } from '../utils/dateUtils';
import { getMedicineStockStats, recordDoseConsumption, refillMedicineStock, formatQuantity } from '../utils/medicineUtils';

interface DashboardViewProps {
  items: ExpiryItem[];
  onSelectItem: (item: ExpiryItem) => void;
  onOpenScanner: () => void;
  onOpenManualEntry?: () => void;
  onOpenRecipes?: (item: ExpiryItem) => void;
  onArchiveItem: (item: ExpiryItem) => void;
  onConsumeItem: (item: ExpiryItem) => void;
  onRestockItem: (item: ExpiryItem) => void;
  onUpdateItem?: (item: ExpiryItem) => void;
  showToast?: (msg: string, icon?: string) => void;
  vaultCounts: {
    total: number;
    critical: number;
    warning: number;
    safe: number;
    expired: number;
  };
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  items,
  onSelectItem,
  onOpenScanner,
  onOpenManualEntry,
  onOpenRecipes,
  onArchiveItem,
  onConsumeItem,
  onRestockItem,
  onUpdateItem,
  showToast,
  vaultCounts,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<ItemCategory | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<'critical' | 'warning' | 'safe' | 'expired' | null>(null);
  const [sortOrder, setSortOrder] = useState<'soonest' | 'latest'>('soonest');
  const [viewMode, setViewMode] = useState<'all' | 'expiring' | 'pinned'>('all');
  const [isFabOpen, setIsFabOpen] = useState(false);

  // Filter active items (exclude archived)
  const activeItems = useMemo(() => {
    return items.filter(item => item.status === 'active' || item.status === 'expired');
  }, [items]);

  // Pinned items for quick access
  const pinnedItems = useMemo(() => {
    return activeItems.filter(item => Boolean(item.isPinned));
  }, [activeItems]);

  // Urgent attention items (expired or expiring in <= 3 days)
  const urgentItems = useMemo(() => {
    return activeItems.filter(item => {
      const days = getDaysRemaining(item.expiryDate);
      return days <= 3;
    });
  }, [activeItems]);

  // Expiring items (within 30 days or expired)
  const expiringItems = useMemo(() => {
    return activeItems.filter(item => {
      const days = getDaysRemaining(item.expiryDate);
      return days <= 30;
    });
  }, [activeItems]);

  // Toggle pin/unpin for any item
  const handleTogglePin = (item: ExpiryItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const nextPinned = !item.isPinned;
    const updated: ExpiryItem = {
      ...item,
      isPinned: nextPinned,
    };
    if (onUpdateItem) onUpdateItem(updated);
    if (showToast) {
      showToast(
        nextPinned ? `Pinned "${item.name}" for quick access` : `Unpinned "${item.name}"`,
        'keep'
      );
    }
  };

  // Filtered and sorted items
  const filteredItems = useMemo(() => {
    let result = [...activeItems];

    // Filter by view mode (All vs Expiring vs Pinned)
    if (viewMode === 'pinned') {
      result = result.filter(item => Boolean(item.isPinned));
    } else if (viewMode === 'expiring') {
      result = result.filter(item => {
        const days = getDaysRemaining(item.expiryDate);
        return days <= 30;
      });
    }

    if (selectedCategory !== 'all') {
      result = result.filter(item => item.category === selectedCategory);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(item =>
        item.name.toLowerCase().includes(q) ||
        item.subCategory.toLowerCase().includes(q) ||
        (item.storageLocation && item.storageLocation.toLowerCase().includes(q)) ||
        (item.vendor && item.vendor.toLowerCase().includes(q)) ||
        (item.serialNumber && item.serialNumber.toLowerCase().includes(q))
      );
    }

    if (statusFilter) {
      result = result.filter(item => {
        const days = getDaysRemaining(item.expiryDate);
        if (statusFilter === 'expired') return days < 0;
        if (statusFilter === 'critical') return days <= 0;
        if (statusFilter === 'warning') return days > 0 && days <= 7;
        if (statusFilter === 'safe') return days > 7;
        return true;
      });
    }

    result.sort((a, b) => {
      const daysA = getDaysRemaining(a.expiryDate);
      const daysB = getDaysRemaining(b.expiryDate);
      return sortOrder === 'soonest' ? daysA - daysB : daysB - daysA;
    });

    return result;
  }, [activeItems, viewMode, selectedCategory, searchQuery, statusFilter, sortOrder]);

  // Group items by timeframe
  const groupedSections = useMemo(() => {
    const thisWeek: ExpiryItem[] = [];
    const next30Days: ExpiryItem[] = [];
    const later: ExpiryItem[] = [];

    filteredItems.forEach(item => {
      const days = getDaysRemaining(item.expiryDate);
      if (days <= 7) {
        thisWeek.push(item);
      } else if (days <= 30) {
        next30Days.push(item);
      } else {
        later.push(item);
      }
    });

    return { thisWeek, next30Days, later };
  }, [filteredItems]);

  // Category counts
  const categoryCounts = useMemo(() => {
    const counts = {
      all: activeItems.length,
      groceries: activeItems.filter(i => i.category === 'groceries').length,
      medicines: activeItems.filter(i => i.category === 'medicines').length,
      warranty: activeItems.filter(i => i.category === 'warranty').length,
    };
    return counts;
  }, [activeItems]);

  // Medicine Inventory & Stockout Tracking calculations
  const medicineItems = useMemo(() => {
    return activeItems.filter(i => i.category === 'medicines');
  }, [activeItems]);

  const medicineSummary = useMemo(() => {
    let totalStock = 0;
    let totalConsumed = 0;
    let totalAvailable = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;

    medicineItems.forEach(item => {
      const stats = getMedicineStockStats(item);
      totalStock += stats.totalStock;
      totalConsumed += stats.consumed;
      totalAvailable += stats.available;
      if (stats.isStockedOut) outOfStockCount++;
      else if (stats.isLowStock) lowStockCount++;
    });

    return {
      totalStock: Math.round(totalStock * 100) / 100,
      totalConsumed: Math.round(totalConsumed * 100) / 100,
      totalAvailable: Math.round(totalAvailable * 100) / 100,
      lowStockCount,
      outOfStockCount,
    };
  }, [medicineItems]);

  // Grocery Stock & Consumption Tracking calculations
  const groceryStockItems = useMemo(() => {
    return activeItems.filter(
      i => i.category === 'groceries' && (i.initialStock !== undefined || i.remainingStock !== undefined || i.dailyDosage !== undefined)
    );
  }, [activeItems]);

  const groceryStockSummary = useMemo(() => {
    let totalStock = 0;
    let totalConsumed = 0;
    let totalAvailable = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;
    let wasteRiskCount = 0;

    groceryStockItems.forEach(item => {
      const stats = getMedicineStockStats(item);
      totalStock += stats.totalStock;
      totalConsumed += stats.consumed;
      totalAvailable += stats.available;
      if (stats.isStockedOut) outOfStockCount++;
      else if (stats.isLowStock) lowStockCount++;
      if (stats.expiresBeforeStockout && stats.available > 0) wasteRiskCount++;
    });

    return {
      totalStock: Math.round(totalStock * 100) / 100,
      totalConsumed: Math.round(totalConsumed * 100) / 100,
      totalAvailable: Math.round(totalAvailable * 100) / 100,
      lowStockCount,
      outOfStockCount,
      wasteRiskCount,
    };
  }, [groceryStockItems]);

  return (
    <div className="flex flex-col gap-4 pb-28 pt-2">
      {/* 1. Vault Health & Expiry Banner */}
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0f766e] via-[#005c55] to-[#053833] p-4 text-white shadow-md">
        <div className="absolute -right-10 -bottom-10 w-44 h-44 rounded-full bg-[#6df5e1]/10 pointer-events-none blur-2xl"></div>

        <div className="flex items-center justify-between relative z-10 mb-2">
          <div className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[18px] text-[#a3faef]" style={{ fontVariationSettings: "'FILL' 1" }}>
              verified_user
            </span>
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#a3faef]">
              Household Vault #01
            </span>
          </div>
          <span className="text-[11px] text-white/80 bg-white/15 px-2 py-0.5 rounded-full font-medium">
            Updated 4m ago
          </span>
        </div>

        <h1 className="text-xl font-bold tracking-tight text-white mb-3">
          Vault Health & Expiry
        </h1>

        {/* 4 Interactive Health Metric Buttons */}
        <div className="grid grid-cols-4 gap-2 relative z-10">
          <button
            onClick={() => setStatusFilter(prev => prev === 'critical' ? null : 'critical')}
            className={`flex flex-col items-center justify-center p-2 rounded-xl transition-all text-center ${
              statusFilter === 'critical'
                ? 'bg-white/30 ring-2 ring-white'
                : 'bg-white/10 hover:bg-white/20'
            }`}
          >
            <div className="flex items-center gap-1 mb-0.5">
              <span className="w-2 h-2 rounded-full bg-[#ffdad6] animate-ping"></span>
              <span className="text-lg font-bold text-white">{vaultCounts.critical}</span>
            </div>
            <span className="text-[11px] text-[#ffdad6] font-semibold">Critical</span>
          </button>

          <button
            onClick={() => setStatusFilter(prev => prev === 'warning' ? null : 'warning')}
            className={`flex flex-col items-center justify-center p-2 rounded-xl transition-all text-center ${
              statusFilter === 'warning'
                ? 'bg-white/30 ring-2 ring-white'
                : 'bg-white/10 hover:bg-white/20'
            }`}
          >
            <div className="flex items-center gap-1 mb-0.5">
              <span className="w-2 h-2 rounded-full bg-[#f59e0b]"></span>
              <span className="text-lg font-bold text-white">{vaultCounts.warning}</span>
            </div>
            <span className="text-[11px] text-[#fef08a] font-semibold">Warning</span>
          </button>

          <button
            onClick={() => setStatusFilter(prev => prev === 'safe' ? null : 'safe')}
            className={`flex flex-col items-center justify-center p-2 rounded-xl transition-all text-center ${
              statusFilter === 'safe'
                ? 'bg-white/30 ring-2 ring-white'
                : 'bg-white/10 hover:bg-white/20'
            }`}
          >
            <div className="flex items-center gap-1 mb-0.5">
              <span className="w-2 h-2 rounded-full bg-[#71f8e4]"></span>
              <span className="text-lg font-bold text-white">{vaultCounts.safe}</span>
            </div>
            <span className="text-[11px] text-[#a3faef] font-semibold">Safe</span>
          </button>

          <button
            onClick={() => setStatusFilter(prev => prev === 'expired' ? null : 'expired')}
            className={`flex flex-col items-center justify-center p-2 rounded-xl transition-all text-center ${
              statusFilter === 'expired'
                ? 'bg-white/30 ring-2 ring-white'
                : 'bg-white/10 hover:bg-white/20'
            }`}
          >
            <div className="flex items-center gap-1 mb-0.5">
              <span className="w-2 h-2 rounded-full bg-[#bdc9c6]"></span>
              <span className="text-lg font-bold text-white">{vaultCounts.expired}</span>
            </div>
            <span className="text-[11px] text-white/70 font-semibold">Expired</span>
          </button>
        </div>
      </section>

      {/* 2. Search & Filter Bar */}
      <div className="flex items-center gap-2 w-full">
        <div className="relative flex-1 flex items-center bg-white dark:bg-[#131b2e] rounded-xl shadow-sm px-3.5 py-2.5 border border-[#eaedff] dark:border-[#283044]">
          <span className="material-symbols-outlined text-[#3e4947] dark:text-[#bdc9c6] text-[22px] mr-2">
            search
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search brands, pills, warranties..."
            className="w-full bg-transparent text-sm text-[#131b2e] dark:text-[#faf8ff] placeholder:text-[#3e4947]/60 dark:placeholder:text-[#bdc9c6]/60 focus:outline-none"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="w-6 h-6 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400"
            >
              <span className="material-symbols-outlined text-[16px]">close</span>
            </button>
          )}
        </div>
        <button
          onClick={() => {
            setSortOrder(prev => prev === 'soonest' ? 'latest' : 'soonest');
          }}
          title={`Sort: ${sortOrder === 'soonest' ? 'Soonest first' : 'Latest first'}`}
          className="h-11 w-11 rounded-xl bg-white dark:bg-[#131b2e] border border-[#eaedff] dark:border-[#283044] shadow-sm flex items-center justify-center text-[#3e4947] dark:text-[#bdc9c6] hover:text-[#005c55] active:scale-95 transition-all"
        >
          <span className="material-symbols-outlined text-[20px]">tune</span>
        </button>
      </div>

      {/* 3. Category Filter Track */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar -mx-4 px-4 pb-1">
        <button
          onClick={() => setSelectedCategory('all')}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold shrink-0 shadow-sm transition-all active:scale-95 ${
            selectedCategory === 'all'
              ? 'bg-[#005c55] text-white'
              : 'bg-white dark:bg-[#131b2e] text-[#3e4947] dark:text-[#bdc9c6] border border-[#eaedff] dark:border-[#283044]'
          }`}
        >
          <span>All</span>
          <span className={`px-1.5 py-0.2 rounded-full text-[11px] font-mono ${
            selectedCategory === 'all' ? 'bg-white/20 text-white' : 'bg-[#eaedff] dark:bg-[#283044]'
          }`}>
            {categoryCounts.all}
          </span>
        </button>

        <button
          onClick={() => setSelectedCategory('groceries')}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold shrink-0 shadow-sm transition-all active:scale-95 ${
            selectedCategory === 'groceries'
              ? 'bg-[#005c55] text-white'
              : 'bg-white dark:bg-[#131b2e] text-[#3e4947] dark:text-[#bdc9c6] border border-[#eaedff] dark:border-[#283044]'
          }`}
        >
          <span>🥗 Groceries</span>
          <span className={`px-1.5 py-0.2 rounded-full text-[11px] font-mono ${
            selectedCategory === 'groceries' ? 'bg-white/20 text-white' : 'bg-[#eaedff] dark:bg-[#283044]'
          }`}>
            {categoryCounts.groceries}
          </span>
        </button>

        <button
          onClick={() => setSelectedCategory('medicines')}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold shrink-0 shadow-sm transition-all active:scale-95 ${
            selectedCategory === 'medicines'
              ? 'bg-[#005c55] text-white'
              : 'bg-white dark:bg-[#131b2e] text-[#3e4947] dark:text-[#bdc9c6] border border-[#eaedff] dark:border-[#283044]'
          }`}
        >
          <span>💊 Medicines</span>
          <span className={`px-1.5 py-0.2 rounded-full text-[11px] font-mono ${
            selectedCategory === 'medicines' ? 'bg-white/20 text-white' : 'bg-[#eaedff] dark:bg-[#283044]'
          }`}>
            {categoryCounts.medicines}
          </span>
        </button>

        <button
          onClick={() => setSelectedCategory('warranty')}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold shrink-0 shadow-sm transition-all active:scale-95 ${
            selectedCategory === 'warranty'
              ? 'bg-[#005c55] text-white'
              : 'bg-white dark:bg-[#131b2e] text-[#3e4947] dark:text-[#bdc9c6] border border-[#eaedff] dark:border-[#283044]'
          }`}
        >
          <span>⚡ Warranties</span>
          <span className={`px-1.5 py-0.2 rounded-full text-[11px] font-mono ${
            selectedCategory === 'warranty' ? 'bg-white/20 text-white' : 'bg-[#eaedff] dark:bg-[#283044]'
          }`}>
            {categoryCounts.warranty}
          </span>
        </button>
      </div>

      {/* 3b. Focus Mode Toggle: All Items vs Expiring Only vs Pinned Only */}
      <div className="flex flex-col gap-2">
        <div className="bg-white dark:bg-[#131b2e] p-1 rounded-2xl border border-[#eaedff] dark:border-[#283044] shadow-xs flex items-center justify-between gap-1">
          <button
            onClick={() => setViewMode('all')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl text-xs font-bold transition-all ${
              viewMode === 'all'
                ? 'bg-[#005c55] text-white shadow-xs'
                : 'text-[#3e4947] dark:text-[#bdc9c6] hover:bg-[#f2f3ff] dark:hover:bg-[#283044]'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">apps</span>
            <span>All Items</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
              viewMode === 'all' ? 'bg-white/20 text-white' : 'bg-[#eaedff] dark:bg-[#283044]'
            }`}>
              {activeItems.length}
            </span>
          </button>

          <button
            onClick={() => setViewMode('expiring')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl text-xs font-bold transition-all ${
              viewMode === 'expiring'
                ? 'bg-[#ba1a1a] text-white shadow-xs'
                : 'text-[#3e4947] dark:text-[#bdc9c6] hover:bg-[#f2f3ff] dark:hover:bg-[#283044]'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">hourglass_top</span>
            <span>Expiring Only</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
              viewMode === 'expiring' ? 'bg-white/20 text-white' : 'bg-[#ffdad6] text-[#ba1a1a]'
            }`}>
              {expiringItems.length}
            </span>
          </button>

          <button
            onClick={() => setViewMode('pinned')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl text-xs font-bold transition-all ${
              viewMode === 'pinned'
                ? 'bg-[#0f766e] text-white shadow-xs ring-2 ring-[#6df5e1]'
                : 'text-[#3e4947] dark:text-[#bdc9c6] hover:bg-[#f2f3ff] dark:hover:bg-[#283044]'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>
              keep
            </span>
            <span>Pinned Only</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
              viewMode === 'pinned' ? 'bg-white/20 text-white' : 'bg-[#6df5e1]/40 text-[#006f64] dark:text-[#6df5e1]'
            }`}>
              {pinnedItems.length}
            </span>
          </button>
        </div>

        {/* Dynamic Context Notification Bar when filtered */}
        {viewMode !== 'all' && (
          <div className={`flex items-center justify-between px-3.5 py-2 rounded-xl text-xs font-medium border ${
            viewMode === 'expiring'
              ? 'bg-[#fff5f5] dark:bg-red-950/30 text-[#ba1a1a] dark:text-red-300 border-[#ffdad6] dark:border-red-900/40'
              : 'bg-[#f0fdf4] dark:bg-emerald-950/30 text-[#005c55] dark:text-[#6df5e1] border-[#6df5e1]/50 dark:border-emerald-900/40'
          }`}>
            <div className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[17px]">
                {viewMode === 'expiring' ? 'hourglass_top' : 'keep'}
              </span>
              <span className="font-semibold">
                {viewMode === 'expiring'
                  ? `Filtering to ${filteredItems.length} items expiring soon (≤30d or expired)`
                  : `Filtering to ${filteredItems.length} pinned item${filteredItems.length !== 1 ? 's' : ''}`}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setViewMode(viewMode === 'expiring' ? 'pinned' : 'expiring')}
                className="font-bold underline hover:opacity-80 cursor-pointer"
              >
                {viewMode === 'expiring' ? 'Switch to Pinned' : 'Switch to Expiring'}
              </button>
              <span className="opacity-40">•</span>
              <button
                onClick={() => setViewMode('all')}
                className="font-bold underline hover:opacity-80 cursor-pointer"
              >
                Reset
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Medicine Stock, Consumed & Available Hub */}
      {(selectedCategory === 'medicines' || medicineSummary.lowStockCount > 0 || medicineSummary.outOfStockCount > 0) && medicineItems.length > 0 && (
        <section className="bg-white dark:bg-[#131b2e] rounded-2xl p-4 shadow-sm border border-[#eaedff] dark:border-[#283044] space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-[#6df5e1]/40 text-[#006f64] flex items-center justify-center">
                <span className="material-symbols-outlined text-[18px]">pill</span>
              </div>
              <div>
                <h3 className="font-bold text-sm text-[#131b2e] dark:text-white">
                  Medicine Stock & Daily Consumption Hub
                </h3>
                <p className="text-[11px] text-[#3e4947] dark:text-[#bdc9c6]">
                  {medicineItems.length} active prescription{medicineItems.length !== 1 ? 's' : ''} monitored
                </p>
              </div>
            </div>

            {medicineSummary.lowStockCount > 0 || medicineSummary.outOfStockCount > 0 ? (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#ffdad6] text-[#ba1a1a] flex items-center gap-1 animate-pulse">
                <span className="material-symbols-outlined text-[13px]">warning</span>
                Stockout Warning ({medicineSummary.lowStockCount + medicineSummary.outOfStockCount})
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#6df5e1]/40 text-[#006f64] flex items-center gap-1">
                <span className="material-symbols-outlined text-[13px]">check_circle</span>
                Adequate Stock
              </span>
            )}
          </div>

          {/* 3 Metrics: Total Stock, Consumed, Available */}
          <div className="grid grid-cols-3 gap-2">
            <div className="p-2.5 rounded-xl bg-[#f2f3ff] dark:bg-[#283044] flex flex-col">
              <span className="text-[10px] uppercase font-bold text-[#3e4947] dark:text-[#bdc9c6]">Total Stock</span>
              <span className="text-base font-black text-[#131b2e] dark:text-white mt-0.5">
                {formatQuantity(medicineSummary.totalStock)} <span className="text-[10px] font-normal text-slate-500">tablets</span>
              </span>
            </div>
            <div className="p-2.5 rounded-xl bg-[#f2f3ff] dark:bg-[#283044] flex flex-col">
              <span className="text-[10px] uppercase font-bold text-[#3e4947] dark:text-[#bdc9c6]">Consumed</span>
              <span className="text-base font-black text-slate-700 dark:text-slate-300 mt-0.5">
                {formatQuantity(medicineSummary.totalConsumed)} <span className="text-[10px] font-normal text-slate-500">tablets</span>
              </span>
            </div>
            <div className={`p-2.5 rounded-xl flex flex-col border ${
              medicineSummary.lowStockCount > 0 || medicineSummary.outOfStockCount > 0
                ? 'bg-[#ffdad6]/40 dark:bg-red-950/40 border-[#ffb4ab]'
                : 'bg-[#6df5e1]/25 dark:bg-emerald-950/30 border-[#6df5e1]/40'
            }`}>
              <span className="text-[10px] uppercase font-bold text-[#005c55] dark:text-[#6df5e1]">Available</span>
              <span className={`text-base font-black mt-0.5 ${
                medicineSummary.lowStockCount > 0 || medicineSummary.outOfStockCount > 0 ? 'text-[#ba1a1a]' : 'text-[#005c55] dark:text-[#6df5e1]'
              }`}>
                {formatQuantity(medicineSummary.totalAvailable)} <span className="text-[10px] font-normal text-slate-500">tablets</span>
              </span>
            </div>
          </div>

          {/* Pre-Stockout Alert Banner if low or out of stock */}
          {(medicineSummary.lowStockCount > 0 || medicineSummary.outOfStockCount > 0) && (
            <div className="p-2.5 rounded-xl bg-[#fff7ed] dark:bg-amber-950/40 border border-[#fed7aa] dark:border-amber-900/50 flex items-start gap-2">
              <span className="material-symbols-outlined text-[18px] text-[#c2410c] shrink-0 mt-0.5">
                notification_important
              </span>
              <div className="text-xs">
                <span className="font-bold text-[#c2410c] block">
                  Action Required: Refill medication before stock exhaustion
                </span>
                <span className="text-[11px] text-[#3e4947] dark:text-[#bdc9c6]">
                  Check each prescription below to see daily consumed rates and predicted run-out dates.
                </span>
              </div>
            </div>
          )}
        </section>
      )}

      {/* Grocery Stock, Consumed & Zero-Waste Hub */}
      {(selectedCategory === 'groceries' || groceryStockSummary.wasteRiskCount > 0 || groceryStockSummary.lowStockCount > 0) && groceryStockItems.length > 0 && (
        <section className="bg-white dark:bg-[#131b2e] rounded-2xl p-4 shadow-sm border border-[#eaedff] dark:border-[#283044] space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-[#005c55]/15 dark:bg-[#005c55]/30 text-[#005c55] dark:text-[#6df5e1] flex items-center justify-center">
                <span className="material-symbols-outlined text-[18px]">kitchen</span>
              </div>
              <div>
                <h3 className="font-bold text-sm text-[#131b2e] dark:text-white">
                  Grocery Stock & Daily Consumption Hub
                </h3>
                <p className="text-[11px] text-[#3e4947] dark:text-[#bdc9c6]">
                  {groceryStockItems.length} pantry item{groceryStockItems.length !== 1 ? 's' : ''} tracked with specific units & daily consumption
                </p>
              </div>
            </div>

            {groceryStockSummary.wasteRiskCount > 0 ? (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#ffdad6] text-[#ba1a1a] flex items-center gap-1 animate-pulse">
                <span className="material-symbols-outlined text-[13px]">alarm</span>
                Spoilage Risk ({groceryStockSummary.wasteRiskCount})
              </span>
            ) : groceryStockSummary.lowStockCount > 0 || groceryStockSummary.outOfStockCount > 0 ? (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#fff7ed] text-[#c2410c] border border-[#fed7aa] flex items-center gap-1">
                <span className="material-symbols-outlined text-[13px]">warning</span>
                Stockout Alert ({groceryStockSummary.lowStockCount + groceryStockSummary.outOfStockCount})
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#6df5e1]/40 text-[#006f64] dark:text-[#6df5e1] flex items-center gap-1">
                <span className="material-symbols-outlined text-[13px]">eco</span>
                Zero-Waste Optimal
              </span>
            )}
          </div>

          {/* 3 Metrics: Total Stock, Consumed, Available */}
          <div className="grid grid-cols-3 gap-2">
            <div className="p-2.5 rounded-xl bg-[#f2f3ff] dark:bg-[#283044] flex flex-col">
              <span className="text-[10px] uppercase font-bold text-[#3e4947] dark:text-[#bdc9c6]">Total Initial</span>
              <span className="text-base font-black text-[#131b2e] dark:text-white mt-0.5">
                {formatQuantity(groceryStockSummary.totalStock)} <span className="text-[10px] font-normal text-slate-500">units</span>
              </span>
            </div>
            <div className="p-2.5 rounded-xl bg-[#f2f3ff] dark:bg-[#283044] flex flex-col">
              <span className="text-[10px] uppercase font-bold text-[#3e4947] dark:text-[#bdc9c6]">Daily Consumed</span>
              <span className="text-base font-black text-slate-700 dark:text-slate-300 mt-0.5">
                {formatQuantity(groceryStockSummary.totalConsumed)} <span className="text-[10px] font-normal text-slate-500">units</span>
              </span>
            </div>
            <div className={`p-2.5 rounded-xl flex flex-col border ${
              groceryStockSummary.wasteRiskCount > 0
                ? 'bg-rose-50/60 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900/50'
                : groceryStockSummary.lowStockCount > 0 || groceryStockSummary.outOfStockCount > 0
                ? 'bg-[#ffdad6]/40 dark:bg-red-950/40 border-[#ffb4ab]'
                : 'bg-[#6df5e1]/25 dark:bg-emerald-950/30 border-[#6df5e1]/40'
            }`}>
              <span className="text-[10px] uppercase font-bold text-[#005c55] dark:text-[#6df5e1]">In Stock</span>
              <span className={`text-base font-black mt-0.5 ${
                groceryStockSummary.wasteRiskCount > 0
                  ? 'text-rose-600 dark:text-rose-400'
                  : groceryStockSummary.lowStockCount > 0 || groceryStockSummary.outOfStockCount > 0
                  ? 'text-[#ba1a1a]'
                  : 'text-[#005c55] dark:text-[#6df5e1]'
              }`}>
                {formatQuantity(groceryStockSummary.totalAvailable)} <span className="text-[10px] font-normal text-slate-500">units</span>
              </span>
            </div>
          </div>

          {/* Dual Alert Spoilage/Stockout Notice */}
          {groceryStockSummary.wasteRiskCount > 0 && (
            <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 flex items-start gap-2">
              <span className="material-symbols-outlined text-[18px] text-rose-600 shrink-0 mt-0.5">
                alarm
              </span>
              <div className="text-xs">
                <span className="font-bold text-rose-700 dark:text-rose-300 block">
                  Zero-Waste Alert: {groceryStockSummary.wasteRiskCount} grocery item{groceryStockSummary.wasteRiskCount !== 1 ? 's will' : ' will'} expire before finishing
                </span>
                <span className="text-[11px] text-slate-600 dark:text-slate-300">
                  At current daily consumption, expiry occurs prior to supply exhaustion. Increase daily usage or freeze.
                </span>
              </div>
            </div>
          )}
        </section>
      )}

      {/* 3c. Pinned Items Section */}
      {((viewMode !== 'expiring' && pinnedItems.length > 0) || viewMode === 'pinned') && (
        <section className="flex flex-col gap-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[#005c55] dark:text-[#6df5e1] text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                keep
              </span>
              <h2 className="text-base font-bold text-[#131b2e] dark:text-[#faf8ff] flex items-center gap-1.5">
                <span>Pinned Items</span>
                <span className="text-[11px] font-semibold px-2 py-0.2 rounded-full bg-[#6df5e1]/40 text-[#006f64] dark:text-[#6df5e1]">
                  {pinnedItems.length}
                </span>
              </h2>
            </div>

            <div className="flex items-center gap-2">
              {viewMode !== 'pinned' ? (
                <button
                  onClick={() => setViewMode('pinned')}
                  className="text-xs font-semibold text-[#005c55] dark:text-[#6df5e1] flex items-center gap-0.5 hover:underline cursor-pointer"
                >
                  <span>Focus Pinned</span>
                  <span className="material-symbols-outlined text-[15px]">arrow_forward</span>
                </button>
              ) : (
                <button
                  onClick={() => setViewMode('all')}
                  className="text-xs font-semibold text-[#005c55] dark:text-[#6df5e1] flex items-center gap-0.5 hover:underline cursor-pointer"
                >
                  <span>Show All Items</span>
                  <span className="material-symbols-outlined text-[15px]">close</span>
                </button>
              )}
            </div>
          </div>

          {pinnedItems.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {pinnedItems.map(item => {
                const status = getExpiryStatus(item.expiryDate);
                const isMed = item.category === 'medicines';
                const isGrocery = item.category === 'groceries';
                const stockStats = (isMed || isGrocery || item.initialStock !== undefined) ? getMedicineStockStats(item) : null;

                return (
                  <div
                    key={`pinned-${item.id}`}
                    onClick={() => onSelectItem(item)}
                    className="group rounded-2xl bg-white dark:bg-[#131b2e] p-3.5 shadow-sm border border-[#eaedff] dark:border-[#283044] hover:border-[#005c55]/50 transition-all cursor-pointer flex flex-col justify-between gap-2.5 relative"
                  >
                    {/* Top Row: Category badge & Days remaining tag + Pin button */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="px-2 py-0.5 rounded-md bg-[#eaedff] dark:bg-[#283044] text-[#3e4947] dark:text-[#bdc9c6] text-[10px] uppercase font-bold tracking-wider">
                          {item.category}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${status.badgeClass} truncate`}>
                          {status.label}
                        </span>
                      </div>

                      <button
                        onClick={(e) => handleTogglePin(item, e)}
                        title="Unpin from Dashboard"
                        aria-label="Unpin item"
                        className="w-7 h-7 rounded-full flex items-center justify-center text-[#005c55] dark:text-[#6df5e1] bg-[#6df5e1]/30 hover:bg-rose-100 hover:text-rose-600 dark:hover:bg-rose-950/40 dark:hover:text-rose-400 transition-all shrink-0 cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[17px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                          keep
                        </span>
                      </button>
                    </div>

                    {/* Middle Row: Photo or category icon + Item Details */}
                    <div className="flex items-center gap-3">
                      <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-slate-100 dark:bg-[#283044] shrink-0 shadow-xs">
                        {item.photos[0] ? (
                          <img src={item.photos[0].url} alt={item.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-[#005c55] dark:text-[#6df5e1]">
                            <span className="material-symbols-outlined text-[20px]">
                              {isMed ? 'pill' : isGrocery ? 'kitchen' : 'inventory_2'}
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <h3 className="font-bold text-sm text-[#131b2e] dark:text-white truncate group-hover:text-[#005c55] dark:group-hover:text-[#6df5e1] transition-colors">
                          {item.name}
                        </h3>
                        <p className="text-[11px] text-[#3e4947] dark:text-[#bdc9c6] truncate">
                          {item.storageLocation || item.subCategory}
                        </p>
                        <p className="text-[11px] text-[#3e4947] dark:text-[#bdc9c6]">
                          Exp: {formatDisplayDate(item.expiryDate)}
                        </p>
                      </div>
                    </div>

                    {/* Stock Details if item has tracked stock */}
                    {stockStats && stockStats.hasTracking && (
                      <div className="px-2.5 py-1.5 rounded-xl bg-slate-50 dark:bg-[#1a233a] border border-[#eaedff] dark:border-[#283044] flex items-center justify-between text-[11px]">
                        <span className="font-semibold text-slate-600 dark:text-slate-300">
                          Avail: <strong className={stockStats.isStockedOut ? 'text-red-500' : 'text-[#005c55] dark:text-[#6df5e1]'}>{stockStats.available} {stockStats.unit}</strong>
                        </span>
                        <span className="text-[10px] text-slate-500">
                          {stockStats.daysOfSupplyLeft}d supply
                        </span>
                      </div>
                    )}

                    {/* Action Footer */}
                    <div className="flex items-center gap-1.5 pt-1 border-t border-[#eaedff] dark:border-[#283044]">
                      {stockStats && stockStats.hasTracking ? (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (stockStats.available <= 0) {
                              showToast?.(`Cannot consume: ${item.name} is out of stock!`, 'error');
                              return;
                            }
                            const updated = recordDoseConsumption(item, stockStats.dailyDosage);
                            onUpdateItem?.(updated);
                            showToast?.(
                              isGrocery
                                ? `Logged ${stockStats.dailyDosage} ${stockStats.unit} consumed. ${Math.max(0, stockStats.available - stockStats.dailyDosage)} remaining.`
                                : `Logged ${stockStats.dailyDosage} ${stockStats.unit} taken. ${Math.max(0, stockStats.available - stockStats.dailyDosage)} available.`,
                              isGrocery ? 'restaurant' : 'medication'
                            );
                          }}
                          disabled={stockStats.available <= 0}
                          className={`flex-1 py-1.5 px-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition-all active:scale-95 cursor-pointer ${
                            stockStats.available <= 0
                              ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                              : 'bg-[#6df5e1]/40 hover:bg-[#6df5e1]/60 text-[#006f64] dark:text-[#131b2e]'
                          }`}
                        >
                          <span className="material-symbols-outlined text-[14px]">
                            {isGrocery ? 'restaurant' : 'medication'}
                          </span>
                          <span>{isGrocery ? `Consume (-${stockStats.dailyDosage})` : `Take Dose (-${stockStats.dailyDosage})`}</span>
                        </button>
                      ) : (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectItem(item);
                          }}
                          className="flex-1 py-1.5 px-2.5 rounded-xl text-xs font-bold bg-[#eaedff] dark:bg-[#283044] text-[#005c55] dark:text-[#6df5e1] hover:bg-[#dfe3ff] flex items-center justify-center gap-1 transition-all active:scale-95 cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-[14px]">visibility</span>
                          <span>View Proof & Details</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-6 rounded-2xl bg-white dark:bg-[#131b2e] border border-dashed border-[#eaedff] dark:border-[#283044] text-center flex flex-col items-center justify-center gap-2">
              <div className="w-12 h-12 rounded-full bg-[#eaedff] dark:bg-[#283044] flex items-center justify-center text-[#005c55] dark:text-[#6df5e1]">
                <span className="material-symbols-outlined text-[24px]">keep</span>
              </div>
              <h3 className="font-bold text-sm text-[#131b2e] dark:text-white">No Pinned Items Yet</h3>
              <p className="text-xs text-slate-500 max-w-sm">
                Keep your daily medications, kitchen pantry staples, or high-value warranties pinned at the top of your dashboard for instant 1-tap access. Tap the 📌 icon on any item card to pin it.
              </p>
              <button
                onClick={() => setViewMode('all')}
                className="mt-1 px-4 py-2 rounded-xl bg-[#005c55] text-white text-xs font-bold shadow-sm hover:bg-[#0f766e] transition-all active:scale-95 cursor-pointer"
              >
                Browse All Vault Items
              </button>
            </div>
          )}
        </section>
      )}

      {/* 4. Urgent Attention Section (Horizontal scroll cards) */}
      {urgentItems.length > 0 && !statusFilter && viewMode !== 'pinned' && (
        <section className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[#ba1a1a] text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                notification_important
              </span>
              <h2 className="text-base font-bold text-[#131b2e] dark:text-[#faf8ff]">Urgent Attention</h2>
            </div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#ba1a1a]">
              Action Required
            </span>
          </div>

          <div className="flex gap-3 overflow-x-auto no-scrollbar -mx-4 px-4 pt-1 pb-2 snap-x">
            {urgentItems.map(item => {
              const status = getExpiryStatus(item.expiryDate);
              const isAmox = item.name.includes('Amoxicillin');

              return (
                <div
                  key={item.id}
                  className={`min-w-[285px] max-w-[290px] rounded-2xl p-4 shadow-sm flex flex-col justify-between shrink-0 snap-start border ${
                    status.isExpired
                      ? 'bg-[#ffdad6]/35 dark:bg-[#ba1a1a]/15 border-[#ffdad6]'
                      : 'bg-white dark:bg-[#131b2e] border-[#eaedff] dark:border-[#283044]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div
                      className="flex items-center gap-3 cursor-pointer min-w-0 flex-1"
                      onClick={() => onSelectItem(item)}
                    >
                      <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-slate-100 shrink-0 shadow-sm">
                        {item.photos[0] ? (
                          <img
                            src={item.photos[0].url}
                            alt={item.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-[#eaedff] flex items-center justify-center text-[#005c55]">
                            <span className="material-symbols-outlined text-[20px]">inventory_2</span>
                          </div>
                        )}
                        <div className="absolute bottom-0 inset-x-0 bg-black/60 backdrop-blur-xs flex items-center justify-center py-0.5">
                          <span className="text-[9px] text-white font-medium">
                            {item.photos.length} photo{item.photos.length !== 1 ? 's' : ''}
                          </span>
                        </div>
                      </div>

                      <div className="min-w-0">
                        <div className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] uppercase font-bold mb-0.5 ${
                          status.isExpired
                            ? 'bg-[#ba1a1a] text-white'
                            : 'bg-[#fef3c7] text-[#92400e]'
                        }`}>
                          {status.label}
                        </div>
                        <h3 className="font-bold text-sm text-[#131b2e] dark:text-[#faf8ff] leading-snug truncate">
                          {item.name}
                        </h3>
                        <p className="text-[12px] text-[#3e4947] dark:text-[#bdc9c6] truncate">
                          {item.storageLocation || item.subCategory}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={(e) => handleTogglePin(item, e)}
                      title={item.isPinned ? "Unpin from Dashboard" : "Pin for Quick Access"}
                      aria-label={item.isPinned ? "Unpin item" : "Pin item"}
                      className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 transition-all cursor-pointer ${
                        item.isPinned
                          ? 'text-[#005c55] dark:text-[#6df5e1] bg-[#6df5e1]/30 hover:bg-[#6df5e1]/50 shadow-xs'
                          : 'text-slate-400 hover:text-[#005c55] hover:bg-slate-100 dark:hover:bg-[#283044]'
                      }`}
                    >
                      <span
                        className="material-symbols-outlined text-[17px]"
                        style={{ fontVariationSettings: item.isPinned ? "'FILL' 1" : "'FILL' 0" }}
                      >
                        keep
                      </span>
                    </button>
                  </div>

                  <p className="text-[12px] text-[#3e4947] dark:text-[#bdc9c6] mb-3 line-clamp-2">
                    {item.notes || `Expiring on ${formatDisplayDate(item.expiryDate)}. Take action to avoid waste or claims expiration.`}
                  </p>

                  {/* Contextual Action Buttons */}
                  <div className="flex items-center gap-2 mt-auto">
                    {isAmox ? (
                      <>
                        <button
                          onClick={() => onArchiveItem(item)}
                          className="flex-1 py-2 px-3 rounded-xl bg-white dark:bg-[#283044] text-[#131b2e] dark:text-white font-semibold text-xs shadow-sm hover:bg-slate-50 flex items-center justify-center gap-1 active:scale-95 transition-all border border-[#eaedff] dark:border-transparent"
                        >
                          <span className="material-symbols-outlined text-[16px] text-[#3e4947] dark:text-[#bdc9c6]">archive</span>
                          Archive
                        </button>
                        <button
                          onClick={() => onRestockItem(item)}
                          className="flex-1 py-2 px-3 rounded-xl bg-[#005c55] text-white font-semibold text-xs shadow-sm hover:bg-[#0f766e] flex items-center justify-center gap-1 active:scale-95 transition-all"
                        >
                          <span className="material-symbols-outlined text-[16px]">refresh</span>
                          Restock
                        </button>
                      </>
                    ) : (
                      <div className="flex items-center gap-2 w-full">
                        {item.category === 'groceries' && onOpenRecipes && (
                          <button
                            onClick={() => onOpenRecipes(item)}
                            title="Zero-waste recipes for this ingredient"
                            className="py-2 px-2.5 rounded-xl bg-white dark:bg-[#283044] text-[#005c55] dark:text-[#6df5e1] font-semibold text-xs shadow-sm hover:bg-slate-50 flex items-center justify-center gap-1 active:scale-95 transition-all border border-[#eaedff] dark:border-transparent shrink-0"
                          >
                            <span className="material-symbols-outlined text-[16px]">menu_book</span>
                            <span>Recipes</span>
                          </button>
                        )}
                        <button
                          onClick={() => onConsumeItem(item)}
                          className="flex-1 py-2 px-3 rounded-xl bg-[#6df5e1]/50 hover:bg-[#6df5e1]/70 text-[#006f64] dark:text-[#131b2e] font-semibold text-xs shadow-sm flex items-center justify-center gap-1.5 active:scale-95 transition-all truncate"
                        >
                          <span className="material-symbols-outlined text-[16px]">check_circle</span>
                          <span>Mark Consumed</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* 5. All Tracked Items Section */}
      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-[#131b2e] dark:text-[#faf8ff]">
            {viewMode === 'pinned'
              ? `Pinned Vault Items (${filteredItems.length})`
              : viewMode === 'expiring'
              ? `Expiring Vault Items (${filteredItems.length})`
              : statusFilter
              ? `Filtered (${statusFilter})`
              : 'All Tracked Items'}
          </h2>
          <button
            onClick={() => setSortOrder(prev => prev === 'soonest' ? 'latest' : 'soonest')}
            className="text-xs font-semibold text-[#005c55] dark:text-[#6df5e1] flex items-center gap-0.5 hover:underline cursor-pointer"
          >
            <span>Sort: {sortOrder === 'soonest' ? 'Soonest' : 'Latest'}</span>
            <span className="material-symbols-outlined text-[16px]">swap_vert</span>
          </button>
        </div>

        {/* Section: Expiring This Week */}
        {groupedSections.thisWeek.length > 0 && (
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between px-1">
              <span className="text-[11px] font-bold text-[#3e4947] dark:text-[#bdc9c6] uppercase tracking-wider">
                Expiring This Week
              </span>
              <span className="text-xs text-[#3e4947] dark:text-[#bdc9c6]">
                {groupedSections.thisWeek.length} item{groupedSections.thisWeek.length !== 1 ? 's' : ''}
              </span>
            </div>
            {groupedSections.thisWeek.map(item => (
              <TrackedItemCard
                key={item.id}
                item={item}
                onSelect={() => onSelectItem(item)}
                onTogglePin={handleTogglePin}
                onUpdateItem={onUpdateItem}
                showToast={showToast}
              />
            ))}
          </div>
        )}

        {/* Section: Next 30 Days */}
        {groupedSections.next30Days.length > 0 && (
          <div className="flex flex-col gap-2 mt-1">
            <div className="flex items-center justify-between px-1">
              <span className="text-[11px] font-bold text-[#3e4947] dark:text-[#bdc9c6] uppercase tracking-wider">
                Next 30 Days
              </span>
              <span className="text-xs text-[#3e4947] dark:text-[#bdc9c6]">
                {groupedSections.next30Days.length} item{groupedSections.next30Days.length !== 1 ? 's' : ''}
              </span>
            </div>
            {groupedSections.next30Days.map(item => (
              <TrackedItemCard
                key={item.id}
                item={item}
                onSelect={() => onSelectItem(item)}
                onTogglePin={handleTogglePin}
                onUpdateItem={onUpdateItem}
                showToast={showToast}
              />
            ))}
          </div>
        )}

        {/* Section: Later */}
        {groupedSections.later.length > 0 && (
          <div className="flex flex-col gap-2 mt-1">
            <div className="flex items-center justify-between px-1">
              <span className="text-[11px] font-bold text-[#3e4947] dark:text-[#bdc9c6] uppercase tracking-wider">
                Later
              </span>
              <span className="text-xs text-[#3e4947] dark:text-[#bdc9c6]">
                {groupedSections.later.length} item{groupedSections.later.length !== 1 ? 's' : ''}
              </span>
            </div>
            {groupedSections.later.map(item => (
              <TrackedItemCard
                key={item.id}
                item={item}
                onSelect={() => onSelectItem(item)}
                onTogglePin={handleTogglePin}
                onUpdateItem={onUpdateItem}
                showToast={showToast}
              />
            ))}
          </div>
        )}

        {filteredItems.length === 0 && (
          <div className="text-center py-12 bg-white dark:bg-[#131b2e] rounded-2xl border border-dashed border-[#eaedff] dark:border-[#283044] p-6">
            <span className="material-symbols-outlined text-[36px] text-slate-400 mb-2">
              {viewMode === 'pinned' ? 'keep' : viewMode === 'expiring' ? 'hourglass_disabled' : 'search_off'}
            </span>
            <h3 className="font-bold text-sm text-[#131b2e] dark:text-white">
              {viewMode === 'pinned'
                ? 'No Pinned Items Found'
                : viewMode === 'expiring'
                ? 'No Expiring Items Found'
                : 'No Items Found'}
            </h3>
            <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
              {viewMode === 'pinned'
                ? 'Pin your daily medicines, groceries, or urgent warranties using the 📌 icon on any item card for 1-tap access.'
                : viewMode === 'expiring'
                ? 'Great news! There are no items expiring within 30 days matching your active filters.'
                : 'Try adjusting your search query or clear the active filter to view all vault assets.'}
            </p>
            <div className="flex items-center justify-center gap-2 mt-3">
              {viewMode !== 'all' && (
                <button
                  onClick={() => setViewMode('all')}
                  className="px-3 py-1.5 rounded-lg bg-[#005c55] text-white text-xs font-semibold hover:bg-[#0f766e] transition-colors cursor-pointer"
                >
                  View All Items
                </button>
              )}
              {statusFilter && (
                <button
                  onClick={() => setStatusFilter(null)}
                  className="px-3 py-1.5 rounded-lg bg-slate-200 dark:bg-[#283044] text-slate-700 dark:text-slate-200 text-xs font-semibold cursor-pointer"
                >
                  Clear Status Filter
                </button>
              )}
            </div>
          </div>
        )}
      </section>

      {/* 6. Smart Receipt OCR Card Promo */}
      <div className="p-4 rounded-2xl bg-[#eaedff] dark:bg-[#283044] flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#6df5e1] text-[#006f64] flex items-center justify-center shadow-xs shrink-0">
            <span className="material-symbols-outlined text-[22px]">auto_awesome</span>
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-sm text-[#131b2e] dark:text-white">Smart Receipt OCR</span>
            <span className="text-xs text-[#3e4947] dark:text-[#bdc9c6]">
              Scan paper receipts to auto-extract expiry
            </span>
          </div>
        </div>
        <button
          onClick={onOpenScanner}
          className="px-3.5 py-2 rounded-xl bg-[#005c55] text-white text-xs font-bold shadow-sm active:scale-95 transition-all shrink-0"
        >
          Try Now
        </button>
      </div>

      {/* Floating Action Button & Speed Dial */}
      <div className="fixed bottom-24 right-5 z-40 flex flex-col items-end gap-2.5">
        {isFabOpen && (
          <div className="flex flex-col items-end gap-2 animate-in fade-in slide-in-from-bottom-2 duration-200">
            {onOpenManualEntry && (
              <button
                onClick={() => {
                  setIsFabOpen(false);
                  onOpenManualEntry();
                }}
                className="flex items-center gap-2.5 px-3.5 py-2 rounded-2xl bg-white dark:bg-[#131b2e] border border-[#eaedff] dark:border-[#283044] shadow-lg text-xs font-bold text-[#131b2e] dark:text-white active:scale-95 transition-all"
              >
                <span>Manual Item Entry</span>
                <div className="w-8 h-8 rounded-xl bg-[#eaedff] dark:bg-[#283044] flex items-center justify-center text-[#005c55] dark:text-[#6df5e1]">
                  <span className="material-symbols-outlined text-[18px]">edit_note</span>
                </div>
              </button>
            )}

            <button
              onClick={() => {
                setIsFabOpen(false);
                onOpenScanner();
              }}
              className="flex items-center gap-2.5 px-3.5 py-2 rounded-2xl bg-white dark:bg-[#131b2e] border border-[#eaedff] dark:border-[#283044] shadow-lg text-xs font-bold text-[#131b2e] dark:text-white active:scale-95 transition-all"
            >
              <span>Scan Barcode / Receipt</span>
              <div className="w-8 h-8 rounded-xl bg-[#6df5e1]/40 flex items-center justify-center text-[#006f64] dark:text-[#6df5e1]">
                <span className="material-symbols-outlined text-[18px]">document_scanner</span>
              </div>
            </button>
          </div>
        )}

        <button
          onClick={() => setIsFabOpen(!isFabOpen)}
          aria-label="Add Item"
          title="Add New Tracked Item"
          className="w-13 h-13 rounded-full bg-[#005c55] text-white shadow-xl flex items-center justify-center hover:bg-[#0f766e] active:scale-90 transition-all cursor-pointer ring-4 ring-white dark:ring-[#131b2e]"
        >
          <span className={`material-symbols-outlined text-[28px] transition-transform duration-200 ${isFabOpen ? 'rotate-45' : ''}`}>
            add
          </span>
        </button>
      </div>
    </div>
  );
};

interface TrackedItemCardProps {
  item: ExpiryItem;
  onSelect: () => void;
  onTogglePin?: (item: ExpiryItem, e?: React.MouseEvent) => void;
  onUpdateItem?: (item: ExpiryItem) => void;
  showToast?: (msg: string, icon?: string) => void;
}

const TrackedItemCard: React.FC<TrackedItemCardProps> = ({ item, onSelect, onTogglePin, onUpdateItem, showToast }) => {
  const status = getExpiryStatus(item.expiryDate);
  const isMed = item.category === 'medicines';
  const isGrocery = item.category === 'groceries';
  const hasTracking = item.initialStock !== undefined || item.remainingStock !== undefined || item.dailyDosage !== undefined;
  const stockStats = (isMed || isGrocery || hasTracking) ? getMedicineStockStats(item) : null;

  const handleTakeDose = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!stockStats) return;
    if (stockStats.available <= 0) {
      if (showToast) {
        showToast(
          isGrocery ? `Cannot consume: ${item.name} is out of stock!` : `Cannot take dose: ${item.name} is out of stock!`,
          'error'
        );
      }
      return;
    }
    const updated = recordDoseConsumption(item, stockStats.dailyDosage);
    if (onUpdateItem) onUpdateItem(updated);
    if (showToast) {
      showToast(
        isGrocery
          ? `Logged ${stockStats.dailyDosage} ${stockStats.unit} consumed. ${Math.max(0, stockStats.available - stockStats.dailyDosage)} remaining.`
          : `Logged ${stockStats.dailyDosage} ${stockStats.unit} taken. ${Math.max(0, stockStats.available - stockStats.dailyDosage)} available.`,
        isGrocery ? 'restaurant' : 'medication'
      );
    }
  };

  const getDocBadge = () => {
    if (item.name.includes('MacBook')) return 'PDF';
    if (item.name.includes('Dyson V15')) return 'DOC';
    return null;
  };

  const docBadge = getDocBadge();

  return (
    <div
      onClick={onSelect}
      className={`rounded-2xl bg-white dark:bg-[#131b2e] p-3.5 shadow-sm border transition-all cursor-pointer flex flex-col gap-2.5 ${
        stockStats && stockStats.isStockedOut
          ? 'border-red-300 dark:border-red-900/60'
          : stockStats && stockStats.expiresBeforeStockout && stockStats.available > 0
          ? 'border-rose-300 dark:border-rose-900/60'
          : stockStats && stockStats.isLowStock
          ? 'border-amber-300 dark:border-amber-900/60'
          : 'border-[#eaedff] dark:border-[#283044] hover:border-[#005c55]/40'
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="relative w-14 h-14 rounded-xl overflow-hidden bg-slate-100 dark:bg-[#283044] shrink-0 shadow-xs">
            {item.photos[0] ? (
              <img
                src={item.photos[0].url}
                alt={item.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-[#005c55] dark:text-[#6df5e1]">
                <span className="material-symbols-outlined text-[20px]">
                  {isMed ? 'pill' : isGrocery ? 'kitchen' : 'inventory_2'}
                </span>
              </div>
            )}

            {docBadge ? (
              <div className="absolute bottom-1 right-1 px-1 rounded bg-[#283044]/90 flex items-center justify-center">
                <span className="text-[8px] font-bold text-white tracking-wider">{docBadge}</span>
              </div>
            ) : (
              <div className="absolute bottom-1 right-1 w-4 h-4 rounded-full bg-white/90 dark:bg-[#131b2e]/90 flex items-center justify-center shadow-xs">
                <span className="material-symbols-outlined text-[10px] text-[#131b2e] dark:text-white">
                  photo_camera
                </span>
              </div>
            )}
          </div>

          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-1.5 mb-0.5">
              <span className="px-1.5 py-0.2 rounded bg-[#eaedff] dark:bg-[#283044] text-[#3e4947] dark:text-[#bdc9c6] text-[10px] uppercase font-bold">
                {item.category}
              </span>
              {item.tag && (
                <span className="px-1.5 py-0.2 rounded bg-[#6df5e1]/40 text-[#006f64] dark:text-[#6df5e1] text-[10px] font-bold">
                  {item.tag}
                </span>
              )}
              <span className="text-[11px] text-[#3e4947] dark:text-[#bdc9c6] truncate">
                {item.storageLocation || item.subCategory}
              </span>
            </div>
            <h3 className="font-bold text-sm text-[#131b2e] dark:text-white truncate">
              {item.name}
            </h3>
            <span className="text-xs text-[#3e4947] dark:text-[#bdc9c6]">
              Exp: {formatDisplayDate(item.expiryDate)}
            </span>
          </div>
        </div>

        <div className="flex flex-col items-end shrink-0 gap-1">
          <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${status.badgeClass}`}>
            {status.label}
          </span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onSelect();
            }}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors"
            aria-label="More options"
          >
            <span className="material-symbols-outlined text-[20px]">more_vert</span>
          </button>
        </div>
      </div>

      {/* Stock Tracking Sub-Card (Medicines & Groceries) */}
      {stockStats && stockStats.hasTracking && (
        <div className="pt-2 border-t border-[#eaedff] dark:border-[#283044] flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                Stock: {stockStats.totalStock} • Consumed: {stockStats.consumed} • Avail:{' '}
                <span className={stockStats.isStockedOut ? 'text-red-600 font-bold' : 'text-[#005c55] dark:text-[#6df5e1] font-bold'}>
                  {stockStats.available} {stockStats.unit}
                </span>
              </span>
            </div>
            <span className="text-[11px] text-slate-500 font-medium">
              {stockStats.dailyDosage} {stockStats.unit}/day
            </span>
          </div>

          {/* Progress bar */}
          <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                stockStats.isStockedOut
                  ? 'bg-red-500 w-full'
                  : stockStats.expiresBeforeStockout && stockStats.available > 0
                  ? 'bg-rose-500'
                  : stockStats.isLowStock
                  ? 'bg-amber-500'
                  : 'bg-[#005c55]'
              }`}
              style={{ width: `${Math.max(4, stockStats.availablePercent)}%` }}
            />
          </div>

          <div className="flex items-center justify-between pt-0.5">
            <div>
              {stockStats.isStockedOut ? (
                <span className="text-[11px] font-bold text-red-600 flex items-center gap-1">
                  <span className="material-symbols-outlined text-[13px]">error</span>
                  Out of Stock! {isGrocery ? 'Restock now' : 'Refill now'}
                </span>
              ) : stockStats.expiresBeforeStockout && stockStats.available > 0 ? (
                <span className="text-[11px] font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1">
                  <span className="material-symbols-outlined text-[13px]">alarm</span>
                  Spoilage risk: expires in {stockStats.daysUntilExpiry}d
                </span>
              ) : stockStats.isLowStock ? (
                <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                  <span className="material-symbols-outlined text-[13px]">warning</span>
                  Low stock: {stockStats.daysOfSupplyLeft} day{stockStats.daysOfSupplyLeft === 1 ? '' : 's'} left
                </span>
              ) : (
                <span className="text-[11px] text-slate-500">
                  {stockStats.daysOfSupplyLeft} days left (until {stockStats.formattedStockoutDate})
                </span>
              )}
            </div>

            <button
              onClick={handleTakeDose}
              disabled={stockStats.available <= 0}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 shadow-xs transition-all active:scale-95 ${
                stockStats.available <= 0
                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  : 'bg-[#005c55] text-white hover:bg-[#0f766e]'
              }`}
            >
              <span className="material-symbols-outlined text-[14px]">
                {isGrocery ? 'restaurant' : 'medication'}
              </span>
              <span>{isGrocery ? `Consume (-${stockStats.dailyDosage})` : 'Take Dose'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
