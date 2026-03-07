// ========================================
// Baghdad Monopoly - User Accounts Store
// Simple username + PIN authentication
// ========================================

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const DATA_DIR = join(__dirname, '..', 'data');
const USERS_FILE = join(DATA_DIR, 'users.json');

try { mkdirSync(DATA_DIR, { recursive: true }); } catch {}

export interface UserStats {
  gamesPlayed: number;
  gamesWon: number;
  gamesLost: number;
  totalRentPaid: number;
  totalRentReceived: number;
  totalPropertiesBought: number;
  favoriteProperty: number | null; // tileId most bought
  propertyBuyCounts: Record<number, number>;
}

export interface UserAccount {
  username: string;
  pin: string; // stored as plain text (simple PIN like iPhone lock)
  isAdmin: boolean;
  stats: UserStats;
  createdAt: number;
  lastLogin: number;
}

function defaultStats(): UserStats {
  return {
    gamesPlayed: 0,
    gamesWon: 0,
    gamesLost: 0,
    totalRentPaid: 0,
    totalRentReceived: 0,
    totalPropertiesBought: 0,
    favoriteProperty: null,
    propertyBuyCounts: {},
  };
}

function loadUsers(): Record<string, UserAccount> {
  if (!existsSync(USERS_FILE)) return {};
  try {
    return JSON.parse(readFileSync(USERS_FILE, 'utf-8'));
  } catch {
    return {};
  }
}

function saveUsers(users: Record<string, UserAccount>): void {
  writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

// Auto-create Amin account on first load
const users = loadUsers();
if (!users['Amin']) {
  users['Amin'] = {
    username: 'Amin',
    pin: '197377',
    isAdmin: true,
    stats: defaultStats(),
    createdAt: Date.now(),
    lastLogin: 0,
  };
  saveUsers(users);
}

export function loginUser(username: string, pin: string): UserAccount | null {
  const users = loadUsers();
  const user = users[username];
  if (!user) return null;
  if (user.pin !== pin) return null;
  user.lastLogin = Date.now();
  saveUsers(users);
  return user;
}

export function registerUser(username: string, pin: string): UserAccount | null {
  const users = loadUsers();
  if (users[username]) return null; // already exists
  if (!username || username.length < 2 || username.length > 20) return null;
  if (!pin || pin.length < 4 || pin.length > 8) return null;

  const user: UserAccount = {
    username,
    pin,
    isAdmin: false,
    stats: defaultStats(),
    createdAt: Date.now(),
    lastLogin: Date.now(),
  };
  users[username] = user;
  saveUsers(users);
  return user;
}

export function getUser(username: string): UserAccount | null {
  const users = loadUsers();
  return users[username] || null;
}

export function updateUserStats(username: string, updater: (stats: UserStats) => void): void {
  const users = loadUsers();
  const user = users[username];
  if (!user) return;
  updater(user.stats);

  // Update favorite property
  let maxCount = 0;
  let favProp: number | null = null;
  for (const [tileId, count] of Object.entries(user.stats.propertyBuyCounts)) {
    if (count > maxCount) {
      maxCount = count;
      favProp = Number(tileId);
    }
  }
  user.stats.favoriteProperty = favProp;

  saveUsers(users);
}

export function isAdmin(username: string): boolean {
  const users = loadUsers();
  return users[username]?.isAdmin === true;
}

export function getAllUsers(): UserAccount[] {
  const users = loadUsers();
  return Object.values(users);
}
