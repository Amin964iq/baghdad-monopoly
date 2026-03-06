// ========================================
// Baghdad Monopoly - Admin Config Store
// JSON file-based config that persists across restarts
// ========================================

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const DATA_DIR = join(__dirname, '..', 'data');
const CONFIG_FILE = join(DATA_DIR, 'config.json');
const ADMIN_FILE = join(DATA_DIR, 'admin.json');
const ANALYTICS_FILE = join(DATA_DIR, 'analytics.json');

// Ensure data directory exists
import { mkdirSync } from 'fs';
try { mkdirSync(DATA_DIR, { recursive: true }); } catch {}

// ===== Admin Authentication =====
interface AdminCredentials {
  email: string;
  passwordHash: string;
}

function getAdminCredentials(): AdminCredentials | null {
  if (!existsSync(ADMIN_FILE)) return null;
  try {
    return JSON.parse(readFileSync(ADMIN_FILE, 'utf-8'));
  } catch {
    return null;
  }
}

function saveAdminCredentials(creds: AdminCredentials): void {
  writeFileSync(ADMIN_FILE, JSON.stringify(creds, null, 2));
}

export async function initAdmin(email: string, password: string): Promise<void> {
  const hash = await bcrypt.hash(password, 12);
  saveAdminCredentials({ email, passwordHash: hash });
}

export async function verifyAdmin(email: string, password: string): Promise<boolean> {
  const creds = getAdminCredentials();
  if (!creds) return false;
  if (creds.email !== email) return false;
  return bcrypt.compare(password, creds.passwordHash);
}

export function adminExists(): boolean {
  return getAdminCredentials() !== null;
}

// ===== Game Configuration =====
export interface GameConfig {
  // Game Settings
  gameSettings: {
    startingMoney: number;
    goPassReward: number;
    goLandReward: number;
    jailMaxTurns: number;
    jailFine: number;
    diceCount: number;
    doubleExtraTurn: boolean;
    turnTimerSeconds: number;
    minPlayers: number;
    maxPlayers: number;
  };

  // Board Tiles
  boardTiles: TileConfig[];

  // Cards
  luckyChestCards: CardConfig[];
  luckCards: CardConfig[];

  // Economy
  economy: {
    rentMultiplier: number;
    houseCostMultiplier: number;
    hotelCostMultiplier: number;
    stationRentScale: number[];
    utilityMultiplier: number;
  };

  // Bot Settings
  botSettings: {
    enabled: boolean;
    defaultDifficulty: 'easy' | 'normal' | 'smart';
    easyBuyProbability: number;
    normalBuyProbability: number;
    smartBuyProbability: number;
    tradeFrequency: number;
    riskTolerance: number;
  };

  // Pot System
  potSettings: {
    taxAmount: number;
    bankTaxAmount: number;
    switchPositionCost: number;
  };

  // Sound Settings
  soundSettings: {
    diceSound: boolean;
    rentSound: boolean;
    winSound: boolean;
    buySound: boolean;
    jailSound: boolean;
  };

  // Iraqi Flavor
  iraqiFlavor: {
    iraqiSoundEffects: boolean;
    iraqiMessages: boolean;
    funnyReactions: boolean;
  };
}

export interface TileConfig {
  id: number;
  name: string;
  nameEn: string;
  type: string;
  enabled: boolean;
  group?: string;
  price?: number;
  baseRent?: number;
  rent1House?: number;
  rent2House?: number;
  rent3House?: number;
  rent4House?: number;
  rentHotel?: number;
  houseCost?: number;
  mortgageValue?: number;
}

export interface CardConfig {
  id: number;
  title: string;
  description: string;
  effectType: string;
  effectValue: number;
  effectValue2?: number;
  targetTileId?: number;
  enabled: boolean;
}

// Default config - used when no config file exists
function getDefaultConfig(): GameConfig {
  return {
    gameSettings: {
      startingMoney: 2_000_000,
      goPassReward: 200_000,
      goLandReward: 300_000,
      jailMaxTurns: 3,
      jailFine: 150_000,
      diceCount: 2,
      doubleExtraTurn: true,
      turnTimerSeconds: 60,
      minPlayers: 2,
      maxPlayers: 10,
    },
    boardTiles: [
      { id: 0, name: 'انطلاق', nameEn: 'GO', type: 'go', enabled: true },
      { id: 1, name: 'مدينة الشعب', nameEn: 'Al-Shaab City', type: 'property', enabled: true, group: 'brown', price: 60000, baseRent: 4000, rent1House: 20000, rent2House: 60000, rent3House: 180000, rent4House: 320000, rentHotel: 450000, houseCost: 50000 },
      { id: 2, name: 'صندوق اللعبة', nameEn: 'Lucky Chest', type: 'lucky_chest', enabled: true },
      { id: 3, name: 'مدينة الحرية', nameEn: 'Al-Hurriya City', type: 'property', enabled: true, group: 'brown', price: 60000, baseRent: 8000, rent1House: 40000, rent2House: 120000, rent3House: 200000, rent4House: 360000, rentHotel: 500000, houseCost: 50000 },
      { id: 4, name: 'ضريبة', nameEn: 'Tax', type: 'tax', enabled: true },
      { id: 5, name: 'مطار بغداد الدولي', nameEn: 'Baghdad Airport', type: 'station', enabled: true, group: 'station', price: 300000, baseRent: 50000 },
      { id: 6, name: 'بغداد الجديدة', nameEn: 'New Baghdad', type: 'property', enabled: true, group: 'cyan', price: 120000, baseRent: 12000, rent1House: 60000, rent2House: 180000, rent3House: 300000, rent4House: 450000, rentHotel: 600000, houseCost: 50000 },
      { id: 7, name: 'زيونة', nameEn: 'Zayoona', type: 'property', enabled: true, group: 'cyan', price: 140000, baseRent: 14000, rent1House: 70000, rent2House: 200000, rent3House: 350000, rent4House: 500000, rentHotel: 650000, houseCost: 50000 },
      { id: 8, name: 'حظك', nameEn: 'Luck Card', type: 'luck_card', enabled: true },
      { id: 9, name: 'الكرادة الشرقية', nameEn: 'East Karrada', type: 'property', enabled: true, group: 'cyan', price: 160000, baseRent: 16000, rent1House: 80000, rent2House: 220000, rent3House: 380000, rent4House: 550000, rentHotel: 700000, houseCost: 50000 },
      { id: 10, name: 'السجن', nameEn: 'Jail', type: 'jail', enabled: true },
      { id: 11, name: 'المنصور', nameEn: 'Al-Mansour', type: 'property', enabled: true, group: 'pink', price: 220000, baseRent: 22000, rent1House: 110000, rent2House: 330000, rent3House: 500000, rent4House: 700000, rentHotel: 900000, houseCost: 100000 },
      { id: 12, name: 'الجادرية', nameEn: 'Al-Jadriya', type: 'property', enabled: true, group: 'pink', price: 220000, baseRent: 22000, rent1House: 110000, rent2House: 330000, rent3House: 500000, rent4House: 700000, rentHotel: 900000, houseCost: 100000 },
      { id: 13, name: 'نادي العلوية', nameEn: 'Alwiyah Club', type: 'special_property', enabled: true, group: 'special', price: 500000, baseRent: 80000 },
      { id: 14, name: 'اليرموك', nameEn: 'Al-Yarmouk', type: 'property', enabled: true, group: 'pink', price: 260000, baseRent: 26000, rent1House: 130000, rent2House: 390000, rent3House: 560000, rent4House: 780000, rentHotel: 1000000, houseCost: 100000 },
      { id: 15, name: 'محطة بغداد للقطارات', nameEn: 'Train Station', type: 'station', enabled: true, group: 'station', price: 300000, baseRent: 50000 },
      { id: 16, name: 'العامرية', nameEn: 'Al-Amiriya', type: 'property', enabled: true, group: 'orange', price: 300000, baseRent: 28000, rent1House: 140000, rent2House: 400000, rent3House: 600000, rent4House: 800000, rentHotel: 1050000, houseCost: 100000 },
      { id: 17, name: 'صندوق اللعبة', nameEn: 'Lucky Chest', type: 'lucky_chest', enabled: true },
      { id: 18, name: 'الدورة', nameEn: 'Al-Dora', type: 'property', enabled: true, group: 'orange', price: 320000, baseRent: 30000, rent1House: 150000, rent2House: 420000, rent3House: 650000, rent4House: 850000, rentHotel: 1100000, houseCost: 100000 },
      { id: 19, name: 'البياع', nameEn: 'Al-Bayaa', type: 'property', enabled: true, group: 'orange', price: 340000, baseRent: 32000, rent1House: 160000, rent2House: 450000, rent3House: 680000, rent4House: 900000, rentHotel: 1150000, houseCost: 100000 },
      { id: 20, name: 'اجمع الصندوق', nameEn: 'Collect Pot', type: 'collect_pot', enabled: true },
      { id: 21, name: 'الغزالية', nameEn: 'Al-Ghazaliya', type: 'property', enabled: true, group: 'red', price: 380000, baseRent: 36000, rent1House: 180000, rent2House: 500000, rent3House: 750000, rent4House: 1000000, rentHotel: 1300000, houseCost: 150000 },
      { id: 22, name: 'حظك', nameEn: 'Luck Card', type: 'luck_card', enabled: true },
      { id: 23, name: 'العدل', nameEn: 'Al-Adl', type: 'property', enabled: true, group: 'red', price: 400000, baseRent: 38000, rent1House: 190000, rent2House: 520000, rent3House: 780000, rent4House: 1050000, rentHotel: 1350000, houseCost: 150000 },
      { id: 24, name: 'العطيفية', nameEn: 'Al-Atifiya', type: 'property', enabled: true, group: 'red', price: 420000, baseRent: 40000, rent1House: 200000, rent2House: 550000, rent3House: 800000, rent4House: 1100000, rentHotel: 1400000, houseCost: 150000 },
      { id: 25, name: 'مرسى دجلة', nameEn: 'Tigris Dock', type: 'station', enabled: true, group: 'station', price: 300000, baseRent: 50000 },
      { id: 26, name: 'الحارثية', nameEn: 'Al-Harithiya', type: 'property', enabled: true, group: 'yellow', price: 460000, baseRent: 44000, rent1House: 220000, rent2House: 600000, rent3House: 880000, rent4House: 1200000, rentHotel: 1500000, houseCost: 150000 },
      { id: 27, name: 'المنطقة الخضراء', nameEn: 'Green Zone', type: 'property', enabled: true, group: 'yellow', price: 500000, baseRent: 48000, rent1House: 240000, rent2House: 650000, rent3House: 950000, rent4House: 1300000, rentHotel: 1600000, houseCost: 150000 },
      { id: 28, name: 'الوطني للانترنيت', nameEn: 'National Internet', type: 'utility', enabled: true, group: 'utility', price: 450000, baseRent: 0 },
      { id: 29, name: 'الكرادة داخل', nameEn: 'Inner Karrada', type: 'property', enabled: true, group: 'yellow', price: 520000, baseRent: 52000, rent1House: 260000, rent2House: 700000, rent3House: 1000000, rent4House: 1350000, rentHotel: 1700000, houseCost: 150000 },
      { id: 30, name: 'روح للسجن', nameEn: 'Go To Jail', type: 'go_to_jail', enabled: true },
      { id: 31, name: 'مجمع البدور', nameEn: 'Al-Budoor Complex', type: 'property', enabled: true, group: 'green', price: 650000, baseRent: 56000, rent1House: 280000, rent2House: 750000, rent3House: 1100000, rent4House: 1400000, rentHotel: 1800000, houseCost: 200000 },
      { id: 32, name: 'بوابة العراق', nameEn: 'Gateway of Iraq', type: 'property', enabled: true, group: 'green', price: 670000, baseRent: 58000, rent1House: 290000, rent2House: 780000, rent3House: 1150000, rent4House: 1450000, rentHotel: 1850000, houseCost: 200000 },
      { id: 33, name: 'صندوق اللعبة', nameEn: 'Lucky Chest', type: 'lucky_chest', enabled: true },
      { id: 34, name: 'حي الجامعة', nameEn: 'University District', type: 'property', enabled: true, group: 'green', price: 700000, baseRent: 60000, rent1House: 300000, rent2House: 800000, rent3House: 1200000, rent4House: 1500000, rentHotel: 1900000, houseCost: 200000 },
      { id: 35, name: 'كراج النهضة', nameEn: 'Nahda Garage', type: 'station', enabled: true, group: 'station', price: 300000, baseRent: 50000 },
      { id: 36, name: 'تبديل موقع', nameEn: 'Switch Position', type: 'switch_position', enabled: true },
      { id: 37, name: 'شارع الأميرات', nameEn: 'Princesses Street', type: 'property', enabled: true, group: 'blue', price: 900000, baseRent: 70000, rent1House: 350000, rent2House: 900000, rent3House: 1400000, rent4House: 1800000, rentHotel: 2200000, houseCost: 200000 },
      { id: 38, name: 'ضريبة البنك', nameEn: 'Bank Tax', type: 'bank_tax', enabled: true },
      { id: 39, name: 'العرصات', nameEn: 'Al-Arasat', type: 'property', enabled: true, group: 'blue', price: 1000000, baseRent: 80000, rent1House: 400000, rent2House: 1000000, rent3House: 1500000, rent4House: 2000000, rentHotel: 2500000, houseCost: 200000 },
    ],
    luckyChestCards: [
      { id: 1, title: 'تقدم إلى الانطلاق', description: 'تقدم إلى خانة الانطلاق واستلم 300,000', effectType: 'AdvanceToTile', effectValue: 0, enabled: true },
      { id: 2, title: 'جائزة', description: 'ربحت جائزة! استلم 200,000 دينار', effectType: 'GiveMoney', effectValue: 200000, enabled: true },
      { id: 3, title: 'فاتورة كهرباء', description: 'ادفع فاتورة الكهرباء 50,000 دينار', effectType: 'TakeMoney', effectValue: 50000, enabled: true },
      { id: 4, title: 'من البنك', description: 'استلم 100,000 دينار من البنك', effectType: 'GiveMoney', effectValue: 100000, enabled: true },
      { id: 5, title: 'خروج من السجن', description: 'بطاقة خروج من السجن - احتفظ بها', effectType: 'GetOutOfJailCard', effectValue: 0, enabled: true },
      { id: 6, title: 'غرامة', description: 'ادفع 150,000 للصندوق', effectType: 'TakeMoney', effectValue: 150000, enabled: true },
      { id: 7, title: 'عيد ميلاد', description: 'عيد ميلادك! استلم 50,000 من كل لاعب', effectType: 'ReceiveFromEachPlayer', effectValue: 50000, enabled: true },
      { id: 8, title: 'أرباح تجارية', description: 'استلم 150,000 دينار أرباح تجارية', effectType: 'GiveMoney', effectValue: 150000, enabled: true },
      { id: 9, title: 'غرامة مرورية', description: 'ادفع 100,000 غرامة مرورية', effectType: 'TakeMoney', effectValue: 100000, enabled: true },
      { id: 10, title: 'تقدم', description: 'تقدم 3 خطوات', effectType: 'MoveForward', effectValue: 3, enabled: true },
      { id: 11, title: 'ميراث', description: 'استلم 250,000 ميراث', effectType: 'GiveMoney', effectValue: 250000, enabled: true },
      { id: 12, title: 'رسوم تسجيل', description: 'ادفع 75,000 رسوم تسجيل', effectType: 'TakeMoney', effectValue: 75000, enabled: true },
      { id: 13, title: 'مسابقة', description: 'فزت بالمسابقة! استلم 100,000', effectType: 'GiveMoney', effectValue: 100000, enabled: true },
      { id: 14, title: 'ترميمات', description: 'ادفع ترميمات: 40,000 لكل بيت و 115,000 لكل فندق', effectType: 'RepairBuildings', effectValue: 40000, effectValue2: 115000, enabled: true },
      { id: 15, title: 'تراجع', description: 'تراجع 3 خطوات', effectType: 'MoveBackward', effectValue: 3, enabled: true },
      { id: 16, title: 'استرداد ضريبي', description: 'استلم 50,000 استرداد ضريبي', effectType: 'GiveMoney', effectValue: 50000, enabled: true },
      { id: 17, title: 'مستشفى', description: 'ادفع 200,000 رسوم مستشفى', effectType: 'TakeMoney', effectValue: 200000, enabled: true },
      { id: 18, title: 'أقرب محطة', description: 'تقدم إلى أقرب محطة', effectType: 'AdvanceToNearestStation', effectValue: 0, enabled: true },
      { id: 19, title: 'أرباح أسهم', description: 'استلم 80,000 أرباح أسهم', effectType: 'GiveMoney', effectValue: 80000, enabled: true },
      { id: 20, title: 'دفع للاعبين', description: 'ادفع 25,000 لكل لاعب', effectType: 'PayEachPlayer', effectValue: 25000, enabled: true },
    ],
    luckCards: [
      { id: 1, title: 'سجن', description: 'روح للسجن مباشرة!', effectType: 'GoToJail', effectValue: 0, enabled: true },
      { id: 2, title: 'انطلاق', description: 'تقدم إلى خانة الانطلاق', effectType: 'AdvanceToTile', effectValue: 0, enabled: true },
      { id: 3, title: 'ادفع للاعبين', description: 'ادفع 50,000 لكل لاعب', effectType: 'PayEachPlayer', effectValue: 50000, enabled: true },
      { id: 4, title: 'استلم من اللاعبين', description: 'استلم 50,000 من كل لاعب', effectType: 'ReceiveFromEachPlayer', effectValue: 50000, enabled: true },
      { id: 5, title: 'خروج من السجن', description: 'بطاقة خروج من السجن', effectType: 'GetOutOfJailCard', effectValue: 0, enabled: true },
      { id: 6, title: 'المنصور', description: 'تقدم إلى المنصور', effectType: 'AdvanceToTile', effectValue: 11, enabled: true },
      { id: 7, title: 'غرامة', description: 'ادفع 100,000 غرامة', effectType: 'TakeMoney', effectValue: 100000, enabled: true },
      { id: 8, title: 'تراجع', description: 'تراجع 2 خطوات', effectType: 'MoveBackward', effectValue: 2, enabled: true },
      { id: 9, title: 'من البنك', description: 'استلم 300,000 من البنك', effectType: 'GiveMoney', effectValue: 300000, enabled: true },
      { id: 10, title: 'ترميمات', description: 'ادفع ترميمات: 25,000 لكل بيت و 100,000 لكل فندق', effectType: 'RepairBuildings', effectValue: 25000, effectValue2: 100000, enabled: true },
      { id: 11, title: 'أقرب محطة', description: 'تقدم إلى أقرب محطة', effectType: 'AdvanceToNearestStation', effectValue: 0, enabled: true },
      { id: 12, title: 'هدية', description: 'استلم 150,000 هدية', effectType: 'GiveMoney', effectValue: 150000, enabled: true },
      { id: 13, title: 'الكرادة داخل', description: 'تقدم إلى الكرادة داخل', effectType: 'AdvanceToTile', effectValue: 29, enabled: true },
      { id: 14, title: 'للصندوق', description: 'ادفع 200,000 للصندوق', effectType: 'TakeMoney', effectValue: 200000, enabled: true },
      { id: 15, title: 'تقدم', description: 'تقدم 5 خطوات', effectType: 'MoveForward', effectValue: 5, enabled: true },
      { id: 16, title: 'من البنك', description: 'استلم 75,000 من البنك', effectType: 'GiveMoney', effectValue: 75000, enabled: true },
      { id: 17, title: 'ضريبة تعليم', description: 'ادفع 150,000 ضريبة تعليم', effectType: 'TakeMoney', effectValue: 150000, enabled: true },
      { id: 18, title: 'شارع الأميرات', description: 'تقدم إلى شارع الأميرات', effectType: 'AdvanceToTile', effectValue: 37, enabled: true },
      { id: 19, title: 'جائزة', description: 'استلم 200,000 جائزة', effectType: 'GiveMoney', effectValue: 200000, enabled: true },
      { id: 20, title: 'للصندوق', description: 'ادفع 50,000 للصندوق', effectType: 'TakeMoney', effectValue: 50000, enabled: true },
    ],
    economy: {
      rentMultiplier: 1.0,
      houseCostMultiplier: 1.0,
      hotelCostMultiplier: 1.0,
      stationRentScale: [0, 50000, 100000, 200000, 400000],
      utilityMultiplier: 20000,
    },
    botSettings: {
      enabled: true,
      defaultDifficulty: 'normal',
      easyBuyProbability: 0.5,
      normalBuyProbability: 0.7,
      smartBuyProbability: 0.9,
      tradeFrequency: 0.3,
      riskTolerance: 0.5,
    },
    potSettings: {
      taxAmount: 150000,
      bankTaxAmount: 200000,
      switchPositionCost: 120000,
    },
    soundSettings: {
      diceSound: true,
      rentSound: true,
      winSound: true,
      buySound: true,
      jailSound: true,
    },
    iraqiFlavor: {
      iraqiSoundEffects: true,
      iraqiMessages: true,
      funnyReactions: true,
    },
  };
}

// Load config from file or return default
export function loadConfig(): GameConfig {
  if (!existsSync(CONFIG_FILE)) {
    const config = getDefaultConfig();
    saveConfig(config);
    return config;
  }
  try {
    return JSON.parse(readFileSync(CONFIG_FILE, 'utf-8'));
  } catch {
    return getDefaultConfig();
  }
}

export function saveConfig(config: GameConfig): void {
  writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
}

// ===== Analytics =====
export interface GameAnalytics {
  totalGamesPlayed: number;
  totalPlayersJoined: number;
  tileLandings: Record<number, number>;
  propertyPurchases: Record<number, number>;
  averageGameLengthMinutes: number;
  totalGameLengthMinutes: number;
  mostProfitableProperties: Record<number, number>;
}

export function loadAnalytics(): GameAnalytics {
  if (!existsSync(ANALYTICS_FILE)) {
    return {
      totalGamesPlayed: 0,
      totalPlayersJoined: 0,
      tileLandings: {},
      propertyPurchases: {},
      averageGameLengthMinutes: 0,
      totalGameLengthMinutes: 0,
      mostProfitableProperties: {},
    };
  }
  try {
    return JSON.parse(readFileSync(ANALYTICS_FILE, 'utf-8'));
  } catch {
    return {
      totalGamesPlayed: 0, totalPlayersJoined: 0,
      tileLandings: {}, propertyPurchases: {},
      averageGameLengthMinutes: 0, totalGameLengthMinutes: 0,
      mostProfitableProperties: {},
    };
  }
}

export function saveAnalytics(analytics: GameAnalytics): void {
  writeFileSync(ANALYTICS_FILE, JSON.stringify(analytics, null, 2));
}
