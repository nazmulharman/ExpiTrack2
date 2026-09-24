import React, { useState } from 'react';
import { ExpiryItem, ItemPhoto, ConsumptionSchedule } from '../types';
import { formatDisplayDate, calculateTimeline, getDaysRemaining } from '../utils/dateUtils';
import { MedicineStockCard } from './MedicineStockCard';

interface ItemDetailViewProps {
  item: ExpiryItem;
  onGoBack: () => void;
  onEditItem: (item: ExpiryItem) => void;
  onUpdateItem?: (item: ExpiryItem) => void;
  onDeleteItem: (id: string) => void;
  onArchiveItem: (item: ExpiryItem) => void;
  onToggleFavorite: (id: string) => void;
  onOpenPhotoViewer: (photo: ItemPhoto) => void;
  onOpenDossier: (item: ExpiryItem) => void;
  showToast: (msg: string, icon?: string) => void;
  onTriggerAlarmPrompt?: (item: ExpiryItem, schedule?: ConsumptionSchedule) => void;
}

export const ItemDetailView: React.FC<ItemDetailViewProps> = ({
  item,
  onGoBack,
  onEditItem,
  onUpdateItem,
  onDeleteItem,
  onArchiveItem,
  onToggleFavorite,
  onOpenPhotoViewer,
  onOpenDossier,
  showToast,
  onTriggerAlarmPrompt,
}) => {
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);
  const [copiedSerial, setCopiedSerial] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const daysRemaining = getDaysRemaining(item.expiryDate);
  const timeline = calculateTimeline(item.purchaseDate, item.expiryDate);
  const currentPhoto = item.photos[activePhotoIndex] || item.photos[0];

  const handleCopySerial = () => {
    if (item.serialNumber) {
      navigator.clipboard.writeText(item.serialNumber).catch(() => {});
      setCopiedSerial(true);
      showToast('Serial copied to clipboard', 'content_copy');
      setTimeout(() => setCopiedSerial(false), 2000);
    }
  };

  const handleFileClaim = () => {
    window.open('https://www.google.com/search?q=' + encodeURIComponent(`${item.name} warranty claim support`), '_blank');
    showToast('Redirecting to manufacturer claim support...', 'open_in_new');
  };

  return (
    <div className="flex flex-col gap-4 pb-28 pt-2">
      {/* Top Utility Context Bar */}
      <div className="flex items-center justify-between pt-1">
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#eaedff] dark:bg-[#283044] text-[#3e4947] dark:text-[#bdc9c6] shadow-xs">
          <span className="material-symbols-outlined text-[16px] text-[#005c55] dark:text-[#6df5e1]" style={{ fontVariationSettings: "'FILL' 1" }}>
            verified
          </span>
          <span className="text-xs font-semibold tracking-wide">Vault ID: {item.vaultId}</span>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => {
              const nextPinned = !item.isPinned;
              if (onUpdateItem) onUpdateItem({ ...item, isPinned: nextPinned });
              showToast(nextPinned ? `Pinned "${item.name}" for quick access` : `Unpinned "${item.name}"`, 'keep');
            }}
            aria-label={item.isPinned ? 'Unpin item' : 'Pin item'}
            title={item.isPinned ? 'Unpin from Dashboard' : 'Pin to Dashboard for quick access'}
            className={`w-10 h-10 flex items-center justify-center rounded-full border transition-transform active:scale-95 shadow-xs ${
              item.isPinned
                ? 'bg-[#005c55] text-white border-[#005c55]'
                : 'bg-white dark:bg-[#131b2e] border-[#eaedff] dark:border-[#283044] text-slate-400 hover:text-[#005c55] hover:bg-[#f2f3ff]'
            }`}
          >
            <span
              className="material-symbols-outlined text-[20px]"
              style={{ fontVariationSettings: item.isPinned ? "'FILL' 1" : "'FILL' 0" }}
            >
              keep
            </span>
          </button>

          <button
            onClick={() => {
              onToggleFavorite(item.id);
              showToast(item.isFavorite ? 'Removed from Favorites' : 'Saved to Favorites', 'favorite');
            }}
            aria-label="Favorite item"
            className="w-10 h-10 flex items-center justify-center rounded-full bg-white dark:bg-[#131b2e] border border-[#eaedff] dark:border-[#283044] text-[#131b2e] dark:text-[#faf8ff] hover:bg-[#f2f3ff] transition-transform active:scale-95 shadow-xs"
          >
            <span
              className={`material-symbols-outlined text-[20px] ${item.isFavorite ? 'text-[#ba1a1a]' : 'text-slate-400'}`}
              style={{ fontVariationSettings: item.isFavorite ? "'FILL' 1" : "'FILL' 0" }}
            >
              favorite
            </span>
          </button>
          
          <button
            onClick={() => onEditItem(item)}
            aria-label="Edit item"
            className="w-10 h-10 flex items-center justify-center rounded-full bg-white dark:bg-[#131b2e] border border-[#eaedff] dark:border-[#283044] text-[#131b2e] dark:text-[#faf8ff] hover:bg-[#f2f3ff] transition-transform active:scale-95 shadow-xs"
            title="Edit item"
          >
            <span className="material-symbols-outlined text-[20px]">edit</span>
          </button>

          <button
            onClick={() => setShowDeleteConfirm(true)}
            aria-label="Delete item"
            className="w-10 h-10 flex items-center justify-center rounded-full bg-white dark:bg-[#131b2e] border border-[#eaedff] dark:border-[#283044] text-red-500 hover:bg-red-50 transition-transform active:scale-95 shadow-xs"
            title="Delete item"
          >
            <span className="material-symbols-outlined text-[20px]">delete</span>
          </button>
        </div>
      </div>

      {/* Title & Category Meta */}
      <div className="flex flex-col space-y-1">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#6df5e1]/40 text-[#006f64] dark:text-[#6df5e1] text-xs font-bold">
            <span className="material-symbols-outlined text-[14px]">
              {item.category === 'medicines' ? 'prescriptions' : item.category === 'groceries' ? 'nutrition' : 'devices'}
            </span>
            {item.subCategory || item.category}
          </span>
          <span className="text-xs text-[#3e4947] dark:text-[#bdc9c6] flex items-center gap-1 font-medium">
            <span className="material-symbols-outlined text-[14px]">
              {item.category === 'warranty' ? 'shield' : item.category === 'medicines' ? 'medication' : item.category === 'groceries' ? 'restaurant' : 'verified'}
            </span>
            {item.category === 'warranty'
              ? 'Warranty & Guarantee'
              : item.category === 'medicines'
              ? 'Pharmacy Expiry Monitored'
              : item.category === 'groceries'
              ? 'Freshness Expiry Monitored'
              : 'Vault Monitored'}
          </span>
        </div>
        <h2 className="text-2xl font-bold text-[#131b2e] dark:text-white leading-tight">
          {item.name}
        </h2>
      </div>

      {/* Photo Carousel & Thumbnails */}
      <div className="relative flex flex-col bg-white dark:bg-[#131b2e] rounded-2xl shadow-sm border border-[#eaedff] dark:border-[#283044] overflow-hidden">
        {/* Main Stage */}
        <div className="relative w-full aspect-[4/3] bg-slate-900 overflow-hidden select-none">
          {currentPhoto ? (
            <img
              src={currentPhoto.url}
              alt={currentPhoto.title}
              className="w-full h-full object-cover transition-all duration-300"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-slate-400">
              <span className="material-symbols-outlined text-[48px]">inventory_2</span>
            </div>
          )}

          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 pointer-events-none"></div>

          {currentPhoto && (
            <div className="absolute top-3 left-3 flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/60 text-white backdrop-blur-md text-xs font-semibold">
              <span className="material-symbols-outlined text-[14px]">
                {currentPhoto.type === 'receipt' ? 'receipt_long' : currentPhoto.type === 'warranty' ? 'verified_user' : 'qr_code_2'}
              </span>
              {currentPhoto.title}
            </div>
          )}

          {/* Floating Controls */}
          <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
            <div
              onClick={() => currentPhoto && onOpenPhotoViewer(currentPhoto)}
              className="flex items-center gap-1 px-3 py-1 rounded-full bg-white/85 text-[#131b2e] backdrop-blur-md text-xs font-bold cursor-pointer hover:bg-white active:scale-95 transition-all shadow-md"
            >
              <span className="material-symbols-outlined text-[16px] text-[#005c55]">pinch</span>
              Pinch to zoom
            </div>

            <button
              onClick={() => currentPhoto && onOpenPhotoViewer(currentPhoto)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-black/75 hover:bg-black text-white backdrop-blur-md text-xs font-bold active:scale-95 transition-all shadow-md"
            >
              <span className="material-symbols-outlined text-[16px]">fullscreen</span>
              View Fullscreen
            </button>
          </div>
        </div>

        {/* Thumbnails Strip */}
        <div className="p-3 bg-white dark:bg-[#131b2e] flex items-center gap-2 overflow-x-auto no-scrollbar">
          {item.photos.map((photo, idx) => (
            <button
              key={photo.id}
              onClick={() => setActivePhotoIndex(idx)}
              className={`relative w-14 h-14 rounded-xl overflow-hidden shrink-0 shadow-xs transition-all outline-none ${
                activePhotoIndex === idx
                  ? 'ring-2 ring-[#005c55] scale-105 opacity-100'
                  : 'opacity-60 hover:opacity-100'
              }`}
            >
              <img src={photo.url} alt={photo.title} className="w-full h-full object-cover" />
              {activePhotoIndex === idx && (
                <div className="absolute inset-0 bg-[#005c55]/20 flex items-center justify-center">
                  <span className="w-2 h-2 rounded-full bg-[#005c55]"></span>
                </div>
              )}
            </button>
          ))}

          <button
            onClick={() => onEditItem(item)}
            className="w-14 h-14 rounded-xl bg-[#f2f3ff] dark:bg-[#283044] flex flex-col items-center justify-center text-[#3e4947] dark:text-[#bdc9c6] hover:bg-[#eaedff] active:scale-95 transition-all shrink-0"
            title="Attach another document or photo"
          >
            <span className="material-symbols-outlined text-[20px] text-[#005c55] dark:text-[#6df5e1]">add_a_photo</span>
            <span className="text-[10px] font-bold mt-0.5">Add</span>
          </button>
        </div>
      </div>

      {/* Expiry & Urgency Banner */}
      <div className="bg-white dark:bg-[#131b2e] rounded-2xl p-4 shadow-sm border border-[#eaedff] dark:border-[#283044] space-y-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <span className="text-xs font-bold uppercase tracking-wider text-[#3e4947] dark:text-[#bdc9c6]">
              {item.category === 'warranty' ? 'Coverage Window' : 'Expiration Window'}
            </span>
            <div className="flex items-baseline gap-2">
              <span className={`text-3xl font-extrabold ${daysRemaining <= 7 ? 'text-[#ba1a1a]' : 'text-[#005c55] dark:text-[#6df5e1]'}`}>
                {daysRemaining < 0 ? Math.abs(daysRemaining) : daysRemaining}
              </span>
              <span className={`text-base font-bold ${daysRemaining <= 7 ? 'text-[#ba1a1a]' : 'text-[#005c55] dark:text-[#6df5e1]'}`}>
                {daysRemaining < 0
                  ? (item.category === 'groceries' || item.category === 'medicines' ? 'Days Expired' : 'Days Past Expiry')
                  : (item.category === 'groceries' || item.category === 'medicines' ? 'Days Until Expiry' : 'Days Remaining')}
              </span>
            </div>
          </div>

          <div className="flex flex-col items-end gap-1">
            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${
              daysRemaining <= 7 ? 'bg-[#ffdad6] text-[#ba1a1a]' : 'bg-[#eaedff] text-[#005c55]'
            }`}>
              <span className="material-symbols-outlined text-[14px]">timer</span>
              {daysRemaining <= 0
                ? 'Expired'
                : daysRemaining <= 7
                ? 'Expires Soon'
                : item.category === 'groceries' || item.category === 'medicines'
                ? 'Fresh & Valid'
                : 'Active Window'}
            </span>
            <span className="text-xs text-[#3e4947] dark:text-[#bdc9c6] font-medium">
              {formatDisplayDate(item.expiryDate)}
            </span>
          </div>
        </div>

        {/* Timeline visual meter */}
        <div className="space-y-1.5 pt-1">
          <div className="w-full bg-[#eaedff] dark:bg-[#283044] h-2.5 rounded-full overflow-hidden flex">
            <div
              className={`h-full rounded-full transition-all duration-700 ${
                timeline.percentage > 90 ? 'bg-[#ba1a1a]' : 'bg-[#0f766e]'
              }`}
              style={{ width: `${timeline.percentage}%` }}
            ></div>
          </div>
          <div className="flex justify-between text-xs text-[#3e4947] dark:text-[#bdc9c6]">
            <span>Purchased: {formatDisplayDate(item.purchaseDate)}</span>
            <span className="font-semibold text-[#ba1a1a]">
              {timeline.lapsedDays} of {timeline.totalDurationDays} Days Lapsed
            </span>
          </div>
        </div>

        {/* Warning Callout Banner */}
        <div className="flex items-start gap-2.5 p-3 rounded-xl bg-[#f2f3ff] dark:bg-[#283044] text-[#131b2e] dark:text-white">
          <span className="material-symbols-outlined text-[#006fa8] text-[20px] shrink-0 mt-0.5" style={{ fontVariationSettings: "'FILL' 1" }}>
            warning_amber
          </span>
          <p className="text-xs leading-relaxed">
            {item.category === 'warranty'
              ? 'Action recommended: File any ear-cushion or hinge claims before coverage closes.'
              : item.category === 'medicines'
              ? 'Safety check: Dispose of any expired medicines according to FDA or local pharmacy guidelines.'
              : 'Pantry check: Plan to use this item in recipes before best-by date to avoid spoilage.'}
          </p>
        </div>
      </div>

      {/* Stock, Consumed, Available, Daily Consumption Rate & Dual Stockout/Expiry Alerts */}
      {(item.category === 'medicines' || item.category === 'groceries' || item.initialStock !== undefined || item.remainingStock !== undefined) && (
        <MedicineStockCard
          item={item}
          onUpdateItem={onUpdateItem || onEditItem}
          showToast={showToast}
          variant="full"
          onTriggerAlarmPrompt={onTriggerAlarmPrompt}
        />
      )}

      {/* Vault Records & Coverage Grid */}
      <div className="bg-white dark:bg-[#131b2e] rounded-2xl p-4 shadow-sm border border-[#eaedff] dark:border-[#283044] space-y-3">
        <h3 className="font-bold text-sm text-[#131b2e] dark:text-white flex items-center justify-between">
          <span>{item.category === 'warranty' ? 'Vault Records & Coverage' : 'Vault Records & Expiry Details'}</span>
          <span className="material-symbols-outlined text-[18px] text-slate-400">tune</span>
        </h3>

        <div className="grid grid-cols-2 gap-2.5">
          {/* Vendor */}
          <div className="p-3 rounded-xl bg-[#f2f3ff] dark:bg-[#283044] flex flex-col justify-between space-y-1">
            <span className="text-xs text-[#3e4947] dark:text-[#bdc9c6] flex items-center gap-1">
              <span className="material-symbols-outlined text-[15px]">storefront</span>
              Vendor
            </span>
            <span className="text-sm font-bold text-[#131b2e] dark:text-white truncate">
              {item.vendor || 'Authorized Retailer'}
            </span>
          </div>

          {/* Date of Purchase */}
          <div className="p-3 rounded-xl bg-[#f2f3ff] dark:bg-[#283044] flex flex-col justify-between space-y-1">
            <span className="text-xs text-[#3e4947] dark:text-[#bdc9c6] flex items-center gap-1">
              <span className="material-symbols-outlined text-[15px]">event</span>
              Date of Purchase
            </span>
            <span className="text-sm font-bold text-[#131b2e] dark:text-white">
              {formatDisplayDate(item.purchaseDate)}
            </span>
          </div>

          {/* Medicine Stock & Consumption Rate Info */}
          {(item.category === 'medicines' || item.remainingStock !== undefined || item.dailyDosage !== undefined) && (
            <>
              {/* Remaining Stock */}
              <div className="p-3 rounded-xl bg-[#f2f3ff] dark:bg-[#283044] flex flex-col justify-between space-y-1">
                <span className="text-xs text-[#3e4947] dark:text-[#bdc9c6] flex items-center gap-1">
                  <span className="material-symbols-outlined text-[15px] text-[#005c55] dark:text-[#6df5e1]">inventory_2</span>
                  Remaining Stock
                </span>
                <div className="flex items-baseline justify-between">
                  <span className="text-sm font-black text-[#005c55] dark:text-[#6df5e1]">
                    {item.remainingStock ?? (item.currentStock ?? Math.max(0, (item.initialStock ?? 30) - (item.consumedUnits ?? 0)))} {item.unitType || 'tablets'}
                  </span>
                  <span className="text-[10px] text-slate-400">Available</span>
                </div>
              </div>

              {/* Daily Dosage / Consumption Rate */}
              <div className="p-3 rounded-xl bg-[#f2f3ff] dark:bg-[#283044] flex flex-col justify-between space-y-1">
                <span className="text-xs text-[#3e4947] dark:text-[#bdc9c6] flex items-center gap-1">
                  <span className="material-symbols-outlined text-[15px] text-[#005c55] dark:text-[#6df5e1]">schedule</span>
                  Daily Consumption Rate
                </span>
                <div className="flex items-baseline justify-between">
                  <span className="text-sm font-black text-[#131b2e] dark:text-white">
                    {item.dailyDosage ?? 1} {item.unitType || 'tablets'} / day
                  </span>
                  <span className="text-[10px] text-slate-400">Daily rate</span>
                </div>
              </div>
            </>
          )}

          {/* Serial & Copy Trigger */}
          {item.serialNumber && (
            <div className="col-span-2 p-3 rounded-xl bg-[#f2f3ff] dark:bg-[#283044] flex items-center justify-between">
              <div className="flex flex-col min-w-0 pr-2">
                <span className="text-xs text-[#3e4947] dark:text-[#bdc9c6] flex items-center gap-1">
                  <span className="material-symbols-outlined text-[15px]">fingerprint</span>
                  Serial / Model ID
                </span>
                <span className="text-sm font-bold font-mono text-[#131b2e] dark:text-white truncate">
                  SN: {item.serialNumber}
                </span>
              </div>
              <button
                onClick={handleCopySerial}
                className="px-3 py-1.5 rounded-lg bg-white dark:bg-[#131b2e] hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold text-[#131b2e] dark:text-white flex items-center gap-1 active:scale-95 transition-all shadow-xs shrink-0"
              >
                <span className="material-symbols-outlined text-[16px] text-[#005c55]">
                  {copiedSerial ? 'done' : 'content_copy'}
                </span>
                <span>{copiedSerial ? 'Copied!' : 'Copy'}</span>
              </button>
            </div>
          )}

          {/* Protection Scope - Only for warranty items */}
          {item.category === 'warranty' && item.protectionScope && (
            <div className="col-span-2 p-3 rounded-xl bg-[#f2f3ff] dark:bg-[#283044] flex flex-col space-y-1">
              <span className="text-xs text-[#3e4947] dark:text-[#bdc9c6] flex items-center gap-1">
                <span className="material-symbols-outlined text-[15px]">security</span>
                Protection Scope
              </span>
              <span className="text-xs font-semibold text-[#131b2e] dark:text-white leading-relaxed">
                {item.protectionScope}
              </span>
            </div>
          )}

          {/* Cloud Sync Status */}
          <div className="col-span-2 p-3 rounded-xl bg-[#f2f3ff] dark:bg-[#283044] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-[#6df5e1]/40 flex items-center justify-center text-[#006f64] shrink-0">
                <span className="material-symbols-outlined text-[18px]">cloud_done</span>
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-bold text-[#131b2e] dark:text-white">Google Drive Sync</span>
                <span className="text-[11px] text-[#3e4947] dark:text-[#bdc9c6]">Encrypted backup verified</span>
              </div>
            </div>
            <span className="material-symbols-outlined text-[#005c55] text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>
              check_circle
            </span>
          </div>
        </div>
      </div>

      {/* Smart Alert Triggers */}
      <div className="bg-white dark:bg-[#131b2e] rounded-2xl p-4 shadow-sm border border-[#eaedff] dark:border-[#283044] space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#005c55] text-[20px]">notifications_active</span>
            <h3 className="font-bold text-sm text-[#131b2e] dark:text-white">Smart Alert Triggers</h3>
          </div>
          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[#eaedff] dark:bg-[#283044] text-[#3e4947] dark:text-[#bdc9c6]">
            3 Milestones
          </span>
        </div>

        <div className="space-y-2">
          {/* Milestone 1: 30 Days */}
          <div className="p-3 rounded-xl bg-[#f2f3ff] dark:bg-[#283044] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-[#005c55] text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                check_circle
              </span>
              <div className="flex flex-col">
                <span className="text-xs font-bold text-[#131b2e] dark:text-white">30-Day Warning</span>
                <span className="text-[11px] text-[#3e4947] dark:text-[#bdc9c6]">Dispatched • Push & Email</span>
              </div>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#9cf2e8] text-[#00504a]">
              Sent
            </span>
          </div>

          {/* Milestone 2: 7 Days */}
          <div className="p-3 rounded-xl bg-[#f2f3ff] dark:bg-[#283044] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-slate-400 text-[20px]">schedule</span>
              <div className="flex flex-col">
                <span className="text-xs font-bold text-[#131b2e] dark:text-white">7-Day Final Warning</span>
                <span className="text-[11px] text-[#3e4947] dark:text-[#bdc9c6]">Scheduled before deadline</span>
              </div>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#eaedff] dark:bg-slate-700 text-[#3e4947] dark:text-[#bdc9c6]">
              Pending
            </span>
          </div>

          {/* Milestone 3: 1 Day */}
          <div className="p-3 rounded-xl bg-[#f2f3ff] dark:bg-[#283044] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-slate-400 text-[20px]">notification_important</span>
              <div className="flex flex-col">
                <span className="text-xs font-bold text-[#131b2e] dark:text-white">1-Day Critical Alert</span>
                <span className="text-[11px] text-[#3e4947] dark:text-[#bdc9c6]">Scheduled for eve of expiry</span>
              </div>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#eaedff] dark:bg-slate-700 text-[#3e4947] dark:text-[#bdc9c6]">
              Pending
            </span>
          </div>
        </div>
      </div>

      {/* Notes & Caveats */}
      {item.notes && (
        <div className="bg-white dark:bg-[#131b2e] rounded-2xl p-4 shadow-sm border border-[#eaedff] dark:border-[#283044] space-y-2">
          <div className="flex items-center gap-1.5 text-[#131b2e] dark:text-white">
            <span className="material-symbols-outlined text-[18px] text-[#005c55]">sticky_note_2</span>
            <h3 className="font-bold text-sm">Attached Note</h3>
          </div>
          <div className="p-3 rounded-xl bg-[#f2f3ff] dark:bg-[#283044] text-[#3e4947] dark:text-[#bdc9c6] text-xs leading-relaxed">
            "{item.notes}"
          </div>
        </div>
      )}

      {/* Action Buttons Bar */}
      <div className="flex flex-col space-y-2.5 pt-2">
        {/* Primary CTA */}
        {item.category === 'warranty' && (
          <button
            onClick={handleFileClaim}
            className="w-full h-12 rounded-xl bg-[#0f766e] hover:bg-[#005c55] text-white font-bold text-sm flex items-center justify-center gap-2 shadow-md active:scale-[0.98] transition-all"
          >
            <span>Extend Warranty / File Claim</span>
            <span className="material-symbols-outlined text-[18px]">open_in_new</span>
          </button>
        )}

        {/* Mark Resolved / Used */}
        <button
          onClick={() => {
            onArchiveItem(item);
            showToast('Item moved to Vault Archive', 'inventory_2');
            onGoBack();
          }}
          className="w-full h-12 rounded-xl bg-[#eaedff] dark:bg-[#283044] hover:bg-[#dae2fd] text-[#131b2e] dark:text-white font-bold text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
        >
          <span className="material-symbols-outlined text-[20px] text-[#005c55]">done_all</span>
          <span>
            {item.category === 'groceries'
              ? 'Mark Consumed / Finished'
              : item.category === 'medicines'
              ? 'Mark Course Finished / Used'
              : 'Mark as Used / Resolved'}
          </span>
        </button>

        {/* Export Proof PDF */}
        <button
          onClick={() => onOpenDossier(item)}
          className="w-full h-12 rounded-xl bg-white dark:bg-[#131b2e] border border-[#eaedff] dark:border-[#283044] hover:bg-slate-50 text-[#131b2e] dark:text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-xs active:scale-[0.98] transition-all"
        >
          <span className="material-symbols-outlined text-[20px] text-[#006fa8]">picture_as_pdf</span>
          <span>
            {item.category === 'groceries'
              ? 'Export Grocery Receipt Proof (PDF)'
              : item.category === 'medicines'
              ? 'Export Prescription Medical Proof (PDF)'
              : 'Export Proof (PDF Receipt)'}
          </span>
        </button>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#131b2e] max-w-sm w-full p-5 rounded-2xl shadow-2xl space-y-4">
            <h3 className="font-bold text-base text-[#131b2e] dark:text-white">Delete this item?</h3>
            <p className="text-xs text-[#3e4947] dark:text-[#bdc9c6]">
              Are you sure you want to permanently delete "{item.name}" and all attached receipt proofs?
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  onDeleteItem(item.id);
                  onGoBack();
                }}
                className="px-4 py-2 rounded-xl bg-red-600 text-white text-xs font-bold hover:bg-red-700"
              >
                Delete Permanently
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
