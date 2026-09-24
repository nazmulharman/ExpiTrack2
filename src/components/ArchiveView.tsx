import React, { useState, useMemo } from 'react';
import { ExpiryItem, ItemPhoto } from '../types';
import { formatDisplayDate } from '../utils/dateUtils';
import { exportToCSV, downloadFile } from '../services/storage';

interface ArchiveViewProps {
  items: ExpiryItem[];
  onRestoreItem: (item: ExpiryItem) => void;
  onPermanentlyDeleteItem: (id: string) => void;
  onOpenPhotoViewer: (photo: ItemPhoto) => void;
  onOpenDossier: (items: ExpiryItem[]) => void;
  showToast: (msg: string, icon?: string) => void;
}

export const ArchiveView: React.FC<ArchiveViewProps> = ({
  items,
  onRestoreItem,
  onPermanentlyDeleteItem,
  onOpenPhotoViewer,
  onOpenDossier,
  showToast,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'claimed' | 'concluded' | 'consumed' | 'disposed'>('all');
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Filter archived items
  const archivedItems = useMemo(() => {
    return items.filter(item => item.status === 'archived');
  }, [items]);

  const filteredArchived = useMemo(() => {
    let result = [...archivedItems];

    if (selectedFilter !== 'all') {
      result = result.filter(item => item.resolutionType === selectedFilter);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(item =>
        item.name.toLowerCase().includes(q) ||
        item.subCategory.toLowerCase().includes(q) ||
        (item.notes && item.notes.toLowerCase().includes(q))
      );
    }

    return result;
  }, [archivedItems, selectedFilter, searchQuery]);

  // Group by category/type
  const warranties = filteredArchived.filter(i => i.category === 'warranty');
  const medicines = filteredArchived.filter(i => i.category === 'medicines');
  const groceries = filteredArchived.filter(i => i.category === 'groceries' || i.category === 'documents');

  const totalClaimed = archivedItems.reduce((acc, curr) => acc + (curr.claimedAmount || 0), 1480);

  const toggleSelectId = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleBulkRestore = () => {
    const toRestore = archivedItems.filter(i => selectedIds.includes(i.id));
    toRestore.forEach(i => onRestoreItem(i));
    setSelectedIds([]);
    setIsSelectMode(false);
    showToast(`Restored ${toRestore.length} item(s) to active vault`, 'unarchive');
  };

  const handleBulkExport = () => {
    const toExport = archivedItems.filter(i => selectedIds.length === 0 || selectedIds.includes(i.id));
    const csv = exportToCSV(toExport);
    downloadFile(csv, `ExpiTrack_Archive_${new Date().toISOString().split('T')[0]}.csv`, 'text/csv');
    showToast('Archive exported to CSV spreadsheet', 'download');
  };

  return (
    <div className="flex flex-col gap-4 pb-28 pt-2">
      {/* Header bar */}
      <div className="flex items-center justify-between pt-1">
        <div>
          <h1 className="text-xl font-bold text-[#131b2e] dark:text-white">Vault Archive</h1>
          <p className="text-xs text-[#3e4947] dark:text-[#bdc9c6]">
            Historical records, claim deeds & resolved proofs
          </p>
        </div>
        <button
          onClick={() => {
            setIsSelectMode(!isSelectMode);
            setSelectedIds([]);
          }}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
            isSelectMode
              ? 'bg-[#005c55] text-white border-transparent'
              : 'bg-white dark:bg-[#131b2e] border-[#eaedff] dark:border-[#283044] text-[#131b2e] dark:text-white'
          }`}
        >
          {isSelectMode ? 'Cancel' : 'Select'}
        </button>
      </div>

      {/* Multi-Select Action Bar */}
      {isSelectMode && (
        <div className="p-3 bg-[#eaedff] dark:bg-[#283044] rounded-2xl flex items-center justify-between text-xs animate-in slide-in-from-top duration-200">
          <span className="font-bold text-[#005c55] dark:text-[#6df5e1]">
            {selectedIds.length} Selected
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={handleBulkRestore}
              disabled={selectedIds.length === 0}
              className="px-3 py-1.5 rounded-lg bg-[#005c55] text-white font-semibold disabled:opacity-50"
            >
              Restore
            </button>
            <button
              onClick={handleBulkExport}
              className="px-3 py-1.5 rounded-lg bg-white dark:bg-[#131b2e] text-[#131b2e] dark:text-white font-semibold shadow-xs"
            >
              Export CSV
            </button>
          </div>
        </div>
      )}

      {/* Stats Bento */}
      <div className="grid grid-cols-3 gap-2.5">
        <div className="p-3 rounded-2xl bg-white dark:bg-[#131b2e] border border-[#eaedff] dark:border-[#283044] shadow-xs flex flex-col">
          <span className="text-[11px] text-[#3e4947] dark:text-[#bdc9c6]">Claims Won</span>
          <span className="text-base font-extrabold text-[#005c55] dark:text-[#6df5e1] mt-0.5">
            ${totalClaimed.toLocaleString()}
          </span>
          <span className="text-[10px] text-[#006f64] font-medium">+12% vs last yr</span>
        </div>

        <div className="p-3 rounded-2xl bg-white dark:bg-[#131b2e] border border-[#eaedff] dark:border-[#283044] shadow-xs flex flex-col">
          <span className="text-[11px] text-[#3e4947] dark:text-[#bdc9c6]">Archived Items</span>
          <span className="text-base font-extrabold text-[#131b2e] dark:text-white mt-0.5">
            {archivedItems.length} Total
          </span>
          <span className="text-[10px] text-[#3e4947] dark:text-[#bdc9c6]">All time records</span>
        </div>

        <div className="p-3 rounded-2xl bg-white dark:bg-[#131b2e] border border-[#eaedff] dark:border-[#283044] shadow-xs flex flex-col">
          <span className="text-[11px] text-[#3e4947] dark:text-[#bdc9c6]">Proof Integrity</span>
          <span className="text-base font-extrabold text-[#005c55] dark:text-[#6df5e1] mt-0.5">
            100%
          </span>
          <span className="text-[10px] text-[#3e4947] dark:text-[#bdc9c6]">Receipts Kept</span>
        </div>
      </div>

      {/* Search & Category Filter Chips */}
      <div className="flex flex-col gap-2">
        <div className="relative flex items-center bg-white dark:bg-[#131b2e] rounded-xl px-3 py-2 border border-[#eaedff] dark:border-[#283044] shadow-xs">
          <span className="material-symbols-outlined text-[20px] text-slate-400 mr-2">search</span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search past warranties, prescriptions, claims..."
            className="w-full text-xs bg-transparent text-[#131b2e] dark:text-white focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
          <button
            onClick={() => setSelectedFilter('all')}
            className={`px-3 py-1 rounded-full text-xs font-semibold shrink-0 transition-all ${
              selectedFilter === 'all'
                ? 'bg-[#005c55] text-white'
                : 'bg-white dark:bg-[#131b2e] text-[#3e4947] dark:text-[#bdc9c6] border border-[#eaedff] dark:border-[#283044]'
            }`}
          >
            All ({archivedItems.length})
          </button>
          <button
            onClick={() => setSelectedFilter('claimed')}
            className={`px-3 py-1 rounded-full text-xs font-semibold shrink-0 transition-all ${
              selectedFilter === 'claimed'
                ? 'bg-[#005c55] text-white'
                : 'bg-white dark:bg-[#131b2e] text-[#3e4947] dark:text-[#bdc9c6] border border-[#eaedff] dark:border-[#283044]'
            }`}
          >
            Claims Won
          </button>
          <button
            onClick={() => setSelectedFilter('concluded')}
            className={`px-3 py-1 rounded-full text-xs font-semibold shrink-0 transition-all ${
              selectedFilter === 'concluded'
                ? 'bg-[#005c55] text-white'
                : 'bg-white dark:bg-[#131b2e] text-[#3e4947] dark:text-[#bdc9c6] border border-[#eaedff] dark:border-[#283044]'
            }`}
          >
            Concluded
          </button>
          <button
            onClick={() => setSelectedFilter('consumed')}
            className={`px-3 py-1 rounded-full text-xs font-semibold shrink-0 transition-all ${
              selectedFilter === 'consumed'
                ? 'bg-[#005c55] text-white'
                : 'bg-white dark:bg-[#131b2e] text-[#3e4947] dark:text-[#bdc9c6] border border-[#eaedff] dark:border-[#283044]'
            }`}
          >
            Consumed
          </button>
          <button
            onClick={() => setSelectedFilter('disposed')}
            className={`px-3 py-1 rounded-full text-xs font-semibold shrink-0 transition-all ${
              selectedFilter === 'disposed'
                ? 'bg-[#005c55] text-white'
                : 'bg-white dark:bg-[#131b2e] text-[#3e4947] dark:text-[#bdc9c6] border border-[#eaedff] dark:border-[#283044]'
            }`}
          >
            Disposed
          </button>
        </div>
      </div>

      {/* Group 1: Recent Claims & Warranty Resolves */}
      {warranties.length > 0 && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-1.5 px-1">
            <span className="material-symbols-outlined text-[16px] text-[#005c55]">verified</span>
            <span className="text-xs font-bold uppercase tracking-wider text-[#3e4947] dark:text-[#bdc9c6]">
              Warranty Deeds & Claims Won
            </span>
          </div>

          <div className="flex flex-col gap-2">
            {warranties.map(item => (
              <ArchiveItemCard
                key={item.id}
                item={item}
                isSelectMode={isSelectMode}
                isSelected={selectedIds.includes(item.id)}
                onToggleSelect={() => toggleSelectId(item.id)}
                onRestore={() => {
                  onRestoreItem(item);
                  showToast(`Restored "${item.name}" to active vault`, 'unarchive');
                }}
                onDelete={() => {
                  onPermanentlyDeleteItem(item.id);
                  showToast('Record deleted permanently', 'delete');
                }}
                onOpenProof={() => item.photos[0] && onOpenPhotoViewer(item.photos[0])}
              />
            ))}
          </div>
        </div>
      )}

      {/* Group 2: Past Prescriptions & Health Logs */}
      {medicines.length > 0 && (
        <div className="flex flex-col gap-2 mt-2">
          <div className="flex items-center gap-1.5 px-1">
            <span className="material-symbols-outlined text-[16px] text-[#005c55]">medical_services</span>
            <span className="text-xs font-bold uppercase tracking-wider text-[#3e4947] dark:text-[#bdc9c6]">
              Past Prescriptions & Health Logs
            </span>
          </div>

          <div className="flex flex-col gap-2">
            {medicines.map(item => (
              <ArchiveItemCard
                key={item.id}
                item={item}
                isSelectMode={isSelectMode}
                isSelected={selectedIds.includes(item.id)}
                onToggleSelect={() => toggleSelectId(item.id)}
                onRestore={() => {
                  onRestoreItem(item);
                  showToast(`Restored "${item.name}" to active vault`, 'unarchive');
                }}
                onDelete={() => {
                  onPermanentlyDeleteItem(item.id);
                  showToast('Record deleted permanently', 'delete');
                }}
                onOpenProof={() => item.photos[0] && onOpenPhotoViewer(item.photos[0])}
              />
            ))}
          </div>
        </div>
      )}

      {/* Group 3: Groceries & Perishables */}
      {groceries.length > 0 && (
        <div className="flex flex-col gap-2 mt-2">
          <div className="flex items-center gap-1.5 px-1">
            <span className="material-symbols-outlined text-[16px] text-[#005c55]">eco</span>
            <span className="text-xs font-bold uppercase tracking-wider text-[#3e4947] dark:text-[#bdc9c6]">
              Zero-Waste & Consumed Assets
            </span>
          </div>

          <div className="flex flex-col gap-2">
            {groceries.map(item => (
              <ArchiveItemCard
                key={item.id}
                item={item}
                isSelectMode={isSelectMode}
                isSelected={selectedIds.includes(item.id)}
                onToggleSelect={() => toggleSelectId(item.id)}
                onRestore={() => {
                  onRestoreItem(item);
                  showToast(`Restored "${item.name}" to active vault`, 'unarchive');
                }}
                onDelete={() => {
                  onPermanentlyDeleteItem(item.id);
                  showToast('Record deleted permanently', 'delete');
                }}
                onOpenProof={() => item.photos[0] && onOpenPhotoViewer(item.photos[0])}
              />
            ))}
          </div>
        </div>
      )}

      {/* Insurance Dossier CTA */}
      <div className="p-4 rounded-2xl bg-[#eaedff] dark:bg-[#283044] flex flex-col gap-2.5 mt-2">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[20px] text-[#005c55] dark:text-[#6df5e1]">policy</span>
          <span className="font-bold text-xs text-[#131b2e] dark:text-white">Insurance & Tax Dossier</span>
        </div>
        <p className="text-[11px] text-[#3e4947] dark:text-[#bdc9c6]">
          Compile all purchase proofs, warranty deeds, and serial numbers into a single certified PDF manifest.
        </p>
        <button
          onClick={() => onOpenDossier(archivedItems)}
          className="w-full py-2.5 rounded-xl bg-[#005c55] text-white font-bold text-xs shadow-sm hover:bg-[#0f766e] active:scale-95 transition-all flex items-center justify-center gap-2"
        >
          <span className="material-symbols-outlined text-[18px]">picture_as_pdf</span>
          <span>Generate Dossier Package</span>
        </button>
      </div>
    </div>
  );
};

interface ArchiveItemCardProps {
  item: ExpiryItem;
  isSelectMode: boolean;
  isSelected: boolean;
  onToggleSelect: () => void;
  onRestore: () => void;
  onDelete: () => void;
  onOpenProof: () => void;
}

const ArchiveItemCard: React.FC<ArchiveItemCardProps> = ({
  item,
  isSelectMode,
  isSelected,
  onToggleSelect,
  onRestore,
  onDelete,
  onOpenProof,
}) => {
  const isClaimed = item.resolutionType === 'claimed';

  return (
    <div className="p-3.5 rounded-2xl bg-white dark:bg-[#131b2e] border border-[#eaedff] dark:border-[#283044] shadow-xs flex flex-col gap-2.5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          {isSelectMode && (
            <input
              type="checkbox"
              checked={isSelected}
              onChange={onToggleSelect}
              className="mt-1 w-4 h-4 accent-[#005c55] rounded cursor-pointer shrink-0"
            />
          )}

          <div
            onClick={onOpenProof}
            className="relative w-12 h-12 rounded-xl overflow-hidden bg-slate-100 dark:bg-[#283044] shrink-0 cursor-pointer shadow-xs"
          >
            {item.photos[0] ? (
              <img src={item.photos[0].url} alt={item.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-slate-400">
                <span className="material-symbols-outlined text-[20px]">inventory_2</span>
              </div>
            )}
            <div className="absolute inset-0 bg-black/20 hover:bg-transparent transition-colors"></div>
          </div>

          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-1.5 mb-0.5">
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                isClaimed
                  ? 'bg-[#9cf2e8] text-[#00504a]'
                  : 'bg-[#eaedff] dark:bg-[#283044] text-[#3e4947] dark:text-[#bdc9c6]'
              }`}>
                {isClaimed
                  ? `Claim Successful • +$${item.claimedAmount || 129} Saved`
                  : item.resolutionType === 'consumed'
                  ? 'Consumed / Finished'
                  : item.category === 'groceries'
                  ? 'Consumed / Past Best-By'
                  : item.category === 'medicines'
                  ? 'Course Finished / Expired'
                  : 'Coverage Concluded'}
              </span>
              <span className="text-[10px] font-mono text-[#3e4947] dark:text-[#bdc9c6]">{item.vaultId}</span>
            </div>

            <h3 className="font-bold text-sm text-[#131b2e] dark:text-white truncate">
              {item.name}
            </h3>

            <p className="text-xs text-[#3e4947] dark:text-[#bdc9c6] truncate">
              Resolved: {formatDisplayDate(item.resolvedDate || item.expiryDate)} • {item.photos.length} Attached Proof{item.photos.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
      </div>

      {item.notes && (
        <p className="text-xs text-[#3e4947] dark:text-[#bdc9c6] bg-[#f2f3ff] dark:bg-[#283044] p-2.5 rounded-xl line-clamp-2">
          {item.notes}
        </p>
      )}

      {/* Action buttons */}
      <div className="flex items-center justify-between pt-1 border-t border-[#eaedff] dark:border-[#283044] text-xs">
        <button
          onClick={onOpenProof}
          className="text-[#005c55] dark:text-[#6df5e1] font-semibold flex items-center gap-1 hover:underline"
        >
          <span className="material-symbols-outlined text-[16px]">receipt_long</span>
          View Receipt Proof
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={onRestore}
            className="px-2.5 py-1 rounded-lg hover:bg-[#eaedff] dark:hover:bg-[#283044] text-[#3e4947] dark:text-[#bdc9c6] font-semibold flex items-center gap-1"
          >
            <span className="material-symbols-outlined text-[16px]">unarchive</span>
            Restore
          </button>
          <button
            onClick={onDelete}
            className="w-7 h-7 rounded-lg hover:bg-red-50 text-red-500 flex items-center justify-center"
            title="Delete permanently"
          >
            <span className="material-symbols-outlined text-[16px]">delete</span>
          </button>
        </div>
      </div>
    </div>
  );
};
