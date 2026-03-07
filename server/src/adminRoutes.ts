// ========================================
// Baghdad Monopoly - Admin API Routes
// ========================================

import { Router, Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import {
  verifyAdmin, initAdmin, adminExists,
  loadConfig, saveConfig, loadAnalytics,
  type GameConfig, type TileConfig, type CardConfig,
} from './adminStore.js';

const JWT_SECRET = process.env.JWT_SECRET || 'baghdad-monopoly-secret-key-change-in-production';
const TOKEN_EXPIRY = '24h';

// Rate limiting for login
const loginAttempts = new Map<string, { count: number; lastAttempt: number }>();
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = loginAttempts.get(ip);

  if (!record) return true;

  // Reset if lockout period passed
  if (now - record.lastAttempt > LOCKOUT_MINUTES * 60 * 1000) {
    loginAttempts.delete(ip);
    return true;
  }

  return record.count < MAX_LOGIN_ATTEMPTS;
}

function recordLoginAttempt(ip: string): void {
  const record = loginAttempts.get(ip);
  if (record) {
    record.count++;
    record.lastAttempt = Date.now();
  } else {
    loginAttempts.set(ip, { count: 1, lastAttempt: Date.now() });
  }
}

function resetLoginAttempts(ip: string): void {
  loginAttempts.delete(ip);
}

// Auth middleware
function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    (req as any).admin = decoded;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}

export function generateAdminToken(username: string): string {
  return jwt.sign({ role: 'admin', email: username }, JWT_SECRET, { expiresIn: TOKEN_EXPIRY });
}

// Create router with access to game state
export function createAdminRouter(getActiveGames: () => any[], broadcastToGame?: (gameId: string, event: string, data: any) => void) {
  const router = Router();

  // JSON body parsing
  router.use((req, _res, next) => {
    if (req.headers['content-type']?.includes('application/json')) {
      // express.json() should handle this at app level
    }
    next();
  });

  // ===== Setup (first time only) =====
  router.post('/setup', async (req: Request, res: Response) => {
    if (adminExists()) {
      res.status(400).json({ error: 'Admin already configured' });
      return;
    }
    const { email, password } = req.body;
    if (!email || !password || password.length < 8) {
      res.status(400).json({ error: 'Email and password (min 8 chars) required' });
      return;
    }
    await initAdmin(email, password);
    res.json({ success: true, message: 'Admin account created' });
  });

  // ===== Login =====
  router.post('/login', async (req: Request, res: Response) => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';

    if (!checkRateLimit(ip)) {
      res.status(429).json({ error: `Too many attempts. Try again in ${LOCKOUT_MINUTES} minutes` });
      return;
    }

    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).json({ error: 'Email and password required' });
      return;
    }

    const valid = await verifyAdmin(email, password);
    if (!valid) {
      recordLoginAttempt(ip);
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    resetLoginAttempts(ip);
    const token = jwt.sign({ role: 'admin', email }, JWT_SECRET, { expiresIn: TOKEN_EXPIRY });
    res.json({ token, expiresIn: TOKEN_EXPIRY });
  });

  // ===== Session Login (from game account) =====
  router.post('/session-login', async (req: Request, res: Response) => {
    const { username, pin } = req.body;
    if (!username || !pin) {
      res.status(400).json({ error: 'Username and PIN required' });
      return;
    }
    try {
      const { loginUser, isAdmin: checkAdmin } = await import('./userStore.js');
      const user = loginUser(username, pin);
      if (!user || !checkAdmin(username)) {
        res.status(401).json({ error: 'Not an admin' });
        return;
      }
      const token = jwt.sign({ role: 'admin', email: username }, JWT_SECRET, { expiresIn: TOKEN_EXPIRY });
      res.json({ token, expiresIn: TOKEN_EXPIRY });
    } catch {
      res.status(500).json({ error: 'Auth failed' });
    }
  });

  // ===== Check if setup needed =====
  router.get('/status', (_req: Request, res: Response) => {
    res.json({ needsSetup: !adminExists() });
  });

  // ===== All routes below require auth =====

  // Get full config
  router.get('/config', authMiddleware, (_req: Request, res: Response) => {
    res.json(loadConfig());
  });

  // ===== 1. Game Settings =====
  router.put('/config/game-settings', authMiddleware, (req: Request, res: Response) => {
    const config = loadConfig();
    config.gameSettings = { ...config.gameSettings, ...req.body };
    saveConfig(config);
    res.json({ success: true, gameSettings: config.gameSettings });
  });

  // ===== 2. Board Editor =====
  router.get('/config/tiles', authMiddleware, (_req: Request, res: Response) => {
    const config = loadConfig();
    res.json(config.boardTiles);
  });

  router.put('/config/tiles/:id', authMiddleware, (req: Request, res: Response) => {
    const config = loadConfig();
    const tileId = parseInt(req.params.id);
    const index = config.boardTiles.findIndex(t => t.id === tileId);
    if (index === -1) {
      res.status(404).json({ error: 'Tile not found' });
      return;
    }
    config.boardTiles[index] = { ...config.boardTiles[index], ...req.body, id: tileId };
    saveConfig(config);
    res.json({ success: true, tile: config.boardTiles[index] });
  });

  // ===== 3. Card Editor =====
  router.get('/config/cards/:deck', authMiddleware, (req: Request, res: Response) => {
    const config = loadConfig();
    const deck = req.params.deck === 'lucky_chest' ? config.luckyChestCards : config.luckCards;
    res.json(deck);
  });

  router.put('/config/cards/:deck/:id', authMiddleware, (req: Request, res: Response) => {
    const config = loadConfig();
    const deckKey = req.params.deck === 'lucky_chest' ? 'luckyChestCards' : 'luckCards';
    const cardId = parseInt(req.params.id);
    const index = config[deckKey].findIndex(c => c.id === cardId);
    if (index === -1) {
      res.status(404).json({ error: 'Card not found' });
      return;
    }
    config[deckKey][index] = { ...config[deckKey][index], ...req.body, id: cardId };
    saveConfig(config);
    res.json({ success: true, card: config[deckKey][index] });
  });

  router.post('/config/cards/:deck', authMiddleware, (req: Request, res: Response) => {
    const config = loadConfig();
    const deckKey = req.params.deck === 'lucky_chest' ? 'luckyChestCards' : 'luckCards';
    const maxId = Math.max(0, ...config[deckKey].map(c => c.id));
    const newCard: CardConfig = { ...req.body, id: maxId + 1 };
    config[deckKey].push(newCard);
    saveConfig(config);
    res.json({ success: true, card: newCard });
  });

  // ===== 4. Economy Balancer =====
  router.put('/config/economy', authMiddleware, (req: Request, res: Response) => {
    const config = loadConfig();
    config.economy = { ...config.economy, ...req.body };
    saveConfig(config);
    res.json({ success: true, economy: config.economy });
  });

  // ===== 5. Bot Settings =====
  router.put('/config/bots', authMiddleware, (req: Request, res: Response) => {
    const config = loadConfig();
    config.botSettings = { ...config.botSettings, ...req.body };
    saveConfig(config);
    res.json({ success: true, botSettings: config.botSettings });
  });

  // ===== 6. Live Game Monitor =====
  router.get('/games', authMiddleware, (_req: Request, res: Response) => {
    const games = getActiveGames();
    res.json(games.map(g => ({
      id: g.id,
      players: g.players.map((p: any) => ({ name: p.name, money: p.money, bankrupt: p.bankrupt, isBot: p.isBot })),
      currentPlayerIndex: g.currentPlayerIndex,
      phase: g.phase,
      middlePot: g.middlePot,
      createdAt: g.createdAt,
      duration: Math.round((Date.now() - g.createdAt) / 60000),
    })));
  });

  // ===== 7. Pot System =====
  router.put('/config/pot', authMiddleware, (req: Request, res: Response) => {
    const config = loadConfig();
    config.potSettings = { ...config.potSettings, ...req.body };
    saveConfig(config);
    res.json({ success: true, potSettings: config.potSettings });
  });

  // ===== 8. Sound Settings =====
  router.put('/config/sounds', authMiddleware, (req: Request, res: Response) => {
    const config = loadConfig();
    config.soundSettings = { ...config.soundSettings, ...req.body };
    saveConfig(config);
    res.json({ success: true, soundSettings: config.soundSettings });
  });

  // ===== 9. Iraqi Flavor =====
  router.put('/config/flavor', authMiddleware, (req: Request, res: Response) => {
    const config = loadConfig();
    config.iraqiFlavor = { ...config.iraqiFlavor, ...req.body };
    saveConfig(config);
    res.json({ success: true, iraqiFlavor: config.iraqiFlavor });
  });

  // ===== 10. Analytics =====
  router.get('/analytics', authMiddleware, (_req: Request, res: Response) => {
    res.json(loadAnalytics());
  });

  // ===== 11. Server Controls =====
  router.post('/broadcast', authMiddleware, (req: Request, res: Response) => {
    const { message } = req.body;
    if (!message) {
      res.status(400).json({ error: 'Message required' });
      return;
    }
    // Broadcast will be handled by the caller
    if (broadcastToGame) {
      broadcastToGame('*', 'game_event', {
        id: Date.now().toString(),
        type: 'admin_broadcast',
        message,
        messageAr: message,
        timestamp: Date.now(),
      });
    }
    res.json({ success: true });
  });

  // Reset config to defaults
  router.post('/reset-config', authMiddleware, (_req: Request, res: Response) => {
    const defaultConfig = getDefaultConfig();
    saveConfig(defaultConfig);
    res.json({ success: true, message: 'Config reset to defaults' });
  });

  return router;
}

function getDefaultConfig() {
  // Re-use from adminStore
  return loadConfig();
}
