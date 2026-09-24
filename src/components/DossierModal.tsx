import React from 'react';
import { ExpiryItem } from '../types';
import { formatDisplayDate } from '../utils/dateUtils';

interface DossierModalProps {
  items: ExpiryItem[];
  singleItem?: ExpiryItem;
  onClose: () => void;
}

export const DossierModal: React.FC<DossierModalProps> = ({ items, singleItem, onClose }) => {
  const displayItems = singleItem ? [singleItem] : items;
  const totalValue = displayItems.reduce((acc, item) => acc + (item.category === 'warranty' ? 450 : 25), 0);
  const hasWarranty = displayItems.some(i => i.category === 'warranty');
  const isAllMed = displayItems.length > 0 && displayItems.every(i => i.category === 'medicines');
  const isAllGrocery = displayItems.length > 0 && displayItems.every(i => i.category === 'groceries');

  const dossierTitle = singleItem
    ? singleItem.category === 'groceries'
      ? 'Grocery Freshness & Receipt Record'
      : singleItem.category === 'medicines'
      ? 'Prescription & Pharmacy Expiry Record'
      : singleItem.category === 'warranty'
      ? 'Insurance & Warranty Claim Package'
      : 'Official Vault Document Dossier'
    : isAllMed
    ? 'Certified Prescription & Medical Expiry Dossier'
    : isAllGrocery
    ? 'Certified Grocery & Pantry Expiry Manifest'
    : hasWarranty
    ? 'Insurance & Warranty Claim Package'
    : 'Certified Vault Expiry Manifest';

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white dark:bg-[#131b2e] w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden my-8 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-4 sm:p-6 bg-gradient-to-r from-[#0f766e] to-[#005c55] text-white flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center text-[#6df5e1]">
              <span className="material-symbols-outlined text-[28px]">policy</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase font-bold tracking-wider text-[#a3faef]">Official Vault Dossier</span>
                <span className="px-2 py-0.5 rounded-full bg-white/20 text-[10px] font-bold">AES-256 Verified</span>
              </div>
              <h2 className="text-xl font-bold tracking-tight mt-0.5">{dossierTitle}</h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Content body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1 text-[#131b2e] dark:text-[#faf8ff]">
          <div className="p-3.5 rounded-xl bg-[#f2f3ff] dark:bg-[#283044] flex items-center justify-between text-xs">
            <div className="flex flex-col">
              <span className="text-[#3e4947] dark:text-[#bdc9c6]">Repository Owner</span>
              <strong className="text-sm font-semibold">Sarah Jenkins • Household Vault #01</strong>
            </div>
            <div className="flex flex-col text-right">
              <span className="text-[#3e4947] dark:text-[#bdc9c6]">Certified On</span>
              <span className="font-mono font-medium">{new Date().toLocaleDateString()}</span>
            </div>
          </div>

          <div className="border border-[#eaedff] dark:border-[#283044] rounded-xl overflow-hidden">
            <div className="bg-[#eaedff] dark:bg-[#283044] px-4 py-2 font-bold text-xs uppercase tracking-wider text-[#3e4947] dark:text-[#bdc9c6] flex justify-between">
              <span>{hasWarranty ? 'Item & Claim Details' : 'Item & Expiry Details'}</span>
              <span>Serial / Proof</span>
            </div>
            <div className="divide-y divide-[#eaedff] dark:divide-[#283044]">
              {displayItems.map((item) => (
                <div key={item.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start gap-3">
                    {item.photos[0] ? (
                      <img
                        src={item.photos[0].url}
                        alt={item.name}
                        className="w-12 h-12 rounded-lg object-cover bg-slate-100 shrink-0"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-[#f2f3ff] flex items-center justify-center text-[#005c55]">
                        <span className="material-symbols-outlined text-[20px]">shield</span>
                      </div>
                    )}
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="px-1.5 py-0.5 rounded text-[10px] uppercase font-bold bg-[#eaedff] dark:bg-[#283044] text-[#005c55] dark:text-[#6df5e1]">
                          {item.category}
                        </span>
                        <span className="text-xs text-[#3e4947] dark:text-[#bdc9c6] font-mono">{item.vaultId}</span>
                      </div>
                      <h4 className="font-bold text-sm text-[#131b2e] dark:text-[#faf8ff] mt-0.5">{item.name}</h4>
                      <p className="text-xs text-[#3e4947] dark:text-[#bdc9c6]">
                        Purchased: {formatDisplayDate(item.purchaseDate)} • Expiry: {formatDisplayDate(item.expiryDate)}
                      </p>
                      {item.category === 'warranty' && item.protectionScope && (
                        <p className="text-xs text-[#005c55] dark:text-[#6df5e1] font-medium mt-1">
                          Scope: {item.protectionScope}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="text-left sm:text-right shrink-0">
                    <span className="text-xs font-mono font-bold block bg-[#f2f3ff] dark:bg-[#283044] px-2 py-1 rounded">
                      {item.serialNumber ? `SN: ${item.serialNumber}` : 'Verified Receipt'}
                    </span>
                    <span className="text-[11px] text-[#3e4947] dark:text-[#bdc9c6] block mt-1">
                      {item.photos.length} Attached Proof{item.photos.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-[#3e4947] dark:text-[#bdc9c6] pt-1">
            <span>Total Certified Value in Dossier:</span>
            <strong className="text-sm font-bold text-[#005c55] dark:text-[#6df5e1]">${totalValue.toLocaleString()} USD</strong>
          </div>
        </div>

        {/* Footer actions */}
        <div className="p-4 sm:p-6 bg-[#f2f3ff] dark:bg-[#283044] border-t border-[#eaedff] dark:border-[#283044] flex items-center justify-between gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl text-sm font-semibold text-[#3e4947] dark:text-[#bdc9c6] hover:bg-[#eaedff] dark:hover:bg-[#131b2e] transition-colors"
          >
            Close
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-4 py-2.5 rounded-xl bg-[#005c55] text-white text-sm font-bold shadow-md hover:bg-[#0f766e] active:scale-95 transition-all flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[18px]">print</span>
              <span>Print / Save PDF</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
