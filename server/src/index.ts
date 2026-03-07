// ========================================
// Baghdad Monopoly - Server Entry Point
// ========================================

import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';
import type {
  Room, RoomPlayer, GameState, GameSettings, Player,
  ServerToClientEvents, ClientToServerEvents, TradeOffer,
} from './types.js';
import {
  createGameState, getCurrentPlayer, rollDice, movePlayer,
  processTileAction, buyProperty, payRent, buildHouse, sellHouse,
  sendToJail, freeFromJail, switchPositions, bankruptPlayer,
  checkBankrupt, checkGameOver, advanceToNextPlayer, applyCardEffect,
  drawCard, addEvent, getActivePlayers, calculateRent, getTileData,
  getPropertyOwner, executeTrade,
} from './gameEngine.js';
import {
  STARTING_MONEY, JAIL_BAIL, TURN_TIMER_SECONDS, PLAYER_PIECES,
  LUCKY_CHEST_CARDS, LUCK_CARDS, SWITCH_POSITION_COST,
} from './gameData.js';
import { BotAI } from './botAI.js';
import { createAdminRouter } from './adminRoutes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
app.use(express.json());
const httpServer = createServer(app);

const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
});

// State
const rooms = new Map<string, Room>();
const games = new Map<string, GameState>();
const pausedGames = new Map<string, { game: GameState; room: Room; pausedAt: number }>();

// Paused games directory
const PAUSED_DIR = join(__dirname, '../../paused_games');
try { fs.mkdirSync(PAUSED_DIR, { recursive: true }); } catch {}

// Load paused games from disk
try {
  const files = fs.readdirSync(PAUSED_DIR);
  for (const file of files) {
    if (file.endsWith('.json')) {
      const data = JSON.parse(fs.readFileSync(join(PAUSED_DIR, file), 'utf8'));
      const code = file.replace('.json', '');
      pausedGames.set(code, data);
    }
  }
} catch {}

// Admin routes
const adminRouter = createAdminRouter(
  () => Array.from(games.values()),
  (gameId: string, event: string, data: any) => {
    if (gameId === '*') {
      io.emit(event as any, data);
    } else {
      io.to(gameId).emit(event as any, data);
    }
  }
);
app.use('/api/admin', adminRouter);

// Serve static client build
app.use(express.static(join(__dirname, '../../client/dist')));
app.get('*', (_req, res) => {
  res.sendFile(join(__dirname, '../../client/dist/index.html'));
});
const playerRoomMap = new Map<string, string>(); // socketId -> roomId
const turnTimers = new Map<string, NodeJS.Timeout>();

function broadcastRoom(roomId: string) {
  const room = rooms.get(roomId);
  if (room) io.to(roomId).emit('room_updated', room);
}

function broadcastGameState(roomId: string) {
  const game = games.get(roomId);
  if (game) io.to(roomId).emit('game_state', game);
}

function getAvailablePiece(room: Room): string {
  const usedPieces = new Set(room.players.map(p => p.pieceId));
  return PLAYER_PIECES.find(p => !usedPieces.has(p.id))?.id || 'taxi';
}

function startTurnTimer(roomId: string) {
  clearTurnTimer(roomId);
  const game = games.get(roomId);
  if (!game) return;

  const timer = setTimeout(() => {
    const g = games.get(roomId);
    if (!g) return;
    const player = getCurrentPlayer(g);

    // Auto-end turn on timeout
    if (player.isBot) return;

    addEvent(g, 'timeout', `${player.name} ran out of time!`,
      `${player.name} انتهى وقته!`);

    if (g.phase === 'buying') {
      g.phase = 'managing';
    }

    endTurn(roomId, g);
  }, (game.settings.turnTimerSeconds || TURN_TIMER_SECONDS) * 1000);

  turnTimers.set(roomId, timer);
}

function clearTurnTimer(roomId: string) {
  const timer = turnTimers.get(roomId);
  if (timer) {
    clearTimeout(timer);
    turnTimers.delete(roomId);
  }
}

function endTurn(roomId: string, game: GameState) {
  const player = getCurrentPlayer(game);

  // Check bankruptcy
  if (checkBankrupt(player)) {
    bankruptPlayer(game, player);
    io.to(roomId).emit('player_bankrupt', player.id);
  }

  if (checkGameOver(game)) {
    clearTurnTimer(roomId);
    broadcastGameState(roomId);
    return;
  }

  // If doubles, same player rolls again (unless going to jail)
  if (game.dice?.isDouble && !player.inJail && game.doublesCount < 3) {
    game.phase = 'rolling';
    game.dice = null;
    game.currentCard = null;
    broadcastGameState(roomId);
    startTurnTimer(roomId);
    handleBotTurn(roomId);
    return;
  }

  advanceToNextPlayer(game);
  broadcastGameState(roomId);

  io.to(roomId).emit('turn_changed', {
    playerId: getCurrentPlayer(game).id,
    phase: game.phase,
  });

  startTurnTimer(roomId);
  handleBotTurn(roomId);
}

function handleBotTurn(roomId: string) {
  const game = games.get(roomId);
  if (!game) return;

  const player = getCurrentPlayer(game);
  if (!player.isBot) return;

  const difficulty = player.botDifficulty || 'normal';
  const delay = 2500; // Bot thinking time

  setTimeout(() => {
    const g = games.get(roomId);
    if (!g) return;
    const p = getCurrentPlayer(g);
    if (p.id !== player.id) return;

    if (g.phase === 'in_jail') {
      const action = BotAI.chooseJailAction(p, g, difficulty);
      handleJailAction(roomId, g, p, action);
      return;
    }

    if (g.phase === 'rolling') {
      handleRollDice(roomId, g, p);
    }
  }, delay);
}

function handleJailAction(roomId: string, game: GameState, player: Player, action: string) {
  switch (action) {
    case 'pay':
      // Pay bail and get freed immediately - can roll this turn
      player.money -= JAIL_BAIL;
      freeFromJail(game, player);
      addEvent(game, 'freed', `${player.name} paid bail!`,
        `${player.name} دفع الكفالة وخرج!`);
      game.phase = 'rolling';
      broadcastGameState(roomId);
      if (player.isBot) setTimeout(() => handleBotTurn(roomId), 1000);
      break;
    case 'card':
      if (player.getOutOfJailCards > 0) {
        player.getOutOfJailCards--;
        freeFromJail(game, player);
        addEvent(game, 'freed', `${player.name} used a get out of jail card!`,
          `${player.name} استخدم بطاقة الخروج من السجن!`);
        game.phase = 'rolling';
        broadcastGameState(roomId);
        if (player.isBot) setTimeout(() => handleBotTurn(roomId), 1000);
      }
      break;
    case 'wait':
      // Choose to stay in jail - skip turn, count jail round
      player.jailTurns++;
      if (player.jailTurns >= 3) {
        // 3 rounds done, auto-freed
        freeFromJail(game, player);
        addEvent(game, 'freed', `${player.name} served 3 rounds and is free!`,
          `${player.name} أكمل 3 أدوار وخرج من السجن!`);
      } else {
        addEvent(game, 'jail', `${player.name} stays in jail (${player.jailTurns}/3)`,
          `${player.name} يبقى في السجن (${player.jailTurns}/3)`);
      }
      // Either way, turn ends - no rolling while in jail
      endTurn(roomId, game);
      break;
  }
}

function handleRollDice(roomId: string, game: GameState, player: Player) {
  const dice = rollDice();
  game.dice = dice;
  game.doublesCount = dice.isDouble ? game.doublesCount + 1 : 0;

  io.to(roomId).emit('dice_rolled', { ...dice, playerId: player.id });

  if (dice.isDouble) {
    addEvent(game, 'double', `${player.name} rolled a DOUBLE!`,
      `${player.name} رمى دوبل!`);
  }

  // Three doubles = jail
  if (game.doublesCount >= 3) {
    sendToJail(game, player);
    game.phase = 'managing';
    broadcastGameState(roomId);
    setTimeout(() => endTurn(roomId, game), 1000);
    return;
  }

  const oldPos = player.position;
  const { passedGo, newPosition } = movePlayer(game, player, dice.total);

  io.to(roomId).emit('player_moved', {
    playerId: player.id,
    from: oldPos,
    to: newPosition,
    passedGo,
  });

  // Process tile
  game.phase = 'moving';
  broadcastGameState(roomId);

  setTimeout(() => {
    const g = games.get(roomId);
    if (!g) return;

    const nextPhase = processTileAction(g, player);
    g.phase = nextPhase;
    broadcastGameState(roomId);

    if (player.isBot) {
      setTimeout(() => processBotPhase(roomId), 2000);
    }
  }, 1200);
}

function processBotPhase(roomId: string) {
  const game = games.get(roomId);
  if (!game) return;
  const player = getCurrentPlayer(game);
  if (!player.isBot) return;

  const difficulty = player.botDifficulty || 'normal';

  switch (game.phase) {
    case 'buying':
      if (BotAI.shouldBuyProperty(player, game, difficulty)) {
        buyProperty(game, player);
        io.to(roomId).emit('property_bought', { playerId: player.id, tileId: player.position });
      }
      game.phase = 'managing';
      broadcastGameState(roomId);
      setTimeout(() => processBotPhase(roomId), 2000);
      break;

    case 'paying_rent': {
      const result = payRent(game, player, game.dice?.total || 7);
      if (result) {
        io.to(roomId).emit('rent_paid', {
          payerId: player.id,
          ownerId: result.ownerId,
          amount: result.amount,
          tileId: player.position,
        });
      }
      game.phase = 'managing';
      broadcastGameState(roomId);
      setTimeout(() => processBotPhase(roomId), 2000);
      break;
    }

    case 'card_drawn': {
      // First broadcast so players can see the card for a few seconds
      broadcastGameState(roomId);
      setTimeout(() => {
        const g = games.get(roomId);
        if (!g) return;
        if (g.currentCard) {
          const deck = g.currentCard.deck === 'lucky_chest' ? LUCKY_CHEST_CARDS : LUCK_CARDS;
          const card = deck.find(c => c.id === g.currentCard!.cardId);
          if (card) applyCardEffect(g, player, card);
        }
        g.currentCard = null;

        // Check if card moved us - process new tile
        const tile = getTileData(player.position);
        if (tile.type === 'property' || tile.type === 'station' || tile.type === 'utility') {
          const owner = getPropertyOwner(g, tile.id);
          if (owner && owner.id !== player.id && !owner.inJail) {
            g.phase = 'paying_rent';
            broadcastGameState(roomId);
            setTimeout(() => processBotPhase(roomId), 2000);
            return;
          }
        }

        g.phase = 'managing';
        broadcastGameState(roomId);
        setTimeout(() => processBotPhase(roomId), 2000);
      }, 3500);
      break;
    }

    case 'switch_position': {
      const target = BotAI.chooseSwitchTarget(player, game, difficulty);
      if (target) {
        switchPositions(game, player, target);
        const targetPlayer = game.players.find(p => p.id === target);
        if (targetPlayer) {
          io.to(roomId).emit('positions_switched', {
            player1Id: player.id, player2Id: target,
            pos1: player.position, pos2: targetPlayer.position,
          });
        }
      }
      game.phase = 'managing';
      broadcastGameState(roomId);
      setTimeout(() => processBotPhase(roomId), 2000);
      break;
    }

    case 'managing': {
      // Try to build houses
      const targets = BotAI.chooseBuildTargets(player, game, difficulty);
      for (const tileId of targets) {
        if (buildHouse(game, player, tileId)) {
          io.to(roomId).emit('house_built', {
            playerId: player.id,
            tileId,
            houses: player.houses[tileId] || 0,
          });
        }
      }
      broadcastGameState(roomId);
      setTimeout(() => endTurn(roomId, game), 1500);
      break;
    }

    default:
      endTurn(roomId, game);
      break;
  }
}

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log(`Player connected: ${socket.id}`);

  socket.on('create_room', ({ playerName, roomName, settings }) => {
    const roomId = uuidv4().slice(0, 6).toUpperCase();
    const playerId = uuidv4();

    const gameSettings: GameSettings = {
      maxPlayers: settings?.maxPlayers || 10,
      startingMoney: settings?.startingMoney || STARTING_MONEY,
      turnTimerSeconds: settings?.turnTimerSeconds || TURN_TIMER_SECONDS,
      botsEnabled: settings?.botsEnabled ?? true,
      botDifficulty: settings?.botDifficulty || 'normal',
    };

    const player: RoomPlayer = {
      id: playerId,
      name: playerName,
      pieceId: PLAYER_PIECES[0].id,
      ready: false,
      isBot: false,
      socketId: socket.id,
    };

    const room: Room = {
      id: roomId,
      name: roomName || `غرفة ${playerName}`,
      hostId: playerId,
      players: [player],
      maxPlayers: gameSettings.maxPlayers,
      gameStarted: false,
      settings: gameSettings,
    };

    rooms.set(roomId, room);
    playerRoomMap.set(socket.id, roomId);
    socket.join(roomId);

    socket.emit('room_updated', room);
    // Send player their ID
    socket.emit('game_event', {
      id: uuidv4(),
      type: 'player_id',
      message: playerId,
      messageAr: playerId,
      timestamp: Date.now(),
      data: { playerId, roomId },
    });
  });

  socket.on('join_room', ({ roomId, playerName }) => {
    const room = rooms.get(roomId.toUpperCase());
    if (!room) {
      socket.emit('error', 'الغرفة غير موجودة');
      return;
    }

    // Allow rejoining a resumed game
    if (room.gameStarted) {
      const game = games.get(room.id);
      if (game) {
        const matchPlayer = game.players.find(p => p.name === playerName && !p.isBot && !p.connected);
        if (matchPlayer) {
          matchPlayer.socketId = socket.id;
          matchPlayer.connected = true;
          playerRoomMap.set(socket.id, room.id);
          socket.join(room.id);
          socket.emit('game_event', {
            id: uuidv4(),
            type: 'player_id',
            message: '',
            messageAr: '',
            timestamp: Date.now(),
            data: { playerId: matchPlayer.id, roomId: room.id },
          });
          addEvent(game, 'freed', `${matchPlayer.name} rejoined!`, `${matchPlayer.name} عاد للعبة!`);
          broadcastRoom(room.id);
          broadcastGameState(room.id);
          return;
        }
      }
      socket.emit('error', 'اللعبة بدأت');
      return;
    }
    if (room.players.length >= room.maxPlayers) {
      socket.emit('error', 'الغرفة ممتلئة');
      return;
    }

    const playerId = uuidv4();
    const player: RoomPlayer = {
      id: playerId,
      name: playerName,
      pieceId: getAvailablePiece(room),
      ready: false,
      isBot: false,
      socketId: socket.id,
    };

    room.players.push(player);
    playerRoomMap.set(socket.id, room.id);
    socket.join(room.id);

    io.to(room.id).emit('player_joined', player);
    broadcastRoom(room.id);

    socket.emit('game_event', {
      id: uuidv4(),
      type: 'player_id',
      message: playerId,
      messageAr: playerId,
      timestamp: Date.now(),
      data: { playerId, roomId: room.id },
    });
  });

  socket.on('leave_room', () => {
    handleDisconnect(socket);
  });

  socket.on('select_piece', (pieceId) => {
    const roomId = playerRoomMap.get(socket.id);
    if (!roomId) return;
    const room = rooms.get(roomId);
    if (!room) return;

    const otherUsing = room.players.find(p => p.pieceId === pieceId && p.socketId !== socket.id);
    if (otherUsing) {
      socket.emit('error', 'هذه القطعة مستخدمة');
      return;
    }

    const player = room.players.find(p => p.socketId === socket.id);
    if (player) {
      player.pieceId = pieceId;
      broadcastRoom(roomId);
    }
  });

  socket.on('toggle_ready', () => {
    const roomId = playerRoomMap.get(socket.id);
    if (!roomId) return;
    const room = rooms.get(roomId);
    if (!room) return;

    const player = room.players.find(p => p.socketId === socket.id);
    if (player) {
      player.ready = !player.ready;
      broadcastRoom(roomId);
    }
  });

  socket.on('add_bot', (difficulty) => {
    const roomId = playerRoomMap.get(socket.id);
    if (!roomId) return;
    const room = rooms.get(roomId);
    if (!room) return;

    const hostPlayer = room.players.find(p => p.socketId === socket.id);
    if (!hostPlayer || hostPlayer.id !== room.hostId) return;
    if (room.players.length >= room.maxPlayers) return;

    const botNames = ['روبوت أبو نواس', 'روبوت المتنبي', 'روبوت الرشيد', 'روبوت السندباد', 'روبوت علي بابا', 'روبوت شهرزاد', 'روبوت حاتم الطائي', 'روبوت صلاح الدين'];
    const usedNames = new Set(room.players.map(p => p.name));
    const botName = botNames.find(n => !usedNames.has(n)) || `روبوت ${room.players.length}`;

    const bot: RoomPlayer = {
      id: uuidv4(),
      name: botName,
      pieceId: getAvailablePiece(room),
      ready: true,
      isBot: true,
    };

    room.players.push(bot);
    broadcastRoom(roomId);
  });

  socket.on('remove_bot', (botId) => {
    const roomId = playerRoomMap.get(socket.id);
    if (!roomId) return;
    const room = rooms.get(roomId);
    if (!room) return;

    const hostPlayer = room.players.find(p => p.socketId === socket.id);
    if (!hostPlayer || hostPlayer.id !== room.hostId) return;

    room.players = room.players.filter(p => p.id !== botId || !p.isBot);
    broadcastRoom(roomId);
  });

  socket.on('start_game', () => {
    const roomId = playerRoomMap.get(socket.id);
    if (!roomId) return;
    const room = rooms.get(roomId);
    if (!room) return;

    const hostPlayer = room.players.find(p => p.socketId === socket.id);
    if (!hostPlayer || hostPlayer.id !== room.hostId) return;

    if (room.players.length < 2) {
      socket.emit('error', 'يجب أن يكون هناك لاعبين على الأقل');
      return;
    }

    room.gameStarted = true;
    const gameState = createGameState(roomId, room.hostId, room.players, room.settings);
    games.set(roomId, gameState);

    broadcastRoom(roomId);
    broadcastGameState(roomId);
    startTurnTimer(roomId);
    handleBotTurn(roomId);
  });

  socket.on('roll_dice', () => {
    const roomId = playerRoomMap.get(socket.id);
    if (!roomId) return;
    const game = games.get(roomId);
    if (!game || game.phase !== 'rolling') return;

    const player = getCurrentPlayer(game);
    if (player.socketId !== socket.id) return;

    handleRollDice(roomId, game, player);
  });

  socket.on('buy_property', () => {
    const roomId = playerRoomMap.get(socket.id);
    if (!roomId) return;
    const game = games.get(roomId);
    if (!game || game.phase !== 'buying') return;

    const player = getCurrentPlayer(game);
    if (player.socketId !== socket.id) return;

    if (buyProperty(game, player)) {
      io.to(roomId).emit('property_bought', { playerId: player.id, tileId: player.position });
    }
    game.phase = 'managing';
    broadcastGameState(roomId);
  });

  socket.on('skip_buy', () => {
    const roomId = playerRoomMap.get(socket.id);
    if (!roomId) return;
    const game = games.get(roomId);
    if (!game || game.phase !== 'buying') return;

    const player = getCurrentPlayer(game);
    if (player.socketId !== socket.id) return;

    game.phase = 'managing';
    broadcastGameState(roomId);
  });

  socket.on('pay_rent', () => {
    const roomId = playerRoomMap.get(socket.id);
    if (!roomId) return;
    const game = games.get(roomId);
    if (!game || game.phase !== 'paying_rent') return;

    const player = getCurrentPlayer(game);
    if (player.socketId !== socket.id) return;

    const result = payRent(game, player, game.dice?.total || 7);
    if (result) {
      io.to(roomId).emit('rent_paid', {
        payerId: player.id,
        ownerId: result.ownerId,
        amount: result.amount,
        tileId: player.position,
      });
    }
    game.phase = 'managing';
    broadcastGameState(roomId);
  });

  socket.on('build_house', (tileId) => {
    const roomId = playerRoomMap.get(socket.id);
    if (!roomId) return;
    const game = games.get(roomId);
    if (!game || game.phase !== 'managing') return;

    const player = getCurrentPlayer(game);
    if (player.socketId !== socket.id) return;

    if (buildHouse(game, player, tileId)) {
      io.to(roomId).emit('house_built', {
        playerId: player.id,
        tileId,
        houses: player.houses[tileId] || 0,
      });
      broadcastGameState(roomId);
    }
  });

  socket.on('sell_house', (tileId) => {
    const roomId = playerRoomMap.get(socket.id);
    if (!roomId) return;
    const game = games.get(roomId);
    if (!game || game.phase !== 'managing') return;

    const player = getCurrentPlayer(game);
    if (player.socketId !== socket.id) return;

    if (sellHouse(game, player, tileId)) {
      broadcastGameState(roomId);
    }
  });

  socket.on('jail_pay', () => {
    const roomId = playerRoomMap.get(socket.id);
    if (!roomId) return;
    const game = games.get(roomId);
    if (!game || game.phase !== 'in_jail') return;

    const player = getCurrentPlayer(game);
    if (player.socketId !== socket.id) return;

    handleJailAction(roomId, game, player, 'pay');
  });

  socket.on('jail_card', () => {
    const roomId = playerRoomMap.get(socket.id);
    if (!roomId) return;
    const game = games.get(roomId);
    if (!game || game.phase !== 'in_jail') return;

    const player = getCurrentPlayer(game);
    if (player.socketId !== socket.id) return;

    handleJailAction(roomId, game, player, 'card');
  });

  socket.on('jail_wait', () => {
    const roomId = playerRoomMap.get(socket.id);
    if (!roomId) return;
    const game = games.get(roomId);
    if (!game || game.phase !== 'in_jail') return;

    const player = getCurrentPlayer(game);
    if (player.socketId !== socket.id) return;

    handleJailAction(roomId, game, player, 'wait');
  });

  socket.on('switch_position_target', (targetPlayerId) => {
    const roomId = playerRoomMap.get(socket.id);
    if (!roomId) return;
    const game = games.get(roomId);
    if (!game || game.phase !== 'switch_position') return;

    const player = getCurrentPlayer(game);
    if (player.socketId !== socket.id) return;

    if (switchPositions(game, player, targetPlayerId)) {
      const target = game.players.find(p => p.id === targetPlayerId);
      if (target) {
        io.to(roomId).emit('positions_switched', {
          player1Id: player.id, player2Id: targetPlayerId,
          pos1: player.position, pos2: target.position,
        });
      }
    }
    game.phase = 'managing';
    broadcastGameState(roomId);
  });

  socket.on('switch_position_skip', () => {
    const roomId = playerRoomMap.get(socket.id);
    if (!roomId) return;
    const game = games.get(roomId);
    if (!game || game.phase !== 'switch_position') return;

    const player = getCurrentPlayer(game);
    if (player.socketId !== socket.id) return;

    game.phase = 'managing';
    broadcastGameState(roomId);
  });

  socket.on('acknowledge_card', () => {
    const roomId = playerRoomMap.get(socket.id);
    if (!roomId) return;
    const game = games.get(roomId);
    if (!game || game.phase !== 'card_drawn') return;

    const player = getCurrentPlayer(game);
    if (player.socketId !== socket.id) return;

    if (game.currentCard) {
      const deck = game.currentCard.deck === 'lucky_chest' ? LUCKY_CHEST_CARDS : LUCK_CARDS;
      const card = deck.find(c => c.id === game.currentCard!.cardId);
      if (card) applyCardEffect(game, player, card);
    }
    game.currentCard = null;

    // Check if card moved player to a tile that needs action
    const newTile = getTileData(player.position);
    if ((newTile.type === 'property' || newTile.type === 'station' || newTile.type === 'utility' || newTile.type === 'special_property')) {
      const owner = getPropertyOwner(game, newTile.id);
      if (owner && owner.id !== player.id && !owner.inJail) {
        game.phase = 'paying_rent';
        broadcastGameState(roomId);
        return;
      } else if (!owner && player.money >= (newTile.property?.price || 0)) {
        game.phase = 'buying';
        broadcastGameState(roomId);
        return;
      }
    }

    game.phase = 'managing';
    broadcastGameState(roomId);
  });

  socket.on('end_turn', () => {
    const roomId = playerRoomMap.get(socket.id);
    if (!roomId) return;
    const game = games.get(roomId);
    if (!game || game.phase !== 'managing') return;

    const player = getCurrentPlayer(game);
    if (player.socketId !== socket.id) return;

    endTurn(roomId, game);
  });

  // End game (host only)
  socket.on('end_game', () => {
    const roomId = playerRoomMap.get(socket.id);
    if (!roomId) return;
    const game = games.get(roomId);
    const room = rooms.get(roomId);
    if (!game || !room) return;

    // Only host can end game
    if (socket.id !== room.players.find(p => p.id === room.hostId)?.id && socket.id !== (game.players.find(p => p.id === room.hostId) as any)?.socketId) return;

    // Find richest player (money + property values)
    const activePlayers = game.players.filter(p => !p.bankrupt);
    let richest = activePlayers[0];
    let maxWealth = 0;
    for (const p of activePlayers) {
      const propValue = p.properties.reduce((sum, id) => {
        const t = getTileData(id);
        return sum + (t?.property?.price || 0);
      }, 0);
      const wealth = p.money + propValue;
      if (wealth > maxWealth) {
        maxWealth = wealth;
        richest = p;
      }
    }

    game.phase = 'game_over';
    game.winner = richest?.id || null;
    addEvent(game, 'game_over', `${richest?.name || 'Nobody'} wins!`, `${richest?.name || 'لا أحد'} فاز باللعبة!`);
    broadcastGameState(roomId);
  });

  socket.on('pause_game', () => {
    const roomId = playerRoomMap.get(socket.id);
    if (!roomId) return;
    const game = games.get(roomId);
    const room = rooms.get(roomId);
    if (!game || !room) return;

    // Only host can pause
    const hostPlayer = game.players.find(p => p.id === room.hostId);
    if (!hostPlayer || hostPlayer.socketId !== socket.id) return;

    // Generate a 6-char pause code
    const pauseCode = Math.random().toString(36).substring(2, 8).toUpperCase();

    // Strip socket-specific data from game state
    const savedGame = JSON.parse(JSON.stringify(game));
    for (const p of savedGame.players) {
      delete p.socketId;
      p.connected = false;
    }
    savedGame.chatMessages = []; // Don't persist chat
    savedGame.trades = savedGame.trades.filter((t: any) => t.status === 'pending');

    const savedRoom = JSON.parse(JSON.stringify(room));
    for (const p of savedRoom.players) {
      delete p.socketId;
    }

    const pauseData = { game: savedGame, room: savedRoom, pausedAt: Date.now() };
    pausedGames.set(pauseCode, pauseData);

    // Save to disk
    try {
      fs.writeFileSync(join(PAUSED_DIR, `${pauseCode}.json`), JSON.stringify(pauseData));
    } catch {}

    // Notify all players
    io.to(roomId).emit('game_paused', { pauseCode });
    addEvent(game, 'game_over', `Game paused! Code: ${pauseCode}`, `تم إيقاف اللعبة! رمز الاستئناف: ${pauseCode}`);
    broadcastGameState(roomId);

    // Clean up the active game
    games.delete(roomId);
    rooms.delete(roomId);
    const timer = turnTimers.get(roomId);
    if (timer) { clearTimeout(timer); turnTimers.delete(roomId); }
  });

  socket.on('resume_game', ({ pauseCode, playerName }) => {
    const code = pauseCode.toUpperCase();
    const pauseData = pausedGames.get(code);
    if (!pauseData) {
      socket.emit('error', 'رمز الاستئناف غير صحيح');
      return;
    }

    const { game: savedGame, room: savedRoom } = pauseData;

    // Create a new room
    const newRoomId = uuidv4().substring(0, 6).toUpperCase();

    // Find matching player by name or assign first unconnected
    let matchedPlayer = savedGame.players.find((p: any) => p.name === playerName && !p.isBot);
    if (!matchedPlayer) {
      matchedPlayer = savedGame.players.find((p: any) => !p.isBot && !p.connected);
    }

    if (!matchedPlayer) {
      socket.emit('error', 'لا توجد أماكن متاحة في هذه اللعبة');
      return;
    }

    // Set up room
    savedRoom.id = newRoomId;
    savedRoom.gameStarted = true;
    savedRoom.hostId = matchedPlayer.id;

    // Set up game
    savedGame.id = newRoomId;
    savedGame.hostId = matchedPlayer.id;
    matchedPlayer.socketId = socket.id;
    matchedPlayer.connected = true;

    rooms.set(newRoomId, savedRoom);
    games.set(newRoomId, savedGame);
    playerRoomMap.set(socket.id, newRoomId);
    socket.join(newRoomId);

    // Emit player_id event
    socket.emit('game_event', {
      id: uuidv4(),
      type: 'player_id',
      message: '',
      messageAr: '',
      timestamp: Date.now(),
      data: { playerId: matchedPlayer.id, roomId: newRoomId },
    });

    addEvent(savedGame, 'freed', `${matchedPlayer.name} rejoined!`, `${matchedPlayer.name} عاد للعبة!`);
    broadcastRoom(newRoomId);
    broadcastGameState(newRoomId);

    // Don't delete pause data yet - other players still need to join
    // Delete after all human players reconnect
    const allHumansConnected = savedGame.players
      .filter((p: any) => !p.isBot && !p.bankrupt)
      .every((p: any) => p.connected);
    if (allHumansConnected) {
      pausedGames.delete(code);
      try { fs.unlinkSync(join(PAUSED_DIR, `${code}.json`)); } catch {}
    }
  });

  socket.on('send_chat', ({ text, recipientId }) => {
    const roomId = playerRoomMap.get(socket.id);
    if (!roomId) return;
    const game = games.get(roomId);
    const room = rooms.get(roomId);
    if (!game && !room) return;

    const players = game?.players || room?.players;
    const sender = players?.find(p => ('socketId' in p ? p.socketId : undefined) === socket.id);
    if (!sender) return;

    const msg = {
      id: uuidv4(),
      senderId: sender.id,
      senderName: sender.name,
      text,
      timestamp: Date.now(),
      isPrivate: !!recipientId,
      recipientId,
    };

    if (game) game.chatMessages.push(msg);

    if (recipientId) {
      const recipient = game?.players.find(p => p.id === recipientId);
      if (recipient?.socketId) {
        io.to(recipient.socketId).emit('chat_message', msg);
      }
      socket.emit('chat_message', msg);
    } else {
      io.to(roomId).emit('chat_message', msg);
    }
  });

  socket.on('propose_trade', (data) => {
    const roomId = playerRoomMap.get(socket.id);
    if (!roomId) return;
    const game = games.get(roomId);
    if (!game) return;

    const trade: TradeOffer = {
      ...data,
      conditions: data.conditions || [],
      id: uuidv4(),
      status: 'pending',
    };

    game.trades.push(trade);
    broadcastGameState(roomId);

    // Bot auto-respond to trades after delay
    const targetPlayer = game.players.find(p => p.id === trade.toPlayerId);
    if (targetPlayer?.isBot) {
      setTimeout(() => {
        const g = games.get(roomId);
        if (!g) return;
        const t = g.trades.find(tr => tr.id === trade.id);
        if (!t || t.status !== 'pending') return;

        // Bot logic: accept if offer value >= request value (simple)
        const offerValue = trade.offerMoney + trade.offerProperties.length * 200000;
        const requestValue = trade.requestMoney + trade.requestProperties.length * 200000;
        const accept = offerValue >= requestValue * 0.8; // Bots accept if roughly fair

        if (accept && executeTrade(g, t)) {
          t.status = 'accepted';
          addEvent(g, 'trade', `${targetPlayer.name} accepted a trade!`,
            `${targetPlayer.name} قبل عرض التبادل!`);
        } else {
          t.status = 'rejected';
          addEvent(g, 'trade', `${targetPlayer.name} rejected a trade`,
            `${targetPlayer.name} رفض عرض التبادل`);
        }
        broadcastGameState(roomId);
      }, 2000);
    }
  });

  socket.on('respond_trade', ({ tradeId, accept }) => {
    const roomId = playerRoomMap.get(socket.id);
    if (!roomId) return;
    const game = games.get(roomId);
    if (!game) return;

    const trade = game.trades.find(t => t.id === tradeId);
    if (!trade || trade.status !== 'pending') return;

    const responder = game.players.find(p => p.socketId === socket.id);
    if (!responder || responder.id !== trade.toPlayerId) return;

    if (accept) {
      if (executeTrade(game, trade)) {
        trade.status = 'accepted';
      } else {
        trade.status = 'rejected';
      }
    } else {
      trade.status = 'rejected';
    }

    broadcastGameState(roomId);
  });

  socket.on('cancel_trade', (tradeId) => {
    const roomId = playerRoomMap.get(socket.id);
    if (!roomId) return;
    const game = games.get(roomId);
    if (!game) return;

    const trade = game.trades.find(t => t.id === tradeId);
    if (!trade) return;

    const player = game.players.find(p => p.socketId === socket.id);
    if (!player || player.id !== trade.fromPlayerId) return;

    trade.status = 'cancelled';
    broadcastGameState(roomId);
  });

  socket.on('disconnect', () => {
    handleDisconnect(socket);
  });
});

function handleDisconnect(socket: any) {
  const roomId = playerRoomMap.get(socket.id);
  if (!roomId) return;

  const room = rooms.get(roomId);
  const game = games.get(roomId);

  if (game) {
    const player = game.players.find(p => p.socketId === socket.id);
    if (player) {
      player.connected = false;
      addEvent(game, 'disconnect', `${player.name} disconnected`,
        `${player.name} انقطع الاتصال`);
      broadcastGameState(roomId);
    }
  } else if (room) {
    const player = room.players.find(p => p.socketId === socket.id);
    if (player) {
      room.players = room.players.filter(p => p.id !== player.id);
      if (room.players.length === 0) {
        rooms.delete(roomId);
      } else if (player.id === room.hostId) {
        const newHost = room.players.find(p => !p.isBot);
        if (newHost) room.hostId = newHost.id;
      }
      broadcastRoom(roomId);
    }
  }

  playerRoomMap.delete(socket.id);
  socket.leave(roomId);
}

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`Baghdad Monopoly server running on port ${PORT}`);
});
