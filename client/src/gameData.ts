// Shared game data for client-side rendering
// Mirrors server/src/gameData.ts

export type PropertyGroup =
  | 'brown' | 'cyan' | 'pink' | 'orange'
  | 'red' | 'yellow' | 'green' | 'blue'
  | 'station' | 'utility' | 'special';

export type TileType =
  | 'go' | 'property' | 'station' | 'utility' | 'special_property'
  | 'tax' | 'bank_tax' | 'lucky_chest' | 'luck_card'
  | 'jail' | 'go_to_jail' | 'collect_pot' | 'switch_position';

export interface TileData {
  id: number;
  name: string;
  nameEn: string;
  type: TileType;
  price?: number;
  group?: PropertyGroup;
}

export const BOARD_TILES: TileData[] = [
  { id: 0, name: 'انطلاق', nameEn: 'GO', type: 'go' },
  { id: 1, name: 'مدينة الشعب', nameEn: 'Al-Shaab', type: 'property', price: 60000, group: 'brown' },
  { id: 2, name: 'صندوق اللعبة', nameEn: 'Lucky Chest', type: 'lucky_chest' },
  { id: 3, name: 'مدينة الحرية', nameEn: 'Al-Hurriya', type: 'property', price: 60000, group: 'brown' },
  { id: 4, name: 'ضريبة', nameEn: 'Tax', type: 'tax' },
  { id: 5, name: 'مطار بغداد', nameEn: 'Baghdad Airport', type: 'station', price: 300000, group: 'station' },
  { id: 6, name: 'بغداد الجديدة', nameEn: 'New Baghdad', type: 'property', price: 120000, group: 'cyan' },
  { id: 7, name: 'زيونة', nameEn: 'Zayoona', type: 'property', price: 140000, group: 'cyan' },
  { id: 8, name: 'حظك', nameEn: 'Luck Card', type: 'luck_card' },
  { id: 9, name: 'الكرادة الشرقية', nameEn: 'E. Karrada', type: 'property', price: 160000, group: 'cyan' },
  { id: 10, name: 'السجن', nameEn: 'Jail', type: 'jail' },
  { id: 11, name: 'المنصور', nameEn: 'Al-Mansour', type: 'property', price: 220000, group: 'pink' },
  { id: 12, name: 'الجادرية', nameEn: 'Al-Jadriya', type: 'property', price: 220000, group: 'pink' },
  { id: 13, name: 'نادي العلوية', nameEn: 'Alwiyah Club', type: 'special_property', price: 500000, group: 'special' },
  { id: 14, name: 'اليرموك', nameEn: 'Al-Yarmouk', type: 'property', price: 260000, group: 'pink' },
  { id: 15, name: 'محطة القطارات', nameEn: 'Train Station', type: 'station', price: 300000, group: 'station' },
  { id: 16, name: 'العامرية', nameEn: 'Al-Amiriya', type: 'property', price: 300000, group: 'orange' },
  { id: 17, name: 'صندوق اللعبة', nameEn: 'Lucky Chest', type: 'lucky_chest' },
  { id: 18, name: 'الدورة', nameEn: 'Al-Dora', type: 'property', price: 320000, group: 'orange' },
  { id: 19, name: 'البياع', nameEn: 'Al-Bayaa', type: 'property', price: 340000, group: 'orange' },
  { id: 20, name: 'اجمع الصندوق', nameEn: 'Collect Pot', type: 'collect_pot' },
  { id: 21, name: 'الغزالية', nameEn: 'Al-Ghazaliya', type: 'property', price: 380000, group: 'red' },
  { id: 22, name: 'حظك', nameEn: 'Luck Card', type: 'luck_card' },
  { id: 23, name: 'العدل', nameEn: 'Al-Adl', type: 'property', price: 400000, group: 'red' },
  { id: 24, name: 'العطيفية', nameEn: 'Al-Atifiya', type: 'property', price: 420000, group: 'red' },
  { id: 25, name: 'مرسى دجلة', nameEn: 'Tigris Dock', type: 'station', price: 300000, group: 'station' },
  { id: 26, name: 'الحارثية', nameEn: 'Al-Harithiya', type: 'property', price: 460000, group: 'yellow' },
  { id: 27, name: 'المنطقة الخضراء', nameEn: 'Green Zone', type: 'property', price: 500000, group: 'yellow' },
  { id: 28, name: 'الوطني للانترنيت', nameEn: 'Nat. Internet', type: 'utility', price: 450000, group: 'utility' },
  { id: 29, name: 'الكرادة داخل', nameEn: 'Inner Karrada', type: 'property', price: 520000, group: 'yellow' },
  { id: 30, name: 'روح للسجن', nameEn: 'Go To Jail', type: 'go_to_jail' },
  { id: 31, name: 'مجمع البدور', nameEn: 'Al-Budoor', type: 'property', price: 650000, group: 'green' },
  { id: 32, name: 'بوابة العراق', nameEn: 'Gateway Iraq', type: 'property', price: 670000, group: 'green' },
  { id: 33, name: 'صندوق اللعبة', nameEn: 'Lucky Chest', type: 'lucky_chest' },
  { id: 34, name: 'حي الجامعة', nameEn: 'University', type: 'property', price: 700000, group: 'green' },
  { id: 35, name: 'كراج النهضة', nameEn: 'Nahda Garage', type: 'station', price: 300000, group: 'station' },
  { id: 36, name: 'تبديل موقع', nameEn: 'Switch Position', type: 'switch_position' },
  { id: 37, name: 'شارع الأميرات', nameEn: 'Princesses St', type: 'property', price: 900000, group: 'blue' },
  { id: 38, name: 'ضريبة البنك', nameEn: 'Bank Tax', type: 'bank_tax' },
  { id: 39, name: 'العرصات', nameEn: 'Al-Arasat', type: 'property', price: 1000000, group: 'blue' },
];

export const GROUP_COLORS: Record<PropertyGroup, string> = {
  brown: '#8B4513',
  cyan: '#00CED1',
  pink: '#FF69B4',
  orange: '#FF8C00',
  red: '#DC143C',
  yellow: '#FFD700',
  green: '#228B22',
  blue: '#1a1a8a',
  station: '#555555',
  utility: '#808080',
  special: '#800080',
};

export const PLAYER_PIECES = [
  { id: 'taxi', emoji: '\u{1F695}', name: 'تاكسي' },
  { id: 'tuktuk', emoji: '\u{1F6FA}', name: 'توك توك' },
  { id: 'police', emoji: '\u{1F693}', name: 'شرطة' },
  { id: 'tea', emoji: '\u{2615}', name: 'استكان شاي' },
  { id: 'mosque', emoji: '\u{1F54C}', name: 'جامع' },
  { id: 'satellite', emoji: '\u{1F4E1}', name: 'برج انترنت' },
  { id: 'palm', emoji: '\u{1F334}', name: 'نخلة' },
  { id: 'football', emoji: '\u{26BD}', name: 'كرة قدم' },
  { id: 'kebab', emoji: '\u{1F362}', name: 'كباب' },
  { id: 'star', emoji: '\u{2B50}', name: 'نجمة' },
];

export function formatMoney(amount: number): string {
  if (amount >= 1000000) return `${(amount / 1000000).toFixed(1)}M`;
  if (amount >= 1000) return `${Math.floor(amount / 1000)}K`;
  return amount.toString();
}

// Card data for display in tile detail popup
export interface CardInfo {
  id: number;
  title: string;
  description: string;
}

export const LUCKY_CHEST_CARDS: CardInfo[] = [
  { id: 1, title: 'تقدم إلى الانطلاق', description: 'تقدم إلى خانة الانطلاق واستلم 300,000' },
  { id: 2, title: 'جائزة', description: 'ربحت جائزة! استلم 200,000 دينار' },
  { id: 3, title: 'فاتورة كهرباء', description: 'ادفع فاتورة الكهرباء 50,000 دينار' },
  { id: 4, title: 'من البنك', description: 'استلم 100,000 دينار من البنك' },
  { id: 5, title: 'خروج من السجن', description: 'بطاقة خروج من السجن - احتفظ بها' },
  { id: 6, title: 'غرامة', description: 'ادفع 150,000 للصندوق' },
  { id: 7, title: 'عيد ميلاد', description: 'عيد ميلادك! استلم 50,000 من كل لاعب' },
  { id: 8, title: 'أرباح تجارية', description: 'استلم 150,000 دينار أرباح تجارية' },
  { id: 9, title: 'غرامة مرورية', description: 'ادفع 100,000 غرامة مرورية' },
  { id: 10, title: 'تقدم', description: 'تقدم 3 خطوات' },
  { id: 11, title: 'ميراث', description: 'استلم 250,000 ميراث' },
  { id: 12, title: 'رسوم تسجيل', description: 'ادفع 75,000 رسوم تسجيل' },
  { id: 13, title: 'مسابقة', description: 'فزت بالمسابقة! استلم 100,000' },
  { id: 14, title: 'ترميمات', description: 'ادفع ترميمات: 40K لكل بيت و 115K لكل فندق' },
  { id: 15, title: 'تراجع', description: 'تراجع 3 خطوات' },
  { id: 16, title: 'استرداد ضريبي', description: 'استلم 50,000 استرداد ضريبي' },
  { id: 17, title: 'مستشفى', description: 'ادفع 200,000 رسوم مستشفى' },
  { id: 18, title: 'أقرب محطة', description: 'تقدم إلى أقرب محطة' },
  { id: 19, title: 'أرباح أسهم', description: 'استلم 80,000 أرباح أسهم' },
  { id: 20, title: 'دفع للاعبين', description: 'ادفع 25,000 لكل لاعب' },
];

export const LUCK_CARDS: CardInfo[] = [
  { id: 1, title: 'سجن', description: 'روح للسجن مباشرة!' },
  { id: 2, title: 'انطلاق', description: 'تقدم إلى خانة الانطلاق' },
  { id: 3, title: 'ادفع للاعبين', description: 'ادفع 50,000 لكل لاعب' },
  { id: 4, title: 'استلم من اللاعبين', description: 'استلم 50,000 من كل لاعب' },
  { id: 5, title: 'خروج من السجن', description: 'بطاقة خروج من السجن' },
  { id: 6, title: 'المنصور', description: 'تقدم إلى المنصور' },
  { id: 7, title: 'غرامة', description: 'ادفع 100,000 غرامة' },
  { id: 8, title: 'تراجع', description: 'تراجع 2 خطوات' },
  { id: 9, title: 'من البنك', description: 'استلم 300,000 من البنك' },
  { id: 10, title: 'ترميمات', description: 'ادفع ترميمات: 25K لكل بيت و 100K لكل فندق' },
  { id: 11, title: 'أقرب محطة', description: 'تقدم إلى أقرب محطة' },
  { id: 12, title: 'هدية', description: 'استلم 150,000 هدية' },
  { id: 13, title: 'الكرادة داخل', description: 'تقدم إلى الكرادة داخل' },
  { id: 14, title: 'للصندوق', description: 'ادفع 200,000 للصندوق' },
  { id: 15, title: 'تقدم', description: 'تقدم 5 خطوات' },
  { id: 16, title: 'من البنك', description: 'استلم 75,000 من البنك' },
  { id: 17, title: 'ضريبة تعليم', description: 'ادفع 150,000 ضريبة تعليم' },
  { id: 18, title: 'شارع الأميرات', description: 'تقدم إلى شارع الأميرات' },
  { id: 19, title: 'جائزة', description: 'استلم 200,000 جائزة' },
  { id: 20, title: 'للصندوق', description: 'ادفع 50,000 للصندوق' },
];

export function getTilePosition(tileId: number): { row: number; col: number; side: string } {
  if (tileId >= 0 && tileId <= 10) return { row: 10, col: 10 - tileId, side: 'bottom' };
  if (tileId >= 11 && tileId <= 19) return { row: 10 - (tileId - 10), col: 0, side: 'left' };
  if (tileId === 20) return { row: 0, col: 0, side: 'corner' };
  if (tileId >= 21 && tileId <= 29) return { row: 0, col: tileId - 20, side: 'top' };
  if (tileId === 30) return { row: 0, col: 10, side: 'corner' };
  if (tileId >= 31 && tileId <= 39) return { row: tileId - 30, col: 10, side: 'right' };
  return { row: 0, col: 0, side: 'bottom' };
}
