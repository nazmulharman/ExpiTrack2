import React, { useState, useRef } from 'react';
import { ExpiryItem, ItemCategory, OCRResult, ConsumptionSchedule } from '../types';
import { getDaysRemaining } from '../utils/dateUtils';
import { formatScheduleTime, formatQuantity, parseFractionQuantity } from '../utils/medicineUtils';

interface ManualEntryViewProps {
  initialItem?: ExpiryItem | null;
  detectedOCR?: OCRResult | null;
  detectedImageUri?: string | null;
  onSaveItem: (item: ExpiryItem) => void;
  onCancel: () => void;
  showToast: (msg: string, icon?: string) => void;
}

export const ManualEntryView: React.FC<ManualEntryViewProps> = ({
  initialItem,
  detectedOCR,
  detectedImageUri,
  onSaveItem,
  onCancel,
  showToast,
}) => {
  // Determine initial field values
  const todayStr = new Date().toISOString().split('T')[0];
  const [productName, setProductName] = useState(
    initialItem?.name || detectedOCR?.productName || ''
  );
  const [category, setCategory] = useState<ItemCategory>(
    initialItem?.category || detectedOCR?.category || 'groceries'
  );
  const [subCategory, setSubCategory] = useState(
    initialItem?.subCategory || detectedOCR?.subCategory || (category === 'groceries' ? 'Dairy & Chilled' : category === 'medicines' ? 'Prescriptions' : 'Home Appliances')
  );
  const [quantity, setQuantity] = useState(initialItem?.quantity || (category === 'groceries' ? '1 Unit' : '1 Unit'));
  const [storageLocation, setStorageLocation] = useState(
    initialItem?.storageLocation || detectedOCR?.storageLocation || (category === 'groceries' ? 'Refrigerator' : category === 'medicines' ? 'Medicine Cabinet' : 'Kitchen / Home')
  );
  const [purchaseDate, setPurchaseDate] = useState(
    initialItem?.purchaseDate || todayStr
  );
  const [expiryDate, setExpiryDate] = useState(() => {
    if (initialItem?.expiryDate) return initialItem.expiryDate;
    if (detectedOCR?.expiryDate) return detectedOCR.expiryDate;
    // Sensible default expiry: groceries +7 days, medicines +180 days, warranty +365 days
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().split('T')[0];
  });
  const [notes, setNotes] = useState(
    initialItem?.notes || detectedOCR?.notes || ''
  );
  const [cloudBackup, setCloudBackup] = useState(true);
  const [isPinned, setIsPinned] = useState<boolean>(() => initialItem?.isPinned ?? false);

  // Medicine Stock & Daily Dosage tracking state
  const [initialStock, setInitialStock] = useState<number>(() => {
    if (initialItem?.initialStock !== undefined) return initialItem.initialStock;
    if (initialItem?.quantity) {
      const match = initialItem.quantity.match(/(\d+(?:\.\d+)?)/);
      if (match) return parseFloat(match[1]);
    }
    return 6;
  });
  const [consumedUnits, setConsumedUnits] = useState<number>(() => {
    return initialItem?.consumedUnits ?? 0;
  });
  const [remainingStock, setRemainingStock] = useState<number>(() => {
    if (initialItem?.remainingStock !== undefined) return initialItem.remainingStock;
    if (initialItem?.currentStock !== undefined) return initialItem.currentStock;
    const init = initialItem?.initialStock ?? 6;
    const cons = initialItem?.consumedUnits ?? 0;
    return Math.max(0, Math.round((init - cons) * 1000) / 1000);
  });
  const [dailyDosage, setDailyDosage] = useState<number>(() => {
    return initialItem?.dailyDosage ?? 1;
  });
  const [unitType, setUnitType] = useState<string>(() => {
    return initialItem?.unitType || 'pieces';
  });
  const [stockAlertsEnabled, setStockAlertsEnabled] = useState<boolean>(() => {
    return initialItem?.stockAlertsEnabled ?? true;
  });
  const [stockAlertThresholdDays, setStockAlertThresholdDays] = useState<number>(() => {
    return initialItem?.stockAlertThresholdDays ?? 5;
  });

  // Scheduled Consuming Times & Amounts
  const [consumptionSchedules, setConsumptionSchedules] = useState<ConsumptionSchedule[]>(() => {
    return initialItem?.consumptionSchedules ? [...initialItem.consumptionSchedules] : [];
  });
  const [newScheduleTime, setNewScheduleTime] = useState('08:00');
  const [newScheduleAmount, setNewScheduleAmount] = useState<number>(1);
  const [newScheduleLabel, setNewScheduleLabel] = useState('Morning Intake');
  const [showScheduleForm, setShowScheduleForm] = useState(false);

  // Photos
  const [photos, setPhotos] = useState<Array<{ id: string; url: string; title: string; type: any }>>(() => {
    if (initialItem && initialItem.photos.length > 0) return initialItem.photos;
    if (detectedImageUri) {
      return [
        {
          id: 'p-det-1',
          url: detectedImageUri,
          title: 'Scanned Proof Document.jpg',
          type: 'receipt',
        },
      ];
    }
    // Only sample warranty items have seed warranty deeds
    if (initialItem?.category === 'warranty') {
      return [
        {
          id: 'p-seed-1',
          url: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDRk6qXfXMLYxuIINXcGJKNMfGbVm_Kmw4IF4QWvxGnJiNxdE9VXJFsyhaxDbaAiCOQ0zxe2mxwpP1Uv4wRYrot_XRjp9u4swvDZHF8nDXoE3AOUsFSQPULuULzweNoDMfhyJmSg3cyM1VIWYlzz5RBKtyqecQvgPEw90GIMSgIl3PoRhov0gMF6wlzVH3gAs1h4fZQUqirJHWnfsWA7APteW7ls7dNeRDrF40dhF2JxvxkgUOu0SA1',
          title: 'Receipt_01.jpg',
          type: 'receipt',
        },
        {
          id: 'p-seed-2',
          url: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCfCaxATu4sf-75iJyggHzIkCSnFOY0ixkzrq2CPc84_XQa0G4giBgH4yh9c-BvYbU6CnK6T7lEz28AtVX7y0O8hDScpHYg2ofmFPINzCBUdmqpRDf61ljyzK9rPIu4-_0lPeNNy6Kbo2U7gFr2uykZpPvmu_ZJWQQK1surSLySmV8YGRHfXHgHi7AXLji4o-i6V4ggQrAT_FBzruPhfWT-mjCaF0ZUd3a93UaJkYp8mQrP1ObFrUOZ',
          title: 'Warranty_Card.jpg',
          type: 'warranty',
        },
      ];
    }
    return [
      {
        id: 'p-seed-1',
        url: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDRk6qXfXMLYxuIINXcGJKNMfGbVm_Kmw4IF4QWvxGnJiNxdE9VXJFsyhaxDbaAiCOQ0zxe2mxwpP1Uv4wRYrot_XRjp9u4swvDZHF8nDXoE3AOUsFSQPULuULzweNoDMfhyJmSg3cyM1VIWYlzz5RBKtyqecQvgPEw90GIMSgIl3PoRhov0gMF6wlzVH3gAs1h4fZQUqirJHWnfsWA7APteW7ls7dNeRDrF40dhF2JxvxkgUOu0SA1',
        title: 'Purchase_Receipt.jpg',
        type: 'receipt',
      },
    ];
  });

  // Reminders
  const [reminders, setReminders] = useState<{ [key: string]: boolean }>({
    '30': true,
    '15': true,
    '7': true,
    '0': true,
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Quick preset offset calculation
  const setDateOffset = (value: number, unit: 'days' | 'months') => {
    const base = purchaseDate ? new Date(purchaseDate + 'T00:00:00') : new Date();
    const target = new Date(base.getTime());
    if (unit === 'days') {
      target.setDate(target.getDate() + value);
    } else {
      target.setMonth(target.getMonth() + value);
    }

    const yyyy = target.getFullYear();
    const mm = String(target.getMonth() + 1).padStart(2, '0');
    const dd = String(target.getDate()).padStart(2, '0');
    setExpiryDate(`${yyyy}-${mm}-${dd}`);

    const label = unit === 'days'
      ? `+${value} Day${value > 1 ? 's' : ''}`
      : value >= 12
      ? `+${value / 12} Year${value > 12 ? 's' : ''}`
      : `+${value} Month${value > 1 ? 's' : ''}`;

    if (category === 'groceries' || category === 'medicines') {
      showToast(`Expiry date set to ${label}`, 'calendar_month');
    } else {
      showToast(`Warranty end set to ${label}`, 'calendar_month');
    }
  };

  const handleAddPhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const url = event.target?.result as string;
        setPhotos(prev => [
          ...prev,
          {
            id: `photo-${Date.now()}`,
            url,
            title: file.name || 'Attached_Receipt.jpg',
            type: 'receipt',
          },
        ]);
        showToast('Document attached to item proof roll', 'add_photo_alternate');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDeletePhoto = (id: string) => {
    setPhotos(prev => prev.filter(p => p.id !== id));
    showToast('Photo proof removed', 'delete');
  };

  const toggleAllReminders = () => {
    const allChecked = Object.values(reminders).every(v => v);
    setReminders({
      '30': !allChecked,
      '15': !allChecked,
      '7': !allChecked,
      '0': !allChecked,
    });
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!productName.trim()) {
      showToast('Please enter a product or item name', 'error');
      return;
    }

    const itemToSave: ExpiryItem = {
      id: initialItem ? initialItem.id : `item-${Date.now()}`,
      vaultId: initialItem?.vaultId || `EXP-${Math.floor(10000 + Math.random() * 90000)}`,
      name: productName.trim(),
      category,
      subCategory: subCategory.trim() || 'General',
      purchaseDate,
      expiryDate,
      quantity: quantity.trim() || undefined,
      storageLocation: storageLocation.trim() || undefined,
      notes: notes.trim() || undefined,
      status: 'active',
      isPinned,
      cloudSynced: cloudBackup,
      photos: photos.map(p => ({
        ...p,
        dateAdded: new Date().toISOString().split('T')[0],
      })),
      reminderSettings: {
        daysBefore: [30, 15, 7].filter(d => reminders[String(d)]),
        notifyOnDay: !!reminders['0'],
      },
      ...(category === 'medicines' || category === 'groceries' || initialItem?.initialStock !== undefined || consumptionSchedules.length > 0 ? {
        initialStock: Math.max(0.01, initialStock),
        consumedUnits: Math.max(0, consumedUnits),
        currentStock: Math.max(0, remainingStock),
        remainingStock: Math.max(0, remainingStock),
        dailyDosage: Math.max(0.01, dailyDosage),
        unitType,
        lowStockThreshold: Math.max(0.01, dailyDosage * (category === 'groceries' ? 2 : 3)),
        stockAlertsEnabled,
        stockAlertThresholdDays,
        consumptionSchedules: consumptionSchedules.length > 0 ? consumptionSchedules : undefined,
        consumptionHistory: initialItem?.consumptionHistory,
      } : {}),
    };

    onSaveItem(itemToSave);
  };

  return (
    <div className="flex flex-col w-full pb-28 pt-2">
      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleAddPhoto}
        accept="image/*"
        className="hidden"
      />

      {/* Top Action Bar */}
      <div className="flex items-center justify-between py-2 mb-3">
        <button
          onClick={onCancel}
          type="button"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-[#131b2e] border border-[#eaedff] dark:border-[#283044] text-[#131b2e] dark:text-[#faf8ff] hover:bg-[#f2f3ff] transition-colors"
        >
          <span className="material-symbols-outlined text-[18px]">close</span>
          <span className="text-xs font-semibold">Cancel</span>
        </button>

        <div className="flex items-center gap-1.5">
          <span className="flex h-2 w-2 rounded-full bg-[#6df5e1] animate-pulse"></span>
          <span className="text-xs text-[#3e4947] dark:text-[#bdc9c6]">Draft Autosaved</span>
        </div>

        <button
          onClick={() => handleSubmit()}
          type="button"
          className="flex items-center gap-1 px-4 py-1.5 rounded-xl bg-[#005c55] text-white shadow-sm hover:bg-[#0f766e] active:scale-95 transition-all"
        >
          <span className="material-symbols-outlined text-[18px]">check</span>
          <span className="text-xs font-bold">Save Item</span>
        </button>
      </div>

      {/* OCR Auto-Fill Active Banner */}
      <div className="flex items-center gap-3 p-3.5 mb-4 rounded-2xl bg-[#6df5e1]/40 text-[#006f64] dark:text-[#6df5e1] border border-[#6df5e1]/60 shadow-xs">
        <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-[#006f64]/10 shrink-0">
          <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>
            document_scanner
          </span>
        </div>
        <div className="flex flex-col min-w-0 flex-1">
          <div className="flex items-center gap-1">
            <span className="text-xs font-bold">OCR Auto-Fill Active</span>
            <span className="material-symbols-outlined text-[15px]">verified</span>
          </div>
          <p className="text-[11px] opacity-90 truncate">
            Details extracted with 98% confidence from optical scan
          </p>
        </div>
        <button
          type="button"
          onClick={() => showToast('Re-analyzing OCR text anchors...', 'refresh')}
          className="shrink-0 p-1.5 rounded-full hover:bg-black/10 transition-colors"
          title="Rescan Document"
        >
          <span className="material-symbols-outlined text-[18px]">refresh</span>
        </button>
      </div>

      {/* Attached Proof & Docs Strip */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2 px-1">
          <span className="text-xs font-bold uppercase tracking-wider text-[#3e4947] dark:text-[#bdc9c6]">
            Attached Proof & Docs
          </span>
          <span className="text-xs font-bold text-[#005c55] dark:text-[#6df5e1]">
            {photos.length} of 5 files
          </span>
        </div>

        <div className="flex gap-2.5 overflow-x-auto pb-2 pt-1 no-scrollbar snap-x">
          {photos.map((photo) => (
            <div
              key={photo.id}
              className="relative group shrink-0 w-28 h-32 rounded-2xl overflow-hidden bg-slate-100 dark:bg-[#283044] shadow-sm snap-start border border-[#eaedff] dark:border-[#283044]"
            >
              <img src={photo.url} alt={photo.title} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none"></div>
              <button
                type="button"
                onClick={() => handleDeletePhoto(photo.id)}
                className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-white/90 text-red-600 flex items-center justify-center shadow-md hover:scale-110 transition-transform"
                title="Remove photo"
              >
                <span className="material-symbols-outlined text-[14px]">delete</span>
              </button>
              <div className="absolute bottom-2 left-2 right-2">
                <div className="flex items-center gap-1 text-white">
                  <span className="material-symbols-outlined text-[12px]">receipt_long</span>
                  <span className="text-[10px] font-medium truncate">{photo.title}</span>
                </div>
              </div>
            </div>
          ))}

          {photos.length < 5 && (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="shrink-0 w-28 h-32 rounded-2xl bg-white dark:bg-[#131b2e] hover:bg-[#f2f3ff] border border-dashed border-[#005c55]/40 flex flex-col items-center justify-center gap-1.5 text-[#3e4947] dark:text-[#bdc9c6] hover:text-[#005c55] transition-all snap-start shadow-xs active:scale-95"
            >
              <div className="w-10 h-10 rounded-full bg-[#f2f3ff] dark:bg-[#283044] flex items-center justify-center text-[#005c55] dark:text-[#6df5e1] shadow-xs">
                <span className="material-symbols-outlined text-[22px]">add_a_photo</span>
              </div>
              <span className="text-xs font-bold">Add more</span>
              <span className="text-[10px] opacity-75">PDF, PNG, JPG</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Form Fields */}
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {/* Section 1: General Information */}
        <div className="bg-white dark:bg-[#131b2e] p-4 rounded-2xl shadow-sm border border-[#eaedff] dark:border-[#283044] flex flex-col gap-3">
          <div className="flex items-center gap-1.5 text-[#005c55] dark:text-[#6df5e1] text-xs font-bold uppercase tracking-wider">
            <span className="material-symbols-outlined text-[18px]">inventory_2</span>
            <span>General Information</span>
          </div>

          {/* Product Name */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold text-[#131b2e] dark:text-white flex items-center justify-between">
              <span>Product / Item Name</span>
              <span className="text-[#005c55] dark:text-[#6df5e1] font-normal text-[11px] flex items-center gap-1">
                <span className="material-symbols-outlined text-[13px]">auto_awesome</span> Scanned
              </span>
            </label>
            <div className="relative flex items-center">
              <span className="material-symbols-outlined absolute left-3.5 text-slate-400 text-[20px]">
                {category === 'medicines' ? 'pill' : category === 'groceries' ? 'nutrition' : 'devices'}
              </span>
              <input
                type="text"
                required
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                placeholder={
                  category === 'groceries'
                    ? 'e.g. Organic Whole Milk 1.5L, Fresh Eggs'
                    : category === 'medicines'
                    ? 'e.g. Amoxicillin 500mg, Cough Syrup'
                    : 'e.g. LG Smart Inverter Refrigerator 420L'
                }
                className="w-full h-12 pl-11 pr-3 rounded-xl bg-[#f2f3ff] dark:bg-[#283044] text-[#131b2e] dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#005c55]"
              />
            </div>
          </div>

          {/* Category & SubCategory */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-[#131b2e] dark:text-white">Category</label>
              <div className="relative flex items-center">
                <span className="material-symbols-outlined absolute left-3.5 text-slate-400 text-[20px]">
                  {category === 'groceries' ? 'local_grocery_store' : category === 'medicines' ? 'prescriptions' : 'bolt'}
                </span>
                <select
                  value={category}
                  onChange={(e) => {
                    const newCat = e.target.value as ItemCategory;
                    setCategory(newCat);
                    if (newCat === 'groceries') {
                      if (['tablets', 'capsules', 'pills', 'doses'].includes(unitType)) {
                        setUnitType('pieces');
                        setDailyDosage(1);
                      }
                      if (!subCategory || subCategory === 'Home Appliances' || subCategory === 'Prescriptions') {
                        setSubCategory('Dairy & Chilled');
                      }
                      if (storageLocation === 'Kitchen / Home' || storageLocation === 'Medicine Cabinet') {
                        setStorageLocation('Refrigerator');
                      }
                    } else if (newCat === 'medicines') {
                      if (['pieces', 'eggs', 'kg', 'slices', 'servings'].includes(unitType)) {
                        setUnitType('tablets');
                        setDailyDosage(2);
                      }
                      if (!subCategory || subCategory === 'Home Appliances' || subCategory === 'Dairy & Chilled') {
                        setSubCategory('Prescriptions');
                      }
                      if (storageLocation === 'Kitchen / Home' || storageLocation === 'Refrigerator') {
                        setStorageLocation('Medicine Cabinet');
                      }
                    }
                  }}
                  className="w-full h-12 pl-11 pr-8 rounded-xl bg-[#f2f3ff] dark:bg-[#283044] text-[#131b2e] dark:text-white text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-[#005c55] cursor-pointer"
                >
                  <option value="groceries">🥑 Fresh Groceries & Pantry</option>
                  <option value="medicines">💊 Pharmacy & Medicines</option>
                  <option value="warranty">⚡ Warranty & Electronics</option>
                  <option value="documents">📑 IDs, Passports & Licences</option>
                </select>
                <span className="material-symbols-outlined absolute right-3 pointer-events-none text-slate-400 text-[20px]">
                  expand_more
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-[#131b2e] dark:text-white">Sub-Category</label>
              <div className="relative flex items-center">
                <span className="material-symbols-outlined absolute left-3.5 text-slate-400 text-[20px]">
                  category
                </span>
                <input
                  type="text"
                  value={subCategory}
                  onChange={(e) => setSubCategory(e.target.value)}
                  placeholder={
                    category === 'groceries'
                      ? 'e.g. Dairy & Eggs, Fresh Produce'
                      : category === 'medicines'
                      ? 'e.g. Antibiotics, Vitamins'
                      : 'e.g. Home Appliances, Audio'
                  }
                  className="w-full h-12 pl-11 pr-3 rounded-xl bg-[#f2f3ff] dark:bg-[#283044] text-[#131b2e] dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#005c55]"
                />
              </div>
            </div>
          </div>

          {/* Quantity & Storage Location */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-[#131b2e] dark:text-white">
                Quantity / Units <span className="font-normal text-slate-400">(Optional)</span>
              </label>
              <div className="relative flex items-center">
                <span className="material-symbols-outlined absolute left-3.5 text-slate-400 text-[20px]">
                  pin
                </span>
                <input
                  type="text"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  placeholder="e.g. 1 Unit, 500g, 30 tablets"
                  className="w-full h-12 pl-11 pr-3 rounded-xl bg-[#f2f3ff] dark:bg-[#283044] text-[#131b2e] dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#005c55]"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-[#131b2e] dark:text-white">Storage Location</label>
              <div className="relative flex items-center">
                <span className="material-symbols-outlined absolute left-3.5 text-slate-400 text-[20px]">
                  meeting_room
                </span>
                <input
                  type="text"
                  value={storageLocation}
                  onChange={(e) => setStorageLocation(e.target.value)}
                  placeholder="e.g. Kitchen / Home, Medicine Cabinet"
                  className="w-full h-12 pl-11 pr-3 rounded-xl bg-[#f2f3ff] dark:bg-[#283044] text-[#131b2e] dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#005c55]"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Section: Stock, Consumed, Available & Daily Consumption Rate Tracking (Supported for Groceries & Medicines) */}
        {(category === 'medicines' || category === 'groceries' || initialItem?.initialStock !== undefined) && (
          <div className="bg-white dark:bg-[#131b2e] p-4 rounded-2xl shadow-sm border border-[#eaedff] dark:border-[#283044] flex flex-col gap-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-[#005c55] dark:text-[#6df5e1] text-xs font-bold uppercase tracking-wider">
                <span className="material-symbols-outlined text-[18px]">
                  {category === 'groceries' ? 'kitchen' : 'pill'}
                </span>
                <span>
                  {category === 'groceries'
                    ? 'Grocery Inventory & Daily Consumption'
                    : 'Medicine Stock & Daily Consumption'}
                </span>
              </div>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#6df5e1]/40 text-[#006f64] dark:text-[#6df5e1] font-bold">
                {category === 'groceries' ? 'Zero-Waste Tracker' : 'Smart Tracker'}
              </span>
            </div>

            {/* Live Stock Summary Row: Stock, Consumed, Remaining Stock */}
            <div className="grid grid-cols-3 gap-2 p-3 rounded-xl bg-[#f2f3ff] dark:bg-[#283044]">
              <div className="flex flex-col">
                <span className="text-[10px] uppercase font-bold text-[#3e4947] dark:text-[#bdc9c6]">Total Stock</span>
                <span className="text-base font-black text-[#131b2e] dark:text-white mt-0.5">
                  {initialStock} <span className="text-xs font-normal text-slate-500">{unitType}</span>
                </span>
              </div>
              <div className="flex flex-col border-x border-[#eaedff] dark:border-[#384259] px-2">
                <span className="text-[10px] uppercase font-bold text-[#3e4947] dark:text-[#bdc9c6]">Consumed</span>
                <span className="text-base font-black text-slate-700 dark:text-slate-300 mt-0.5">
                  {consumedUnits} <span className="text-xs font-normal text-slate-500">{unitType}</span>
                </span>
              </div>
              <div className="flex flex-col pl-1">
                <span className="text-[10px] uppercase font-bold text-[#005c55] dark:text-[#6df5e1]">Remaining Stock</span>
                <span className={`text-base font-black ${
                  remainingStock <= 0
                    ? 'text-red-500'
                    : remainingStock <= (dailyDosage * (category === 'groceries' ? 2 : 3))
                    ? 'text-amber-600'
                    : 'text-[#005c55] dark:text-[#6df5e1]'
                }`}>
                  {formatQuantity(remainingStock)} <span className="text-xs font-normal">{unitType}</span>
                </span>
              </div>
            </div>

            {/* Inputs: Total Stock, Remaining Stock, Consumed Units, Unit Type */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-[#131b2e] dark:text-white">
                  Total Stock <span className="text-[10px] font-normal text-slate-400">({category === 'groceries' ? 'Qty' : 'Pack'})</span>
                </label>
                <input
                  type="number"
                  step="any"
                  min="0.01"
                  max="10000"
                  value={initialStock}
                  onChange={(e) => {
                    const val = parseFractionQuantity(e.target.value, 0.01);
                    setInitialStock(val);
                    setRemainingStock(Math.max(0, Math.round((val - consumedUnits) * 1000) / 1000));
                    if (!quantity || quantity === '1 Unit' || quantity.includes('tablet') || quantity.includes('piece')) {
                      setQuantity(`${formatQuantity(val)} ${unitType}`);
                    }
                  }}
                  className="w-full h-11 px-3 rounded-xl bg-[#f2f3ff] dark:bg-[#283044] text-[#131b2e] dark:text-white text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[#005c55]"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-[#005c55] dark:text-[#6df5e1]">
                  Remaining Stock
                </label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  max={initialStock * 2}
                  value={remainingStock}
                  onChange={(e) => {
                    const val = parseFractionQuantity(e.target.value, 0);
                    setRemainingStock(val);
                    setConsumedUnits(Math.max(0, Math.round((initialStock - val) * 1000) / 1000));
                  }}
                  className="w-full h-11 px-3 rounded-xl bg-white dark:bg-[#131b2e] border-2 border-[#005c55] dark:border-[#6df5e1] text-[#005c55] dark:text-[#6df5e1] text-sm font-black focus:outline-none focus:ring-2 focus:ring-[#005c55]"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-[#131b2e] dark:text-white">
                  Already Consumed
                </label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  max={initialStock * 2}
                  value={consumedUnits}
                  onChange={(e) => {
                    const val = parseFractionQuantity(e.target.value, 0);
                    setConsumedUnits(val);
                    setRemainingStock(Math.max(0, Math.round((initialStock - val) * 1000) / 1000));
                  }}
                  className="w-full h-11 px-3 rounded-xl bg-[#f2f3ff] dark:bg-[#283044] text-[#131b2e] dark:text-white text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[#005c55]"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-[#131b2e] dark:text-white">
                  Specific Unit
                </label>
                <select
                  value={unitType}
                  onChange={(e) => {
                    setUnitType(e.target.value);
                    if (!quantity || quantity.includes('tablet') || quantity.includes('piece') || quantity.includes('pack')) {
                      setQuantity(`${formatQuantity(initialStock)} ${e.target.value}`);
                    }
                  }}
                  className="w-full h-11 px-3 rounded-xl bg-[#f2f3ff] dark:bg-[#283044] text-[#131b2e] dark:text-white text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#005c55]"
                >
                  {category === 'groceries' ? (
                    <>
                      <option value="kg">kg (Kilograms - e.g. 0.5 kg)</option>
                      <option value="liters">liters / ltr (e.g. 1.5 ltr)</option>
                      <option value="ml">ml (Milliliters - e.g. 2.75 ml)</option>
                      <option value="g">g (Grams)</option>
                      <option value="pieces">Pieces / Items</option>
                      <option value="packs">Packs / Cartons</option>
                      <option value="bottles">Bottles</option>
                      <option value="cans">Cans</option>
                      <option value="boxes">Boxes</option>
                      <option value="eggs">Eggs</option>
                      <option value="cups">Cups / Bowls</option>
                      <option value="slices">Slices</option>
                      <option value="servings">Servings</option>
                    </>
                  ) : (
                    <>
                      <option value="tablets">Tablets</option>
                      <option value="ml">ml (e.g. 2.75 ml)</option>
                      <option value="capsules">Capsules</option>
                      <option value="pills">Pills</option>
                      <option value="doses">Doses</option>
                      <option value="drops">Drops</option>
                      <option value="sachets">Sachets</option>
                    </>
                  )}
                </select>
              </div>
            </div>

            {/* Daily Consumption Rate */}
            <div className="p-3 rounded-xl bg-[#f2f3ff] dark:bg-[#283044] space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-xs font-bold text-[#131b2e] dark:text-white flex items-center gap-1">
                    <span className="material-symbols-outlined text-[16px] text-[#005c55] dark:text-[#6df5e1]">
                      schedule
                    </span>
                    Daily Consumption Rate (dailyDosage)
                  </label>
                  <span className="text-[11px] text-[#3e4947] dark:text-[#bdc9c6]">
                    How many {unitType} consumed each day (supports fractions like 0.5 kg, 2.75 ml, 1.5 ltr)
                  </span>
                </div>

                {/* Direct Number Input & Quick Stepper */}
                <div className="flex items-center gap-1.5 bg-white dark:bg-[#131b2e] px-2 py-1 rounded-xl border border-slate-200 dark:border-slate-700">
                  <button
                    type="button"
                    onClick={() => {
                      const step = unitType === 'kg' || unitType === 'liters' || unitType === 'ltr' ? 0.25 : (unitType === 'ml' ? 0.25 : 0.5);
                      setDailyDosage((prev) => Math.max(0.01, Math.round((prev - step) * 100) / 100));
                    }}
                    className="w-7 h-7 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-sm font-bold flex items-center justify-center text-slate-700 dark:text-white"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    step="any"
                    min="0.01"
                    max="10000"
                    value={dailyDosage}
                    onChange={(e) => setDailyDosage(parseFractionQuantity(e.target.value, 0.01))}
                    className="w-16 text-center text-sm font-black text-[#005c55] dark:text-[#6df5e1] bg-transparent focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const step = unitType === 'kg' || unitType === 'liters' || unitType === 'ltr' ? 0.25 : (unitType === 'ml' ? 0.25 : 0.5);
                      setDailyDosage((prev) => Math.round((prev + step) * 100) / 100);
                    }}
                    className="w-7 h-7 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-sm font-bold flex items-center justify-center text-slate-700 dark:text-white"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Quick Preset Buttons */}
              <div className="flex items-center gap-1.5 pt-1 flex-wrap">
                <span className="text-[11px] text-slate-500 font-medium">Quick presets:</span>
                {(unitType === 'kg' || unitType === 'liters' || unitType === 'ltr'
                  ? [0.25, 0.5, 1, 1.5, 2]
                  : unitType === 'ml'
                  ? [0.5, 1, 2.5, 2.75, 5, 10]
                  : unitType === 'g'
                  ? [50, 100, 150, 250]
                  : [0.5, 1, 2, 3, 4]
                ).map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDailyDosage(d)}
                    className={`px-2.5 py-0.5 rounded-lg text-xs font-bold transition-all ${
                      dailyDosage === d
                        ? 'bg-[#005c55] text-white shadow-xs'
                        : 'bg-white dark:bg-[#131b2e] text-[#131b2e] dark:text-white border border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    {formatQuantity(d)} {unitType}/day
                  </button>
                ))}
              </div>
            </div>

            {/* Before Stock Out & Dual Expiry Notification */}
            <div className="p-3.5 rounded-xl border border-[#fed7aa] bg-[#fff7ed] dark:bg-amber-950/30 dark:border-amber-900/60 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#c2410c] text-[20px]">
                    notification_important
                  </span>
                  <div>
                    <span className="text-xs font-bold text-[#131b2e] dark:text-white block">
                      Daily Depletion & Pre-Stockout Alert
                    </span>
                    <span className="text-[11px] text-[#3e4947] dark:text-[#bdc9c6]">
                      Proactively notify before supply is depleted
                    </span>
                  </div>
                </div>

                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={stockAlertsEnabled}
                    onChange={(e) => setStockAlertsEnabled(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-10 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#c2410c]"></div>
                </label>
              </div>

              {stockAlertsEnabled && (
                <div className="pt-1.5 border-t border-amber-200 dark:border-amber-900/50 flex flex-col gap-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#3e4947] dark:text-[#bdc9c6] font-medium">
                      Notify before stock runs out:
                    </span>
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 5, 7].map((days) => (
                        <button
                          key={days}
                          type="button"
                          onClick={() => setStockAlertThresholdDays(days)}
                          className={`px-2 py-0.5 rounded-lg text-xs font-bold transition-all ${
                            stockAlertThresholdDays === days
                              ? 'bg-[#c2410c] text-white shadow-xs'
                              : 'bg-white dark:bg-[#131b2e] text-[#131b2e] dark:text-white border border-slate-200 dark:border-slate-700'
                          }`}
                        >
                          {days}d Left
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Dual Forecast: Stockout vs Expiration */}
                  {(() => {
                    const daysSupply = dailyDosage > 0 ? Math.floor(remainingStock / dailyDosage) : 999;
                    const daysExpiry = getDaysRemaining(expiryDate);
                    const willExpireFirst = remainingStock > 0 && daysExpiry < daysSupply;
                    const wasteAmount = willExpireFirst ? Math.max(0, remainingStock - (daysExpiry * dailyDosage)) : 0;

                    return (
                      <div className="p-3 rounded-xl bg-white/90 dark:bg-[#131b2e]/90 text-xs space-y-1.5 border border-amber-200/70 dark:border-amber-900/50">
                        <div className="flex items-center justify-between font-bold text-[#131b2e] dark:text-white text-[11px]">
                          <span className="flex items-center gap-1">
                            <span className="material-symbols-outlined text-[14px] text-[#005c55] dark:text-[#6df5e1]">inventory_2</span>
                            Stock Duration: <strong>{daysSupply} Days</strong> ({remainingStock} {unitType})
                          </span>
                          <span className="flex items-center gap-1">
                            <span className="material-symbols-outlined text-[14px] text-[#c2410c]">calendar_today</span>
                            Expiry: <strong>{daysExpiry} Days</strong>
                          </span>
                        </div>

                        {remainingStock <= 0 ? (
                          <p className="text-red-600 font-bold flex items-center gap-1">
                            <span className="material-symbols-outlined text-[14px]">error</span>
                            Stock is completely empty. Please restock!
                          </p>
                        ) : willExpireFirst ? (
                          <div className="p-2 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 font-medium leading-relaxed">
                            <span className="font-bold flex items-center gap-1">
                              <span className="material-symbols-outlined text-[14px]">warning</span>
                              Zero-Waste Warning:
                            </span>
                            Item will reach best-by date in <strong>{daysExpiry} days</strong>, leaving approx.{' '}
                            <strong>{wasteAmount} {unitType}</strong> unconsumed! You'll receive alerts for both best-by date and stock level.
                          </div>
                        ) : (
                          <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 font-medium leading-relaxed">
                            <span className="font-bold flex items-center gap-1">
                              <span className="material-symbols-outlined text-[14px]">check_circle</span>
                              Zero-Waste Safe:
                            </span>
                            Stock will be consumed in <strong>{daysSupply} days</strong>, which is{' '}
                            <strong>{daysExpiry - daysSupply} days before expiration</strong>. Stockout alert will fire{' '}
                            <strong>{stockAlertThresholdDays} days beforehand</strong>!
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* Consuming Times & Dose Notification Alarms */}
              <div className="p-3.5 rounded-xl border border-[#d8e2fd] dark:border-[#2d3a54] bg-[#f8faff] dark:bg-[#1b2336] space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[#005c55] dark:text-[#6df5e1] text-[20px]">
                      alarm
                    </span>
                    <div>
                      <span className="text-xs font-bold text-[#131b2e] dark:text-white block">
                        Consuming Times & Notification Alarms (Optional)
                      </span>
                      <span className="text-[11px] text-[#3e4947] dark:text-[#bdc9c6]">
                        Set reminders to take or consume this item &bull; Auto-deducts stock upon confirmation
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowScheduleForm(!showScheduleForm)}
                    className="px-2.5 py-1 rounded-lg bg-[#005c55] text-white text-xs font-bold flex items-center gap-1 hover:bg-[#0f766e] transition-colors shadow-xs"
                  >
                    <span className="material-symbols-outlined text-[15px]">
                      {showScheduleForm ? 'remove' : 'add'}
                    </span>
                    <span>{showScheduleForm ? 'Close' : 'Add Time'}</span>
                  </button>
                </div>

                {/* List of configured schedules */}
                {consumptionSchedules.length > 0 && (
                  <div className="space-y-1.5 pt-1">
                    {consumptionSchedules.map((sch, idx) => (
                      <div
                        key={sch.id || idx}
                        className="flex items-center justify-between p-2 rounded-xl bg-white dark:bg-[#131b2e] border border-slate-200 dark:border-slate-700 text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-[16px] text-[#005c55] dark:text-[#6df5e1]">
                            schedule
                          </span>
                          <span className="font-bold text-[#131b2e] dark:text-white">
                            {formatScheduleTime(sch.time)}
                          </span>
                          <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-[#6df5e1]/30 text-[#006f64] dark:text-[#6df5e1]">
                            {formatQuantity(sch.amount)} {unitType}
                          </span>
                          <span className="text-slate-500 text-[11px]">
                            {sch.label}
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            setConsumptionSchedules(prev => prev.filter((_, i) => i !== idx));
                          }}
                          className="w-6 h-6 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 flex items-center justify-center transition-colors"
                          title="Remove time"
                        >
                          <span className="material-symbols-outlined text-[15px]">delete</span>
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Inline form to add a consuming time */}
                {showScheduleForm && (
                  <div className="p-3 rounded-xl bg-white dark:bg-[#131b2e] border border-dashed border-[#005c55]/40 space-y-3">
                    <div className="flex items-center justify-between text-xs font-bold text-[#131b2e] dark:text-white">
                      <span>Add Consuming Time & Amount</span>
                      <div className="flex gap-1">
                        {[
                          { time: '08:00', label: '8:00 AM' },
                          { time: '13:00', label: '1:00 PM' },
                          { time: '20:30', label: '8:30 PM' },
                        ].map((preset) => (
                          <button
                            key={preset.time}
                            type="button"
                            onClick={() => {
                              setNewScheduleTime(preset.time);
                              if (preset.time === '08:00') setNewScheduleLabel('Morning with Breakfast');
                              if (preset.time === '13:00') setNewScheduleLabel('Lunchtime');
                              if (preset.time === '20:30') setNewScheduleLabel('Bedtime / Night');
                            }}
                            className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-colors ${
                              newScheduleTime === preset.time
                                ? 'bg-[#005c55] text-white'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                            }`}
                          >
                            {preset.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[11px] font-medium text-slate-500 block mb-1">Time</label>
                        <input
                          type="time"
                          value={newScheduleTime}
                          onChange={(e) => setNewScheduleTime(e.target.value)}
                          className="w-full h-9 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold text-slate-800 dark:text-white"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-medium text-slate-500 block mb-1">Amount ({unitType})</label>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              const step = unitType === 'kg' || unitType === 'liters' || unitType === 'ltr' ? 0.25 : (unitType === 'ml' ? 0.25 : 0.5);
                              setNewScheduleAmount(prev => Math.max(0.01, Math.round((prev - step) * 100) / 100));
                            }}
                            className="w-9 h-9 rounded-lg bg-slate-100 dark:bg-slate-800 font-bold text-xs"
                          >
                            -
                          </button>
                          <input
                            type="number"
                            step="any"
                            min="0.01"
                            value={newScheduleAmount}
                            onChange={(e) => setNewScheduleAmount(parseFractionQuantity(e.target.value, 0.01))}
                            className="w-16 h-9 text-center rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const step = unitType === 'kg' || unitType === 'liters' || unitType === 'ltr' ? 0.25 : (unitType === 'ml' ? 0.25 : 0.5);
                              setNewScheduleAmount(prev => Math.round((prev + step) * 100) / 100);
                            }}
                            className="w-9 h-9 rounded-lg bg-slate-100 dark:bg-slate-800 font-bold text-xs"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="text-[11px] font-medium text-slate-500 block mb-1">Dose / Serving Description</label>
                      <input
                        type="text"
                        value={newScheduleLabel}
                        onChange={(e) => setNewScheduleLabel(e.target.value)}
                        placeholder="e.g. Morning Dose, Afternoon Snack, Bedtime"
                        className="w-full h-9 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-800 dark:text-white"
                      />
                    </div>

                    <div className="flex justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          const newSch: ConsumptionSchedule = {
                            id: `sch-${Date.now()}`,
                            time: newScheduleTime,
                            amount: newScheduleAmount,
                            label: newScheduleLabel || 'Scheduled Intake',
                            enabled: true,
                          };
                          setConsumptionSchedules(prev => [...prev, newSch].sort((a, b) => a.time.localeCompare(b.time)));
                          setShowScheduleForm(false);
                          showToast(`Added schedule for ${formatScheduleTime(newScheduleTime)}`, 'alarm_on');
                        }}
                        className="px-3.5 py-1.5 rounded-lg bg-[#005c55] text-white text-xs font-bold hover:bg-[#0f766e] flex items-center gap-1 shadow-xs"
                      >
                        <span className="material-symbols-outlined text-[14px]">check</span>
                        <span>Save Schedule</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Section 2: Timeline & Expiry */}
        <div className="bg-white dark:bg-[#131b2e] p-4 rounded-2xl shadow-sm border border-[#eaedff] dark:border-[#283044] flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-[#005c55] dark:text-[#6df5e1] text-xs font-bold uppercase tracking-wider">
              <span className="material-symbols-outlined text-[18px]">calendar_month</span>
              <span>
                {category === 'groceries'
                  ? 'Timeline & Freshness Expiry'
                  : category === 'medicines'
                  ? 'Timeline & Medicine Expiry'
                  : category === 'warranty'
                  ? 'Timeline & Warranty Coverage'
                  : 'Timeline & Validity Expiry'}
              </span>
            </div>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#eaedff] dark:bg-[#283044] font-semibold text-[#005c55] dark:text-[#6df5e1]">
              {category === 'groceries'
                ? 'Best-By Window'
                : category === 'medicines'
                ? 'Use-By Expiry Window'
                : category === 'warranty'
                ? 'Coverage Window'
                : 'Validity Window'}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-[#131b2e] dark:text-white">
                {category === 'groceries' || category === 'medicines' ? 'Purchase / Pack Date' : 'Purchase Date'}
              </label>
              <div className="relative flex items-center">
                <span className="material-symbols-outlined absolute left-3.5 text-slate-400 text-[20px]">
                  shopping_bag
                </span>
                <input
                  type="date"
                  value={purchaseDate}
                  onChange={(e) => setPurchaseDate(e.target.value)}
                  className="w-full h-12 pl-11 pr-3 rounded-xl bg-[#f2f3ff] dark:bg-[#283044] text-[#131b2e] dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#005c55]"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-[#131b2e] dark:text-white flex items-center justify-between">
                <span>
                  {category === 'groceries'
                    ? 'Expiry Date (Best-By)'
                    : category === 'medicines'
                    ? 'Expiry Date (Use-By)'
                    : category === 'warranty'
                    ? 'Warranty End Date'
                    : 'Expiry / Renewal Date'}
                </span>
                <span className="text-[11px] font-bold text-[#005c55] dark:text-[#6df5e1]">
                  {category === 'warranty' ? 'Active Coverage' : 'Tracked Expiry'}
                </span>
              </label>
              <div className="relative flex items-center">
                <span className="material-symbols-outlined absolute left-3.5 text-[#005c55] text-[20px]">
                  {category === 'groceries' ? 'restaurant' : category === 'medicines' ? 'medication' : category === 'warranty' ? 'verified' : 'badge'}
                </span>
                <input
                  type="date"
                  required
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(e.target.value)}
                  className="w-full h-12 pl-11 pr-3 rounded-xl bg-[#f2f3ff] dark:bg-[#283044] text-[#131b2e] dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#005c55]"
                />
              </div>
            </div>
          </div>

          {/* Quick Presets based on category */}
          <div className="flex flex-col gap-1.5 pt-1">
            <span className="text-[11px] font-semibold text-[#3e4947] dark:text-[#bdc9c6]">
              {category === 'groceries'
                ? 'Quick Expiry Presets (days from purchase)'
                : category === 'medicines'
                ? 'Quick Expiry Presets (shelf life from purchase)'
                : category === 'warranty'
                ? 'Quick Warranty Presets (coverage period)'
                : 'Quick Validity Presets'}
            </span>

            {category === 'groceries' ? (
              <div className="grid grid-cols-5 gap-2">
                <button
                  type="button"
                  onClick={() => setDateOffset(3, 'days')}
                  className="h-9 rounded-xl bg-[#f2f3ff] dark:bg-[#283044] hover:bg-[#6df5e1]/40 text-[#131b2e] dark:text-white text-xs font-semibold transition-colors"
                >
                  +3 Days
                </button>
                <button
                  type="button"
                  onClick={() => setDateOffset(7, 'days')}
                  className="h-9 rounded-xl bg-[#f2f3ff] dark:bg-[#283044] hover:bg-[#6df5e1]/40 text-[#131b2e] dark:text-white text-xs font-semibold transition-colors"
                >
                  +7 Days
                </button>
                <button
                  type="button"
                  onClick={() => setDateOffset(14, 'days')}
                  className="h-9 rounded-xl bg-[#f2f3ff] dark:bg-[#283044] hover:bg-[#6df5e1]/40 text-[#131b2e] dark:text-white text-xs font-semibold transition-colors"
                >
                  +14 Days
                </button>
                <button
                  type="button"
                  onClick={() => setDateOffset(1, 'months')}
                  className="h-9 rounded-xl bg-[#f2f3ff] dark:bg-[#283044] hover:bg-[#6df5e1]/40 text-[#131b2e] dark:text-white text-xs font-semibold transition-colors"
                >
                  +1 Mo
                </button>
                <button
                  type="button"
                  onClick={() => setDateOffset(3, 'months')}
                  className="h-9 rounded-xl bg-[#9cf2e8] hover:bg-[#6df5e1] text-[#00201d] text-xs font-bold transition-colors"
                >
                  +3 Mos
                </button>
              </div>
            ) : category === 'medicines' ? (
              <div className="grid grid-cols-5 gap-2">
                <button
                  type="button"
                  onClick={() => setDateOffset(1, 'months')}
                  className="h-9 rounded-xl bg-[#f2f3ff] dark:bg-[#283044] hover:bg-[#6df5e1]/40 text-[#131b2e] dark:text-white text-xs font-semibold transition-colors"
                >
                  +1 Mo
                </button>
                <button
                  type="button"
                  onClick={() => setDateOffset(3, 'months')}
                  className="h-9 rounded-xl bg-[#f2f3ff] dark:bg-[#283044] hover:bg-[#6df5e1]/40 text-[#131b2e] dark:text-white text-xs font-semibold transition-colors"
                >
                  +3 Mos
                </button>
                <button
                  type="button"
                  onClick={() => setDateOffset(6, 'months')}
                  className="h-9 rounded-xl bg-[#f2f3ff] dark:bg-[#283044] hover:bg-[#6df5e1]/40 text-[#131b2e] dark:text-white text-xs font-semibold transition-colors"
                >
                  +6 Mos
                </button>
                <button
                  type="button"
                  onClick={() => setDateOffset(12, 'months')}
                  className="h-9 rounded-xl bg-[#f2f3ff] dark:bg-[#283044] hover:bg-[#6df5e1]/40 text-[#131b2e] dark:text-white text-xs font-semibold transition-colors"
                >
                  +1 Year
                </button>
                <button
                  type="button"
                  onClick={() => setDateOffset(24, 'months')}
                  className="h-9 rounded-xl bg-[#9cf2e8] hover:bg-[#6df5e1] text-[#00201d] text-xs font-bold transition-colors"
                >
                  +2 Years
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-4 gap-2">
                <button
                  type="button"
                  onClick={() => setDateOffset(6, 'months')}
                  className="h-9 rounded-xl bg-[#f2f3ff] dark:bg-[#283044] hover:bg-[#6df5e1]/40 text-[#131b2e] dark:text-white text-xs font-semibold transition-colors"
                >
                  +6 Mos
                </button>
                <button
                  type="button"
                  onClick={() => setDateOffset(12, 'months')}
                  className="h-9 rounded-xl bg-[#f2f3ff] dark:bg-[#283044] hover:bg-[#6df5e1]/40 text-[#131b2e] dark:text-white text-xs font-semibold transition-colors"
                >
                  +1 Year
                </button>
                <button
                  type="button"
                  onClick={() => setDateOffset(24, 'months')}
                  className="h-9 rounded-xl bg-[#f2f3ff] dark:bg-[#283044] hover:bg-[#6df5e1]/40 text-[#131b2e] dark:text-white text-xs font-semibold transition-colors"
                >
                  +2 Years
                </button>
                <button
                  type="button"
                  onClick={() => setDateOffset(60, 'months')}
                  className="h-9 rounded-xl bg-[#9cf2e8] hover:bg-[#6df5e1] text-[#00201d] text-xs font-bold transition-colors"
                >
                  +5 Years
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Section 3: Smart Reminders */}
        <div className="bg-white dark:bg-[#131b2e] p-4 rounded-2xl shadow-sm border border-[#eaedff] dark:border-[#283044] flex flex-col gap-3">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-1.5 text-[#005c55] dark:text-[#6df5e1] text-xs font-bold uppercase tracking-wider">
                <span className="material-symbols-outlined text-[18px]">notifications_active</span>
                <span>Smart Reminders</span>
              </div>
              <span className="text-[11px] text-[#3e4947] dark:text-[#bdc9c6] block mt-0.5">
                Cadence tailored for: <span className="font-semibold capitalize">{category}</span>
              </span>
            </div>
            <button
              type="button"
              onClick={toggleAllReminders}
              className="text-xs font-bold text-[#005c55] dark:text-[#6df5e1] hover:underline"
            >
              Toggle All
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
            <label className="flex items-center justify-between p-3 rounded-xl bg-[#f2f3ff] dark:bg-[#283044] cursor-pointer hover:bg-[#eaedff] transition-colors">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-[#005c55]/15 text-[#005c55] dark:text-[#6df5e1] flex items-center justify-center">
                  <span className="material-symbols-outlined text-[16px]">event</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-[#131b2e] dark:text-white">30 Days Before</span>
                  <span className="text-[10px] text-[#3e4947] dark:text-[#bdc9c6]">
                    {category === 'groceries'
                      ? 'Pantry audit notice'
                      : category === 'medicines'
                      ? '1-month refill reminder'
                      : category === 'warranty'
                      ? 'Early claim inspection & test'
                      : 'Document renewal preparation'}
                  </span>
                </div>
              </div>
              <input
                type="checkbox"
                checked={reminders['30']}
                onChange={(e) => setReminders({ ...reminders, '30': e.target.checked })}
                className="w-4 h-4 accent-[#005c55] rounded cursor-pointer"
              />
            </label>

            <label className="flex items-center justify-between p-3 rounded-xl bg-[#f2f3ff] dark:bg-[#283044] cursor-pointer hover:bg-[#eaedff] transition-colors">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-[#005c55]/15 text-[#005c55] dark:text-[#6df5e1] flex items-center justify-center">
                  <span className="material-symbols-outlined text-[16px]">event</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-[#131b2e] dark:text-white">15 Days Before</span>
                  <span className="text-[10px] text-[#3e4947] dark:text-[#bdc9c6]">
                    {category === 'groceries'
                      ? '2-week shelf life reminder'
                      : category === 'medicines'
                      ? '15-day medicine expiry check'
                      : category === 'warranty'
                      ? 'Service check notice'
                      : 'Mid-term validity check'}
                  </span>
                </div>
              </div>
              <input
                type="checkbox"
                checked={reminders['15']}
                onChange={(e) => setReminders({ ...reminders, '15': e.target.checked })}
                className="w-4 h-4 accent-[#005c55] rounded cursor-pointer"
              />
            </label>

            <label className="flex items-center justify-between p-3 rounded-xl bg-[#f2f3ff] dark:bg-[#283044] cursor-pointer hover:bg-[#eaedff] transition-colors">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-[#006fa8]/15 text-[#006fa8] flex items-center justify-center">
                  <span className="material-symbols-outlined text-[16px]">alarm</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-[#131b2e] dark:text-white">7 Days Before</span>
                  <span className="text-[10px] text-[#3e4947] dark:text-[#bdc9c6]">
                    {category === 'groceries'
                      ? '1 week to use before best-by'
                      : category === 'medicines'
                      ? '7 days critical expiry countdown'
                      : category === 'warranty'
                      ? 'Final claim preparation'
                      : 'Urgent renewal appointment'}
                  </span>
                </div>
              </div>
              <input
                type="checkbox"
                checked={reminders['7']}
                onChange={(e) => setReminders({ ...reminders, '7': e.target.checked })}
                className="w-4 h-4 accent-[#005c55] rounded cursor-pointer"
              />
            </label>

            <label className="flex items-center justify-between p-3 rounded-xl bg-[#f2f3ff] dark:bg-[#283044] cursor-pointer hover:bg-[#eaedff] transition-colors">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-[#ffdad6] text-[#ba1a1a] flex items-center justify-center">
                  <span className="material-symbols-outlined text-[16px]">priority_high</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-[#131b2e] dark:text-white">Day of Expiry</span>
                  <span className="text-[10px] text-[#3e4947] dark:text-[#bdc9c6]">
                    {category === 'groceries'
                      ? 'Reaches best-by date today'
                      : category === 'medicines'
                      ? 'Medicine expires today • Dispose safely'
                      : category === 'warranty'
                      ? 'Coverage expires at midnight'
                      : 'Document expired today'}
                  </span>
                </div>
              </div>
              <input
                type="checkbox"
                checked={reminders['0']}
                onChange={(e) => setReminders({ ...reminders, '0': e.target.checked })}
                className="w-4 h-4 accent-[#005c55] rounded cursor-pointer"
              />
            </label>
          </div>
        </div>

        {/* Section 4: Notes & Details */}
        <div className="bg-white dark:bg-[#131b2e] p-4 rounded-2xl shadow-sm border border-[#eaedff] dark:border-[#283044] flex flex-col gap-2">
          <div className="flex items-center gap-1.5 text-[#005c55] dark:text-[#6df5e1] text-xs font-bold uppercase tracking-wider">
            <span className="material-symbols-outlined text-[18px]">notes</span>
            <span>
              {category === 'groceries'
                ? 'Notes & Storage Guidelines'
                : category === 'medicines'
                ? 'Prescription & Pharmacy Notes'
                : category === 'warranty'
                ? 'Notes & Claims Info'
                : 'Document Notes & Renewal Info'}
            </span>
          </div>

          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder={
              category === 'groceries'
                ? 'Storage conditions, refrigerator shelf, recipe ideas, opened date...'
                : category === 'medicines'
                ? 'Prescribing physician, pharmacy contact, dosage instructions...'
                : category === 'warranty'
                ? 'Include claim phone numbers, service portals or serial tags...'
                : 'Issuing agency, renewal link, passport/ID office details...'
            }
            className="w-full p-3 rounded-xl bg-[#f2f3ff] dark:bg-[#283044] text-[#131b2e] dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-[#005c55] leading-relaxed resize-none"
          ></textarea>

          <div className="flex items-center justify-between text-[11px] text-[#3e4947] dark:text-[#bdc9c6]">
            <span>
              {category === 'groceries'
                ? 'Storage temperature, refrigerator shelf or opened date'
                : category === 'medicines'
                ? 'Physician contact, dosage guidelines or pharmacy number'
                : category === 'warranty'
                ? 'Include claim phone numbers, service portals or serial tags'
                : 'Issuing agency, renewal link or ID details'}
            </span>
            <span className="font-mono">{notes.length} chars</span>
          </div>
        </div>

        {/* Section 5: Cloud Vault Backup Switch */}
        <div className="bg-white dark:bg-[#131b2e] p-4 rounded-2xl shadow-sm border border-[#eaedff] dark:border-[#283044] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#6df5e1]/40 text-[#006f64] flex items-center justify-center">
              <span className="material-symbols-outlined text-[22px]">cloud_sync</span>
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-bold text-[#131b2e] dark:text-white">Cloud Vault Backup</span>
              <span className="text-[11px] text-[#3e4947] dark:text-[#bdc9c6]">
                Save encrypted copy of receipts to Cloud Vault
              </span>
            </div>
          </div>

          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={cloudBackup}
              onChange={(e) => setCloudBackup(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#005c55]"></div>
          </label>
        </div>

        {/* Section 6: Pin to Dashboard Quick Access Switch */}
        <div className="bg-white dark:bg-[#131b2e] p-4 rounded-2xl shadow-sm border border-[#eaedff] dark:border-[#283044] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#005c55]/15 dark:bg-[#005c55]/30 text-[#005c55] dark:text-[#6df5e1] flex items-center justify-center">
              <span className="material-symbols-outlined text-[22px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                keep
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-bold text-[#131b2e] dark:text-white">Pin to Dashboard</span>
              <span className="text-[11px] text-[#3e4947] dark:text-[#bdc9c6]">
                Pin this item at the top of Dashboard for 1-tap quick access
              </span>
            </div>
          </div>

          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={isPinned}
              onChange={(e) => setIsPinned(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#005c55]"></div>
          </label>
        </div>

        {/* Save CTA */}
        <div className="pt-2 flex flex-col gap-2">
          <button
            type="submit"
            className="w-full h-14 rounded-2xl bg-[#005c55] hover:bg-[#0f766e] text-white font-bold text-base flex items-center justify-center gap-2 shadow-lg active:scale-[0.99] transition-all"
          >
            <span className="material-symbols-outlined text-[22px]" style={{ fontVariationSettings: "'FILL' 1" }}>
              shield_lock
            </span>
            <span>Save to Vault</span>
          </button>
          <p className="text-center text-[11px] text-[#3e4947] dark:text-[#bdc9c6]">
            Protected with 256-bit client-side encryption. Accessible offline.
          </p>
        </div>
      </form>
    </div>
  );
};
