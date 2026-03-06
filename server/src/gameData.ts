// ========================================
// Baghdad Monopoly - Game Data
// ========================================

export type TileType =
  | 'go'
  | 'property'
  | 'station'
  | 'utility'
  | 'special_property'
  | 'tax'
  | 'bank_tax'
  | 'lucky_chest'
  | 'luck_card'
  | 'jail'
  | 'go_to_jail'
  | 'collect_pot'
  | 'switch_position';

export type PropertyGroup =
  | 'brown'
  | 'cyan'
  | 'pink'
  | 'orange'
  | 'red'
  | 'yellow'
  | 'green'
  | 'blue'
  | 'station'
  | 'utility'
  | 'special';

export interface PropertyData {
  price: number;
  baseRent: number;
  rent1House: number;
  rent2House: number;
  rent3House: number;
  rent4House: number;
  rentHotel: number;
  houseCost: number;
  group: PropertyGroup;
  groupSize: number;
}

export interface TileData {
  id: number;
  name: string;
  nameEn: string;
  type: TileType;
  property?: PropertyData;
}

// House costs per group
const HOUSE_COSTS: Record<string, number> = {
  brown: 50_000,
  cyan: 50_000,
  pink: 100_000,
  orange: 100_000,
  red: 150_000,
  yellow: 150_000,
  green: 200_000,
  blue: 200_000,
};

export const BOARD_TILES: TileData[] = [
  // === ROW 1 (Bottom: tiles 0-9) ===
  {
    id: 0, name: 'انطلاق', nameEn: 'GO', type: 'go',
  },
  {
    id: 1, name: 'مدينة الشعب', nameEn: 'Al-Shaab City', type: 'property',
    property: { price: 60_000, baseRent: 4_000, rent1House: 20_000, rent2House: 60_000, rent3House: 180_000, rent4House: 320_000, rentHotel: 450_000, houseCost: HOUSE_COSTS.brown, group: 'brown', groupSize: 2 },
  },
  {
    id: 2, name: 'صندوق اللعبة', nameEn: 'Lucky Chest', type: 'lucky_chest',
  },
  {
    id: 3, name: 'مدينة الحرية', nameEn: 'Al-Hurriya City', type: 'property',
    property: { price: 60_000, baseRent: 8_000, rent1House: 40_000, rent2House: 120_000, rent3House: 200_000, rent4House: 360_000, rentHotel: 500_000, houseCost: HOUSE_COSTS.brown, group: 'brown', groupSize: 2 },
  },
  {
    id: 4, name: 'ضريبة', nameEn: 'Tax', type: 'tax',
  },
  {
    id: 5, name: 'مطار بغداد الدولي', nameEn: 'Baghdad International Airport', type: 'station',
    property: { price: 300_000, baseRent: 50_000, rent1House: 0, rent2House: 0, rent3House: 0, rent4House: 0, rentHotel: 0, houseCost: 0, group: 'station', groupSize: 4 },
  },
  {
    id: 6, name: 'بغداد الجديدة', nameEn: 'New Baghdad', type: 'property',
    property: { price: 120_000, baseRent: 12_000, rent1House: 60_000, rent2House: 180_000, rent3House: 300_000, rent4House: 450_000, rentHotel: 600_000, houseCost: HOUSE_COSTS.cyan, group: 'cyan', groupSize: 3 },
  },
  {
    id: 7, name: 'زيونة', nameEn: 'Zayoona', type: 'property',
    property: { price: 140_000, baseRent: 14_000, rent1House: 70_000, rent2House: 200_000, rent3House: 350_000, rent4House: 500_000, rentHotel: 650_000, houseCost: HOUSE_COSTS.cyan, group: 'cyan', groupSize: 3 },
  },
  {
    id: 8, name: 'حظك', nameEn: 'Luck Card', type: 'luck_card',
  },
  {
    id: 9, name: 'الكرادة الشرقية', nameEn: 'East Karrada', type: 'property',
    property: { price: 160_000, baseRent: 16_000, rent1House: 80_000, rent2House: 220_000, rent3House: 380_000, rent4House: 550_000, rentHotel: 700_000, houseCost: HOUSE_COSTS.cyan, group: 'cyan', groupSize: 3 },
  },
  // === CORNER: Jail (tile 10) ===
  {
    id: 10, name: 'السجن', nameEn: 'Jail', type: 'jail',
  },
  // === ROW 2 (Left: tiles 11-19) ===
  {
    id: 11, name: 'المنصور', nameEn: 'Al-Mansour', type: 'property',
    property: { price: 220_000, baseRent: 22_000, rent1House: 110_000, rent2House: 330_000, rent3House: 500_000, rent4House: 700_000, rentHotel: 900_000, houseCost: HOUSE_COSTS.pink, group: 'pink', groupSize: 3 },
  },
  {
    id: 12, name: 'الجادرية', nameEn: 'Al-Jadriya', type: 'property',
    property: { price: 220_000, baseRent: 22_000, rent1House: 110_000, rent2House: 330_000, rent3House: 500_000, rent4House: 700_000, rentHotel: 900_000, houseCost: HOUSE_COSTS.pink, group: 'pink', groupSize: 3 },
  },
  {
    id: 13, name: 'نادي العلوية', nameEn: 'Alwiyah Club', type: 'special_property',
    property: { price: 500_000, baseRent: 80_000, rent1House: 0, rent2House: 0, rent3House: 0, rent4House: 0, rentHotel: 0, houseCost: 0, group: 'special', groupSize: 1 },
  },
  {
    id: 14, name: 'اليرموك', nameEn: 'Al-Yarmouk', type: 'property',
    property: { price: 260_000, baseRent: 26_000, rent1House: 130_000, rent2House: 390_000, rent3House: 560_000, rent4House: 780_000, rentHotel: 1_000_000, houseCost: HOUSE_COSTS.pink, group: 'pink', groupSize: 3 },
  },
  {
    id: 15, name: 'محطة بغداد للقطارات', nameEn: 'Baghdad Train Station', type: 'station',
    property: { price: 300_000, baseRent: 50_000, rent1House: 0, rent2House: 0, rent3House: 0, rent4House: 0, rentHotel: 0, houseCost: 0, group: 'station', groupSize: 4 },
  },
  {
    id: 16, name: 'العامرية', nameEn: 'Al-Amiriya', type: 'property',
    property: { price: 300_000, baseRent: 28_000, rent1House: 140_000, rent2House: 400_000, rent3House: 600_000, rent4House: 800_000, rentHotel: 1_050_000, houseCost: HOUSE_COSTS.orange, group: 'orange', groupSize: 3 },
  },
  {
    id: 17, name: 'صندوق اللعبة', nameEn: 'Lucky Chest', type: 'lucky_chest',
  },
  {
    id: 18, name: 'الدورة', nameEn: 'Al-Dora', type: 'property',
    property: { price: 320_000, baseRent: 30_000, rent1House: 150_000, rent2House: 420_000, rent3House: 650_000, rent4House: 850_000, rentHotel: 1_100_000, houseCost: HOUSE_COSTS.orange, group: 'orange', groupSize: 3 },
  },
  {
    id: 19, name: 'البياع', nameEn: 'Al-Bayaa', type: 'property',
    property: { price: 340_000, baseRent: 32_000, rent1House: 160_000, rent2House: 450_000, rent3House: 680_000, rent4House: 900_000, rentHotel: 1_150_000, houseCost: HOUSE_COSTS.orange, group: 'orange', groupSize: 3 },
  },
  // === CORNER: Collect Pot (tile 20) ===
  {
    id: 20, name: 'اجمع الصندوق', nameEn: 'Collect Middle Pot', type: 'collect_pot',
  },
  // === ROW 3 (Top: tiles 21-29) ===
  {
    id: 21, name: 'الغزالية', nameEn: 'Al-Ghazaliya', type: 'property',
    property: { price: 380_000, baseRent: 36_000, rent1House: 180_000, rent2House: 500_000, rent3House: 750_000, rent4House: 1_000_000, rentHotel: 1_300_000, houseCost: HOUSE_COSTS.red, group: 'red', groupSize: 3 },
  },
  {
    id: 22, name: 'حظك', nameEn: 'Luck Card', type: 'luck_card',
  },
  {
    id: 23, name: 'العدل', nameEn: 'Al-Adl', type: 'property',
    property: { price: 400_000, baseRent: 38_000, rent1House: 190_000, rent2House: 520_000, rent3House: 780_000, rent4House: 1_050_000, rentHotel: 1_350_000, houseCost: HOUSE_COSTS.red, group: 'red', groupSize: 3 },
  },
  {
    id: 24, name: 'العطيفية', nameEn: 'Al-Atifiya', type: 'property',
    property: { price: 420_000, baseRent: 40_000, rent1House: 200_000, rent2House: 550_000, rent3House: 800_000, rent4House: 1_100_000, rentHotel: 1_400_000, houseCost: HOUSE_COSTS.red, group: 'red', groupSize: 3 },
  },
  {
    id: 25, name: 'مرسى دجلة', nameEn: 'Tigris Dock', type: 'station',
    property: { price: 300_000, baseRent: 50_000, rent1House: 0, rent2House: 0, rent3House: 0, rent4House: 0, rentHotel: 0, houseCost: 0, group: 'station', groupSize: 4 },
  },
  {
    id: 26, name: 'الحارثية', nameEn: 'Al-Harithiya', type: 'property',
    property: { price: 460_000, baseRent: 44_000, rent1House: 220_000, rent2House: 600_000, rent3House: 880_000, rent4House: 1_200_000, rentHotel: 1_500_000, houseCost: HOUSE_COSTS.yellow, group: 'yellow', groupSize: 3 },
  },
  {
    id: 27, name: 'المنطقة الخضراء', nameEn: 'Green Zone', type: 'property',
    property: { price: 500_000, baseRent: 48_000, rent1House: 240_000, rent2House: 650_000, rent3House: 950_000, rent4House: 1_300_000, rentHotel: 1_600_000, houseCost: HOUSE_COSTS.yellow, group: 'yellow', groupSize: 3 },
  },
  {
    id: 28, name: 'الوطني للانترنيت', nameEn: 'National Internet', type: 'utility',
    property: { price: 450_000, baseRent: 0, rent1House: 0, rent2House: 0, rent3House: 0, rent4House: 0, rentHotel: 0, houseCost: 0, group: 'utility', groupSize: 1 },
  },
  {
    id: 29, name: 'الكرادة داخل', nameEn: 'Inner Karrada', type: 'property',
    property: { price: 520_000, baseRent: 52_000, rent1House: 260_000, rent2House: 700_000, rent3House: 1_000_000, rent4House: 1_350_000, rentHotel: 1_700_000, houseCost: HOUSE_COSTS.yellow, group: 'yellow', groupSize: 3 },
  },
  // === CORNER: Go To Jail (tile 30) ===
  {
    id: 30, name: 'روح للسجن', nameEn: 'Go To Jail', type: 'go_to_jail',
  },
  // === ROW 4 (Right: tiles 31-39) ===
  {
    id: 31, name: 'مجمع البدور', nameEn: 'Al-Budoor Complex', type: 'property',
    property: { price: 650_000, baseRent: 56_000, rent1House: 280_000, rent2House: 750_000, rent3House: 1_100_000, rent4House: 1_400_000, rentHotel: 1_800_000, houseCost: HOUSE_COSTS.green, group: 'green', groupSize: 3 },
  },
  {
    id: 32, name: 'بوابة العراق', nameEn: 'Gateway of Iraq', type: 'property',
    property: { price: 670_000, baseRent: 58_000, rent1House: 290_000, rent2House: 780_000, rent3House: 1_150_000, rent4House: 1_450_000, rentHotel: 1_850_000, houseCost: HOUSE_COSTS.green, group: 'green', groupSize: 3 },
  },
  {
    id: 33, name: 'صندوق اللعبة', nameEn: 'Lucky Chest', type: 'lucky_chest',
  },
  {
    id: 34, name: 'حي الجامعة', nameEn: 'University District', type: 'property',
    property: { price: 700_000, baseRent: 60_000, rent1House: 300_000, rent2House: 800_000, rent3House: 1_200_000, rent4House: 1_500_000, rentHotel: 1_900_000, houseCost: HOUSE_COSTS.green, group: 'green', groupSize: 3 },
  },
  {
    id: 35, name: 'كراج النهضة', nameEn: 'Nahda Garage', type: 'station',
    property: { price: 300_000, baseRent: 50_000, rent1House: 0, rent2House: 0, rent3House: 0, rent4House: 0, rentHotel: 0, houseCost: 0, group: 'station', groupSize: 4 },
  },
  {
    id: 36, name: 'تبديل موقع', nameEn: 'Switch Position', type: 'switch_position',
  },
  {
    id: 37, name: 'شارع الأميرات', nameEn: 'Princesses Street', type: 'property',
    property: { price: 900_000, baseRent: 70_000, rent1House: 350_000, rent2House: 900_000, rent3House: 1_400_000, rent4House: 1_800_000, rentHotel: 2_200_000, houseCost: HOUSE_COSTS.blue, group: 'blue', groupSize: 2 },
  },
  {
    id: 38, name: 'ضريبة البنك', nameEn: 'Bank Tax', type: 'bank_tax',
  },
  {
    id: 39, name: 'العرصات', nameEn: 'Al-Arasat', type: 'property',
    property: { price: 1_000_000, baseRent: 80_000, rent1House: 400_000, rent2House: 1_000_000, rent3House: 1_500_000, rent4House: 2_000_000, rentHotel: 2_500_000, houseCost: HOUSE_COSTS.blue, group: 'blue', groupSize: 2 },
  },
];

// Group colors for UI
export const GROUP_COLORS: Record<PropertyGroup, string> = {
  brown: '#8B4513',
  cyan: '#00CED1',
  pink: '#FF69B4',
  orange: '#FF8C00',
  red: '#DC143C',
  yellow: '#FFD700',
  green: '#228B22',
  blue: '#00008B',
  station: '#555555',
  utility: '#808080',
  special: '#800080',
};

// Station rent scaling
export const STATION_RENT = [0, 50_000, 100_000, 200_000, 400_000];

// Utility rent multiplier (dice roll * this)
export const UTILITY_RENT_MULTIPLIER = 20_000;

// Card decks
export interface CardData {
  id: number;
  text: string;
  textEn: string;
  effect: CardEffect;
}

export type CardEffect =
  | { type: 'gain_money'; amount: number }
  | { type: 'lose_money'; amount: number }
  | { type: 'pay_each_player'; amount: number }
  | { type: 'collect_from_each_player'; amount: number }
  | { type: 'move_to'; tileId: number }
  | { type: 'move_forward'; steps: number }
  | { type: 'move_backward'; steps: number }
  | { type: 'go_to_jail' }
  | { type: 'get_out_of_jail' }
  | { type: 'pay_to_pot'; amount: number }
  | { type: 'advance_to_nearest_station' }
  | { type: 'repair_buildings'; perHouse: number; perHotel: number };

export const LUCKY_CHEST_CARDS: CardData[] = [
  { id: 1, text: 'تقدم إلى خانة الانطلاق واستلم 300,000', textEn: 'Advance to GO and collect 300,000', effect: { type: 'move_to', tileId: 0 } },
  { id: 2, text: 'ربحت جائزة! استلم 200,000 دينار', textEn: 'You won a prize! Collect 200,000', effect: { type: 'gain_money', amount: 200_000 } },
  { id: 3, text: 'ادفع فاتورة الكهرباء 50,000 دينار', textEn: 'Pay electricity bill 50,000', effect: { type: 'lose_money', amount: 50_000 } },
  { id: 4, text: 'استلم 100,000 دينار من البنك', textEn: 'Collect 100,000 from bank', effect: { type: 'gain_money', amount: 100_000 } },
  { id: 5, text: 'بطاقة خروج من السجن - احتفظ بها', textEn: 'Get out of jail free card', effect: { type: 'get_out_of_jail' } },
  { id: 6, text: 'ادفع 150,000 للصندوق', textEn: 'Pay 150,000 to the pot', effect: { type: 'pay_to_pot', amount: 150_000 } },
  { id: 7, text: 'عيد ميلادك! استلم 50,000 من كل لاعب', textEn: 'Birthday! Collect 50,000 from each player', effect: { type: 'collect_from_each_player', amount: 50_000 } },
  { id: 8, text: 'استلم 150,000 دينار أرباح تجارية', textEn: 'Collect 150,000 business profits', effect: { type: 'gain_money', amount: 150_000 } },
  { id: 9, text: 'ادفع 100,000 غرامة مرورية', textEn: 'Pay 100,000 traffic fine', effect: { type: 'pay_to_pot', amount: 100_000 } },
  { id: 10, text: 'تقدم 3 خطوات', textEn: 'Move forward 3 steps', effect: { type: 'move_forward', steps: 3 } },
  { id: 11, text: 'استلم 250,000 ميراث', textEn: 'Collect 250,000 inheritance', effect: { type: 'gain_money', amount: 250_000 } },
  { id: 12, text: 'ادفع 75,000 رسوم تسجيل', textEn: 'Pay 75,000 registration fees', effect: { type: 'lose_money', amount: 75_000 } },
  { id: 13, text: 'فزت بالمسابقة! استلم 100,000', textEn: 'Won competition! Collect 100,000', effect: { type: 'gain_money', amount: 100_000 } },
  { id: 14, text: 'ادفع ترميمات: 40,000 لكل بيت و 115,000 لكل فندق', textEn: 'Pay repairs: 40k per house, 115k per hotel', effect: { type: 'repair_buildings', perHouse: 40_000, perHotel: 115_000 } },
  { id: 15, text: 'تراجع 3 خطوات', textEn: 'Move back 3 steps', effect: { type: 'move_backward', steps: 3 } },
  { id: 16, text: 'استلم 50,000 استرداد ضريبي', textEn: 'Collect 50,000 tax refund', effect: { type: 'gain_money', amount: 50_000 } },
  { id: 17, text: 'ادفع 200,000 رسوم مستشفى', textEn: 'Pay 200,000 hospital fees', effect: { type: 'lose_money', amount: 200_000 } },
  { id: 18, text: 'تقدم إلى أقرب محطة', textEn: 'Advance to nearest station', effect: { type: 'advance_to_nearest_station' } },
  { id: 19, text: 'استلم 80,000 أرباح أسهم', textEn: 'Collect 80,000 stock dividends', effect: { type: 'gain_money', amount: 80_000 } },
  { id: 20, text: 'ادفع 25,000 لكل لاعب', textEn: 'Pay 25,000 to each player', effect: { type: 'pay_each_player', amount: 25_000 } },
];

export const LUCK_CARDS: CardData[] = [
  { id: 1, text: 'روح للسجن مباشرة!', textEn: 'Go directly to jail!', effect: { type: 'go_to_jail' } },
  { id: 2, text: 'تقدم إلى خانة الانطلاق', textEn: 'Advance to GO', effect: { type: 'move_to', tileId: 0 } },
  { id: 3, text: 'ادفع 50,000 لكل لاعب', textEn: 'Pay 50,000 to each player', effect: { type: 'pay_each_player', amount: 50_000 } },
  { id: 4, text: 'استلم 50,000 من كل لاعب', textEn: 'Collect 50,000 from each player', effect: { type: 'collect_from_each_player', amount: 50_000 } },
  { id: 5, text: 'بطاقة خروج من السجن', textEn: 'Get out of jail free card', effect: { type: 'get_out_of_jail' } },
  { id: 6, text: 'تقدم إلى المنصور', textEn: 'Advance to Al-Mansour', effect: { type: 'move_to', tileId: 11 } },
  { id: 7, text: 'ادفع 100,000 غرامة', textEn: 'Pay 100,000 fine', effect: { type: 'pay_to_pot', amount: 100_000 } },
  { id: 8, text: 'تراجع 2 خطوات', textEn: 'Move back 2 steps', effect: { type: 'move_backward', steps: 2 } },
  { id: 9, text: 'استلم 300,000 من البنك', textEn: 'Collect 300,000 from bank', effect: { type: 'gain_money', amount: 300_000 } },
  { id: 10, text: 'ادفع ترميمات: 25,000 لكل بيت و 100,000 لكل فندق', textEn: 'Pay repairs: 25k per house, 100k per hotel', effect: { type: 'repair_buildings', perHouse: 25_000, perHotel: 100_000 } },
  { id: 11, text: 'تقدم إلى أقرب محطة وادفع ضعف الإيجار', textEn: 'Advance to nearest station, pay double', effect: { type: 'advance_to_nearest_station' } },
  { id: 12, text: 'استلم 150,000 هدية', textEn: 'Collect 150,000 gift', effect: { type: 'gain_money', amount: 150_000 } },
  { id: 13, text: 'تقدم إلى الكرادة داخل', textEn: 'Advance to Inner Karrada', effect: { type: 'move_to', tileId: 29 } },
  { id: 14, text: 'ادفع 200,000 للصندوق', textEn: 'Pay 200,000 to pot', effect: { type: 'pay_to_pot', amount: 200_000 } },
  { id: 15, text: 'تقدم 5 خطوات', textEn: 'Move forward 5 steps', effect: { type: 'move_forward', steps: 5 } },
  { id: 16, text: 'استلم 75,000 من البنك', textEn: 'Collect 75,000 from bank', effect: { type: 'gain_money', amount: 75_000 } },
  { id: 17, text: 'ادفع 150,000 ضريبة تعليم', textEn: 'Pay 150,000 education tax', effect: { type: 'lose_money', amount: 150_000 } },
  { id: 18, text: 'تقدم إلى شارع الأميرات', textEn: 'Advance to Princesses Street', effect: { type: 'move_to', tileId: 37 } },
  { id: 19, text: 'استلم 200,000 جائزة', textEn: 'Collect 200,000 prize', effect: { type: 'gain_money', amount: 200_000 } },
  { id: 20, text: 'ادفع 50,000 للصندوق', textEn: 'Pay 50,000 to pot', effect: { type: 'pay_to_pot', amount: 50_000 } },
];

// Player pieces (Iraqi themed)
export const PLAYER_PIECES = [
  { id: 'taxi', emoji: '🚕', name: 'تاكسي', nameEn: 'Taxi' },
  { id: 'tuktuk', emoji: '🛺', name: 'توك توك', nameEn: 'TukTuk' },
  { id: 'police', emoji: '🚓', name: 'شرطة', nameEn: 'Police' },
  { id: 'tea', emoji: '☕', name: 'استكان شاي', nameEn: 'Tea Glass' },
  { id: 'mosque', emoji: '🕌', name: 'جامع', nameEn: 'Mosque' },
  { id: 'satellite', emoji: '📡', name: 'برج انترنت', nameEn: 'Internet Tower' },
  { id: 'palm', emoji: '🌴', name: 'نخلة', nameEn: 'Palm Tree' },
  { id: 'football', emoji: '⚽', name: 'كرة قدم', nameEn: 'Football' },
  { id: 'kebab', emoji: '🍢', name: 'كباب', nameEn: 'Kebab' },
  { id: 'star', emoji: '⭐', name: 'نجمة', nameEn: 'Star' },
];

// Game constants
export const STARTING_MONEY = 2_000_000;
export const GO_PASS_BONUS = 200_000;
export const GO_LAND_BONUS = 300_000;
export const TAX_AMOUNT = 150_000;
export const BANK_TAX_AMOUNT = 200_000;
export const JAIL_BAIL = 150_000;
export const JAIL_MAX_TURNS = 3;
export const SWITCH_POSITION_COST = 120_000;
export const TURN_TIMER_SECONDS = 60;
export const MAX_HOUSES = 4;
export const MAX_PLAYERS = 10;
export const MIN_PLAYERS = 2;
