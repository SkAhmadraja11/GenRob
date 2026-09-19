// Trade Vocabulary Engine: Indian Kirana & Wholesale Trade Units & Vernacular Lexicon

export interface TradeUnit {
  id: string;
  nameEn: string;
  nameHi: string;
  nameTe: string;
  defaultMultiplier: number;
  baseUnit: 'kg' | 'litre' | 'piece' | 'packet';
}

export const TRADE_UNITS: Record<string, TradeUnit> = {
  bag: {
    id: 'bag',
    nameEn: 'Bag / Bora',
    nameHi: 'बोरा / कट्टा',
    nameTe: 'బస్తా / కట్టా',
    defaultMultiplier: 50,
    baseUnit: 'kg',
  },
  tin: {
    id: 'tin',
    nameEn: 'Tin / Pipa',
    nameHi: 'टिन / पीपा',
    nameTe: 'డబ్బా / టిన్',
    defaultMultiplier: 15,
    baseUnit: 'litre',
  },
  carton: {
    id: 'carton',
    nameEn: 'Carton / Peti',
    nameHi: 'कार्टन / पेटी',
    nameTe: 'బాక్స్ / పేటి',
    defaultMultiplier: 24,
    baseUnit: 'piece',
  },
  patti: {
    id: 'patti',
    nameEn: 'Patti / Dozen',
    nameHi: 'पट्टी / दर्जन',
    nameTe: 'డజన్ / పట్టీ',
    defaultMultiplier: 12,
    baseUnit: 'piece',
  },
  kg: {
    id: 'kg',
    nameEn: 'Kilogram (kg)',
    nameHi: 'किलो (kg)',
    nameTe: 'కిలో (kg)',
    defaultMultiplier: 1,
    baseUnit: 'kg',
  },
  quintal: {
    id: 'quintal',
    nameEn: 'Quintal (100kg)',
    nameHi: 'क्विंटल (100 किलो)',
    nameTe: 'క్వింటాల్',
    defaultMultiplier: 100,
    baseUnit: 'kg',
  },
  litre: {
    id: 'litre',
    nameEn: 'Litre (L)',
    nameHi: 'लीटर',
    nameTe: 'లీటర్',
    defaultMultiplier: 1,
    baseUnit: 'litre',
  },
  packet: {
    id: 'packet',
    nameEn: 'Packet / Pouch',
    nameHi: 'पैकेट',
    nameTe: 'పాకెట్',
    defaultMultiplier: 1,
    baseUnit: 'packet',
  },
  piece: {
    id: 'piece',
    nameEn: 'Piece (pc)',
    nameHi: 'पीस (नग)',
    nameTe: 'ముక్క / పీస్',
    defaultMultiplier: 1,
    baseUnit: 'piece',
  },
};

// Convert colloquial words for quantities (Hindi, Telugu, Hinglish)
export const VERNACULAR_FRACTIONS: Record<string, number> = {
  paav: 0.25,
  pav: 0.25,
  'पाव': 0.25,
  aadha: 0.5,
  adha: 0.5,
  'आधा': 0.5,
  'సగం': 0.5,
  sawa: 1.25,
  'सवा': 1.25,
  dedh: 1.5,
  derh: 1.5,
  'डेढ़': 1.5,
  dhaai: 2.5,
  dhai: 2.5,
  'ढाई': 2.5,
};

// Calculate base unit quantity using product's specific conversion JSON or global defaults
export function calculateBaseQuantity(
  qty: number,
  unit: string,
  baseUnit: string,
  customConversions?: Record<string, number>
): number {
  if (unit === baseUnit) return qty;

  // Check product-specific custom conversion JSONB
  if (customConversions && customConversions[unit] !== undefined) {
    return qty * customConversions[unit];
  }

  // Fallback to global trade unit default
  const standard = TRADE_UNITS[unit];
  if (standard) {
    return qty * standard.defaultMultiplier;
  }

  return qty;
}

// Format quantity with unit for friendly vernacular display
export function formatTradeQty(
  qty: number,
  unit: string,
  baseUnit: string,
  customConversions?: Record<string, number>,
  language: 'hi' | 'te' | 'en' = 'hi'
): string {
  const tradeUnit = TRADE_UNITS[unit];
  const unitLabel = tradeUnit
    ? language === 'hi'
      ? tradeUnit.nameHi
      : language === 'te'
      ? tradeUnit.nameTe
      : tradeUnit.nameEn
    : unit;

  const baseQty = calculateBaseQuantity(qty, unit, baseUnit, customConversions);

  if (unit !== baseUnit && baseQty !== qty) {
    return `${qty} ${unitLabel} (${baseQty} ${baseUnit})`;
  }

  return `${qty} ${unitLabel}`;
}
