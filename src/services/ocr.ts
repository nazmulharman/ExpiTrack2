import { OCRResult } from '../types';

export const SCAN_PRESETS: { id: string; label: string; image: string; result: OCRResult }[] = [
  {
    id: 'rx-label',
    label: '💊 Prescription Pill Bottle',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuD6NfAnzwuuSuw5u6JB86NWoMc-dFZMVjKzQ-MvsfeO8i6Wvv07D1mcIKYi9wgOxWJ76ls2BknOg5vDxg7evRw7vRSvXd3HJVIiS3K-keudCVmNnp6E2mUCJCn6UD6XTCLnb8TfVJmhVxvqtZHjKbcIbE3Z5z-ofJl49QCHtNB3cGZzwZA11FBeV2FrnxOvB8s7jeR2NmI9FObgJ-6Gati1Yw6OS43BH-_p9CUBJCXCuVB2w3rYO57M',
    result: {
      productName: 'Amoxicillin 500mg',
      expiryDate: '2025-11-14',
      category: 'medicines',
      subCategory: 'Antibiotics / Meds',
      storageLocation: 'Medicine Cabinet',
      vendor: 'Walgreens Pharmacy',
      batchNumber: 'AMX-409B',
      confidence: 99.4,
      notes: 'Prescribed dosage: 1 capsule 3x daily with water. Keep tightly closed.',
      detectedElements: ['Amoxicillin 500mg (99.4%)', 'Exp: Nov 14, 2025', 'Batch: AMX-409B', 'Rx Verified'],
    },
  },
  {
    id: 'bestbuy-receipt',
    label: '🧾 Best Buy Electronics Receipt',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBqtNRUcg_UQjr_Ii1XEb0kOa9fzm_-fSmTe9sZDnjs7I21e3HC6cjU1ZIrgDUn4QptCX9bZS6t6N6E15lB4rRZppE3a66qP-wrTwwbTXJygv_4cWRvNb-f4Ah81gRNBd56-MVu4ivtziHFxTf6yQR5ddCeaOWJyna4vuGhMeYkOQeUhALfZtIas-ING_gvusvBsTX2oSvHfe28yNLuP9v79thP9VtGCS64hLEXfoMdkq5NOc6uDe8s',
    result: {
      productName: 'Sony WH-1000XM5 Wireless Headphones',
      expiryDate: '2025-10-26',
      category: 'warranty',
      subCategory: 'Electronics & Audio',
      storageLocation: 'Home Studio',
      vendor: 'Best Buy Store #706',
      serialNumber: '84920481-XM5',
      confidence: 98.2,
      notes: 'Purchase receipt amount $399.99. 2-Year Manufacturer warranty active.',
      detectedElements: ['Sony WH-1000XM5', 'Total: $431.99', 'Date: 10/26/2023', 'Serial: 84920481-XM5'],
    },
  },
  {
    id: 'oat-milk',
    label: '🥛 Grocery Carton Stamp',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuA96yLCGUNlr4FttqyykrDj92kMj56UQz9FPGDi60J6Fu7GeSSWcbx3FK9lJ-KZPJtCAGFMBzlHWTvyo7a1r5xjhVle3uz0jCt304XdLOlOqQfLH_Ko3pNleFasW2RIE-o7FEyGUlMvS38pgjKNfwWDozXW4czxnoDmB1dAH9o27Qz7IeaKAcub8mpT_0gZjdG_Pz5fvjYnZLflzrBE7tjLhU34RLETabgQTybcsx5zTnZgyYTFqmHy',
    result: {
      productName: 'Organic Oat Milk',
      expiryDate: '2024-10-28',
      category: 'groceries',
      subCategory: 'Plant-Based Beverage',
      storageLocation: 'Pantry Left',
      vendor: 'Trader Joe’s',
      confidence: 97.6,
      notes: 'Best by stamp read successfully: Oct 28, 2024.',
      detectedElements: ['Organic Oat Milk Barista', 'EXP OCT 28 2024', 'UPC: 00928341'],
    },
  },
  {
    id: 'refrigerator-deed',
    label: '⚡ Appliance Warranty Deed',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCfCaxATu4sf-75iJyggHzIkCSnFOY0ixkzrq2CPc84_XQa0G4giBgH4yh9c-BvYbU6CnK6T7lEz28AtVX7y0O8hDScpHYg2ofmFPINzCBUdmqpRDf61ljyzK9rPIu4-_0lPeNNy6Kbo2U7gFr2uykZpPvmu_ZJWQQK1surSLySmV8YGRHfXHgHi7AXLji4o-i6V4ggQrAT_FBzruPhfWT-mjCaF0ZUd3a93UaJkYp8mQrP1ObFrUOZ',
    result: {
      productName: 'LG Smart Inverter Refrigerator 420L',
      expiryDate: '2026-10-15',
      category: 'warranty',
      subCategory: 'Home Appliances',
      storageLocation: 'Kitchen / Home',
      vendor: 'Home Depot',
      serialNumber: 'LG-INV-420-9948',
      confidence: 98.9,
      notes: '3-Year general parts warranty + 10-Year inverter compressor guarantee.',
      detectedElements: ['LG Smart Inverter 420L', 'Warranty Period: 36 Months', 'Stamp Verified'],
    },
  },
];

export async function simulateOCRScan(imageSource?: string): Promise<OCRResult> {
  // Simulate intelligent scan processing latency
  await new Promise(resolve => setTimeout(resolve, 800));

  // If matched to a preset, return that preset
  if (imageSource) {
    const found = SCAN_PRESETS.find(p => p.image === imageSource);
    if (found) return found.result;
  }

  // Fallback intelligent extraction
  const nextMonth = new Date();
  nextMonth.setDate(nextMonth.getDate() + 30);
  const yyyy = nextMonth.getFullYear();
  const mm = String(nextMonth.getMonth() + 1).padStart(2, '0');
  const dd = String(nextMonth.getDate()).padStart(2, '0');

  return {
    productName: 'Smart Scanned Product',
    expiryDate: `${yyyy}-${mm}-${dd}`,
    category: 'groceries',
    subCategory: 'Packaged Goods',
    storageLocation: 'Pantry Shelf',
    vendor: 'Retail Store',
    confidence: 96.5,
    notes: 'Auto-extracted from uploaded photo via ExpiTrack Optical Engine.',
    detectedElements: ['Product Name Anchor Locked', `Exp Date: ${yyyy}-${mm}-${dd}`, 'Barcode Verified'],
  };
}
