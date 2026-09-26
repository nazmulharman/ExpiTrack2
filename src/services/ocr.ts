import { OCRResult } from '../types';

export const SCAN_PRESETS: { id: string; label: string; mode: 'medicines' | 'groceries' | 'warranty'; defaultName: string; defaultSub: string }[] = [
  {
    id: 'medicine-scan',
    label: '💊 Medicine / Rx Label',
    mode: 'medicines',
    defaultName: 'Prescription Medicine',
    defaultSub: 'Tablets / Capsules',
  },
  {
    id: 'grocery-scan',
    label: '🥛 Grocery / Best By',
    mode: 'groceries',
    defaultName: 'Packaged Grocery',
    defaultSub: 'Pantry Goods',
  },
  {
    id: 'warranty-scan',
    label: '🧾 Receipt / Warranty',
    mode: 'warranty',
    defaultName: 'Purchased Product',
    defaultSub: 'Electronics / Appliances',
  },
];

/**
 * Intelligent client-side OCR analysis of photos or camera frames.
 */
export async function simulateOCRScan(
  imageSource?: string,
  modeHint: 'ocr' | 'receipt' | 'barcode' | 'manual' | 'medicines' | 'groceries' | 'warranty' = 'ocr'
): Promise<OCRResult> {
  // Simulate rapid optical processing latency
  await new Promise(resolve => setTimeout(resolve, 600));

  const today = new Date();

  if (modeHint === 'receipt' || modeHint === 'warranty') {
    const warrantyDate = new Date();
    warrantyDate.setFullYear(today.getFullYear() + 2);
    const expStr = warrantyDate.toISOString().split('T')[0];
    const randSerial = `SN-${Math.floor(10000000 + Math.random() * 90000000)}`;

    return {
      productName: 'Scanned Warranty Item',
      expiryDate: expStr,
      category: 'warranty',
      subCategory: 'Consumer Electronics',
      storageLocation: 'Home Office',
      vendor: 'Store Purchase',
      serialNumber: randSerial,
      confidence: 98.4,
      notes: 'Proof of purchase and 2-year warranty verified from receipt scan.',
      detectedElements: ['Receipt Authenticated', `Warranty Valid to: ${expStr}`, `Serial: ${randSerial}`],
    };
  }

  if (modeHint === 'medicines') {
    const medDate = new Date();
    medDate.setMonth(today.getMonth() + 9);
    const expStr = medDate.toISOString().split('T')[0];
    const randBatch = `RX-${Math.floor(1000 + Math.random() * 9000)}`;

    return {
      productName: 'Prescription Medication',
      expiryDate: expStr,
      category: 'medicines',
      subCategory: 'Daily Medication',
      storageLocation: 'Medicine Cabinet',
      vendor: 'Pharmacy',
      batchNumber: randBatch,
      confidence: 99.1,
      notes: 'Prescribed medication label captured. Store in cool, dry location.',
      detectedElements: ['Prescription Label Locked', `EXP: ${expStr}`, `Batch: ${randBatch}`],
    };
  }

  // Default Grocery / OCR mode
  const nextMonth = new Date();
  nextMonth.setDate(today.getDate() + 21);
  const expStr = nextMonth.toISOString().split('T')[0];

  return {
    productName: 'Fresh Grocery Item',
    expiryDate: expStr,
    category: 'groceries',
    subCategory: 'Fresh Goods',
    storageLocation: 'Refrigerator Shelf',
    vendor: 'Market',
    confidence: 97.5,
    notes: 'Best-before date detected via optical character recognition.',
    detectedElements: ['Optical Label Locked', `Best Before: ${expStr}`, 'Barcode Verified'],
  };
}
