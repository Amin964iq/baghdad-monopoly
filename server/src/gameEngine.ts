// ========================================
// Baghdad Monopoly - Game Engine
// ========================================

import { v4 as uuidv4 } from 'uuid';
import {
  BOARD_TILES, LUCKY_CHEST_CARDS, LUCK_CARDS,
  STATION_RENT, UTILITY_RENT_MULTIPLIER,
  STARTING_MONEY, GO_PASS_BONUS, GO_LAND_BONUS,
  TAX_AMOUNT, BANK_TAX_AMOUNT, JAIL_BAIL,
  JAIL_MAX_TURNS, SWITCH_POSITION_COST, MAX_HOUSES,
} from './gameData.js';
import type { TileData, CardData, CardEffect } from './gameData.js';
import type {
  GameState, GameStats, Player, DiceResult, GamePhase, GameEvent,
  GameSettings, RoomPlayer, TradeOffer,
} from './types.js';

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function createGameState(roomId: string, hostId: string, players: RoomPlayer[], settings: GameSettings): GameState {
  const gamePlayers: Player[] = players.map(p => ({
    id: p.id,
    name: p.name,
    pieceId: p.pieceId,
    money: settings.startingMoney,
    position: 0,
    properties: [],
    houses: {},
    inJail: false,
    jailTurns: 0,
    getOutOfJailCards: 0,
    rentImmunities: {},
    bankrupt: false,
    isBot: p.isBot,
    botDifficulty: p.isBot ? (settings.botDifficulty || 'normal') : undefined,
    connected: !p.isBot,
    socketId: p.socketId,
  }));

  const gameStats: GameStats = {
    rentPaid: {},
    rentReceived: {},
    rentPaidTo: {},
    tileLandings: {},
    propertiesBought: {},
    doublesRolled: {},
    timesInJail: {},
    moneySpentOnHouses: {},
  };

  return {
    id: roomId,
    hostId,
    players: gamePlayers,
    currentPlayerIndex: 0,
    phase: 'rolling',
    middlePot: 0,
    dice: null,
    doublesCount: 0,
    luckyChestDeck: shuffleArray(LUCKY_CHEST_CARDS.map(c => c.id)),
    luckCardDeck: shuffleArray(LUCK_CARDS.map(c => c.id)),
    luckyChestIndex: 0,
    luckCardIndex: 0,
    currentCard: null,
    trades: [],
    chatMessages: [],
    events: [],
    turnTimer: null,
    turnStartedAt: Date.now(),
    settings,
    winner: null,
    createdAt: Date.now(),
    gameStats,
  };
}

export function getCurrentPlayer(state: GameState): Player {
  return state.players[state.currentPlayerIndex];
}

export function rollDice(): DiceResult {
  const die1 = Math.floor(Math.random() * 6) + 1;
  const die2 = Math.floor(Math.random() * 6) + 1;
  return { die1, die2, total: die1 + die2, isDouble: die1 === die2 };
}

export function addEvent(state: GameState, type: string, message: string, messageAr: string, data?: any): GameEvent {
  const event: GameEvent = {
    id: uuidv4(),
    type,
    message,
    messageAr,
    timestamp: Date.now(),
    data,
  };
  state.events.push(event);
  if (state.events.length > 100) state.events.shift();
  return event;
}

function trackLanding(state: GameState, playerId: string, tileId: number) {
  if (!state.gameStats.tileLandings[playerId]) state.gameStats.tileLandings[playerId] = {};
  state.gameStats.tileLandings[playerId][tileId] = (state.gameStats.tileLandings[playerId][tileId] || 0) + 1;
}

export function movePlayer(state: GameState, player: Player, steps: number): { passedGo: boolean; newPosition: number } {
  const oldPos = player.position;
  const newPos = (oldPos + steps) % 40;
  const passedGo = steps > 0 && newPos < oldPos;

  player.position = newPos;
  trackLanding(state, player.id, newPos);

  if (passedGo) {
    player.money += GO_PASS_BONUS;
    addEvent(state, 'pass_go', `${player.name} passed GO and collected ${GO_PASS_BONUS.toLocaleString()} IQD`,
      `${player.name} عبر الانطلاق وحصل على ${GO_PASS_BONUS.toLocaleString()} دينار`);
  }

  return { passedGo, newPosition: newPos };
}

export function movePlayerToTile(state: GameState, player: Player, tileId: number): { passedGo: boolean } {
  const oldPos = player.position;
  const passedGo = tileId <= oldPos && tileId !== oldPos;

  player.position = tileId;

  if (passedGo && tileId !== 10) { // Don't collect GO money when going to jail
    player.money += GO_PASS_BONUS;
    addEvent(state, 'pass_go', `${player.name} passed GO and collected ${GO_PASS_BONUS.toLocaleString()} IQD`,
      `${player.name} عبر الانطلاق وحصل على ${GO_PASS_BONUS.toLocaleString()} دينار`);
  }

  return { passedGo };
}

export function getTileData(tileId: number): TileData {
  return BOARD_TILES[tileId];
}

export function getPropertyOwner(state: GameState, tileId: number): Player | null {
  return state.players.find(p => !p.bankrupt && p.properties.includes(tileId)) || null;
}

export function calculateRent(state: GameState, tileId: number, diceTotal: number): number {
  const tile = getTileData(tileId);
  const owner = getPropertyOwner(state, tileId);
  if (!tile.property || !owner) return 0;

  const group = tile.property.group;

  // Stations
  if (group === 'station') {
    const stationCount = owner.properties.filter(id => {
      const t = getTileData(id);
      return t.property?.group === 'station';
    }).length;
    return STATION_RENT[stationCount] || 0;
  }

  // Utility
  if (group === 'utility') {
    return diceTotal * UTILITY_RENT_MULTIPLIER;
  }

  // Special property
  if (group === 'special') {
    return tile.property.baseRent;
  }

  // Regular property
  const houses = owner.houses[tileId] || 0;

  if (houses === 0) {
    // Check if owner has monopoly (all properties in group)
    const groupTiles = BOARD_TILES.filter(t => t.property?.group === group);
    const ownsAll = groupTiles.every(t => owner.properties.includes(t.id));
    return ownsAll ? tile.property.baseRent * 2 : tile.property.baseRent;
  }

  if (houses === 5) return tile.property.rentHotel;

  const rentLevels = [
    tile.property.baseRent,
    tile.property.rent1House,
    tile.property.rent2House,
    tile.property.rent3House,
    tile.property.rent4House,
  ];
  return rentLevels[houses] || tile.property.baseRent;
}

export function canBuildHouse(state: GameState, player: Player, tileId: number): boolean {
  const tile = getTileData(tileId);
  if (!tile.property) return false;
  if (!player.properties.includes(tileId)) return false;

  const group = tile.property.group;
  if (['station', 'utility', 'special'].includes(group)) return false;

  // Must own all properties in group
  const groupTiles = BOARD_TILES.filter(t => t.property?.group === group);
  const ownsAll = groupTiles.every(t => player.properties.includes(t.id));
  if (!ownsAll) return false;

  const currentHouses = player.houses[tileId] || 0;
  if (currentHouses >= 5) return false; // Already a hotel

  // Even building rule: can't build if another property in group has fewer houses
  const minHouses = Math.min(...groupTiles.map(t => player.houses[t.id] || 0));
  if (currentHouses > minHouses) return false;

  // Check money
  if (player.money < tile.property.houseCost) return false;

  return true;
}

export function buildHouse(state: GameState, player: Player, tileId: number): boolean {
  if (!canBuildHouse(state, player, tileId)) return false;

  const tile = getTileData(tileId);
  if (!tile.property) return false;

  player.money -= tile.property.houseCost;
  player.houses[tileId] = (player.houses[tileId] || 0) + 1;
  state.gameStats.moneySpentOnHouses[player.id] = (state.gameStats.moneySpentOnHouses[player.id] || 0) + tile.property.houseCost;

  const houses = player.houses[tileId];
  const buildingType = houses === 5 ? 'فندق' : 'بيت';
  addEvent(state, 'build', `${player.name} built a ${houses === 5 ? 'hotel' : 'house'} on ${tile.nameEn}`,
    `${player.name} بنى ${buildingType} في ${tile.name}`);

  return true;
}

export function sellHouse(state: GameState, player: Player, tileId: number): boolean {
  const tile = getTileData(tileId);
  if (!tile.property) return false;
  if (!player.properties.includes(tileId)) return false;

  const currentHouses = player.houses[tileId] || 0;
  if (currentHouses === 0) return false;

  // Even selling: can't sell if another property in group has more houses
  const group = tile.property.group;
  const groupTiles = BOARD_TILES.filter(t => t.property?.group === group);
  const maxHouses = Math.max(...groupTiles.map(t => player.houses[t.id] || 0));
  if (currentHouses < maxHouses) return false;

  player.houses[tileId] = currentHouses - 1;
  player.money += Math.floor(tile.property.houseCost / 2); // Sell at half price

  return true;
}

export function sendToJail(state: GameState, player: Player): void {
  player.position = 10;
  player.inJail = true;
  player.jailTurns = 0;
  state.doublesCount = 0;
  state.gameStats.timesInJail[player.id] = (state.gameStats.timesInJail[player.id] || 0) + 1;
  addEvent(state, 'jail', `${player.name} was sent to jail!`,
    `${player.name} راح للسجن!`);
}

export function freeFromJail(state: GameState, player: Player): void {
  player.inJail = false;
  player.jailTurns = 0;
  addEvent(state, 'freed', `${player.name} is free from jail!`,
    `${player.name} طلع من السجن!`);
}

export function drawCard(state: GameState, deck: 'lucky_chest' | 'luck_card'): CardData {
  if (deck === 'lucky_chest') {
    const cardId = state.luckyChestDeck[state.luckyChestIndex];
    state.luckyChestIndex = (state.luckyChestIndex + 1) % state.luckyChestDeck.length;
    return LUCKY_CHEST_CARDS.find(c => c.id === cardId)!;
  } else {
    const cardId = state.luckCardDeck[state.luckCardIndex];
    state.luckCardIndex = (state.luckCardIndex + 1) % state.luckCardDeck.length;
    return LUCK_CARDS.find(c => c.id === cardId)!;
  }
}

export function applyCardEffect(state: GameState, player: Player, card: CardData): void {
  const effect = card.effect;

  switch (effect.type) {
    case 'gain_money':
      player.money += effect.amount;
      break;

    case 'lose_money':
      player.money -= effect.amount;
      if (player.money < 0) player.money = 0;
      break;

    case 'pay_to_pot':
      player.money -= effect.amount;
      state.middlePot += effect.amount;
      if (player.money < 0) player.money = 0;
      break;

    case 'pay_each_player':
      state.players.forEach(p => {
        if (p.id !== player.id && !p.bankrupt) {
          player.money -= effect.amount;
          p.money += effect.amount;
        }
      });
      if (player.money < 0) player.money = 0;
      break;

    case 'collect_from_each_player':
      state.players.forEach(p => {
        if (p.id !== player.id && !p.bankrupt) {
          const amount = Math.min(effect.amount, p.money);
          p.money -= amount;
          player.money += amount;
        }
      });
      break;

    case 'move_to':
      movePlayerToTile(state, player, effect.tileId);
      break;

    case 'move_forward':
      movePlayer(state, player, effect.steps);
      break;

    case 'move_backward': {
      const newPos = (player.position - effect.steps + 40) % 40;
      player.position = newPos;
      break;
    }

    case 'go_to_jail':
      sendToJail(state, player);
      break;

    case 'get_out_of_jail':
      player.getOutOfJailCards += 1;
      break;

    case 'advance_to_nearest_station': {
      const stationTiles = [5, 15, 25, 35];
      const pos = player.position;
      const nearest = stationTiles.find(s => s > pos) || stationTiles[0];
      movePlayerToTile(state, player, nearest);
      break;
    }

    case 'repair_buildings': {
      let totalCost = 0;
      for (const tileId of player.properties) {
        const h = player.houses[tileId] || 0;
        if (h === 5) {
          totalCost += effect.perHotel;
        } else {
          totalCost += h * effect.perHouse;
        }
      }
      player.money -= totalCost;
      state.middlePot += totalCost;
      if (player.money < 0) player.money = 0;
      break;
    }
  }
}

export function processTileAction(state: GameState, player: Player): GamePhase {
  const tile = getTileData(player.position);

  switch (tile.type) {
    case 'go':
      // Extra bonus for landing exactly on GO
      player.money += GO_LAND_BONUS - GO_PASS_BONUS; // passedGo already gave GO_PASS_BONUS
      addEvent(state, 'land_go', `${player.name} landed on GO and got bonus ${GO_LAND_BONUS.toLocaleString()} IQD!`,
        `${player.name} وقف على الانطلاق وحصل على ${GO_LAND_BONUS.toLocaleString()} دينار!`);
      return 'managing';

    case 'property':
    case 'station':
    case 'utility':
    case 'special_property': {
      const owner = getPropertyOwner(state, tile.id);
      if (!owner) {
        if (player.money >= (tile.property?.price || 0)) {
          return 'buying';
        }
        return 'managing';
      }
      if (owner.id === player.id) {
        return 'managing';
      }
      if (owner.inJail) {
        return 'managing'; // No rent while in jail
      }
      return 'paying_rent';
    }

    case 'tax':
      player.money -= TAX_AMOUNT;
      state.middlePot += TAX_AMOUNT;
      addEvent(state, 'tax', `${player.name} paid ${TAX_AMOUNT.toLocaleString()} IQD tax`,
        `${player.name} دفع ضريبة ${TAX_AMOUNT.toLocaleString()} دينار`);
      if (player.money < 0) player.money = 0;
      return 'managing';

    case 'bank_tax':
      player.money -= BANK_TAX_AMOUNT;
      state.middlePot += BANK_TAX_AMOUNT;
      addEvent(state, 'bank_tax', `${player.name} paid ${BANK_TAX_AMOUNT.toLocaleString()} IQD bank tax`,
        `${player.name} دفع ضريبة بنك ${BANK_TAX_AMOUNT.toLocaleString()} دينار`);
      if (player.money < 0) player.money = 0;
      return 'managing';

    case 'lucky_chest':
    case 'luck_card': {
      const deckType = tile.type === 'lucky_chest' ? 'lucky_chest' : 'luck_card';
      const card = drawCard(state, deckType);
      state.currentCard = { deck: deckType, cardId: card.id };
      addEvent(state, 'card', `${player.name} drew a card: ${card.textEn}`,
        `${player.name} سحب بطاقة: ${card.text}`);
      return 'card_drawn';
    }

    case 'jail':
      // Just visiting
      return 'managing';

    case 'go_to_jail':
      sendToJail(state, player);
      return 'managing';

    case 'collect_pot': {
      const amount = state.middlePot;
      player.money += amount;
      state.middlePot = 0;
      addEvent(state, 'collect_pot', `${player.name} collected ${amount.toLocaleString()} IQD from the pot!`,
        `${player.name} جمع ${amount.toLocaleString()} دينار من الصندوق!`);
      return 'managing';
    }

    case 'switch_position':
      if (player.money >= SWITCH_POSITION_COST) {
        return 'switch_position';
      }
      return 'managing';

    default:
      return 'managing';
  }
}

export function buyProperty(state: GameState, player: Player): boolean {
  const tile = getTileData(player.position);
  if (!tile.property) return false;
  if (getPropertyOwner(state, tile.id)) return false;
  if (player.money < tile.property.price) return false;

  player.money -= tile.property.price;
  player.properties.push(tile.id);

  // Track stats
  state.gameStats.propertiesBought[player.id] = (state.gameStats.propertiesBought[player.id] || 0) + 1;

  addEvent(state, 'buy', `${player.name} bought ${tile.nameEn} for ${tile.property.price.toLocaleString()} IQD`,
    `${player.name} اشترى ${tile.name} بـ ${tile.property.price.toLocaleString()} دينار`);

  return true;
}

export function payRent(state: GameState, payer: Player, diceTotal: number): { ownerId: string; amount: number } | null {
  const tile = getTileData(payer.position);
  const owner = getPropertyOwner(state, tile.id);
  if (!owner || owner.id === payer.id || owner.inJail) return null;

  // Check rent immunity - if the owner granted immunity to this payer for this tile
  if (owner.rentImmunities[tile.id] === payer.id) {
    addEvent(state, 'immunity', `${payer.name} has rent immunity on ${tile.name}!`,
      `${payer.name} معفى من الإيجار على ${tile.name}!`);
    return { ownerId: owner.id, amount: 0 };
  }

  const rent = calculateRent(state, tile.id, diceTotal);
  const actualPayment = Math.min(rent, payer.money);
  payer.money -= actualPayment;
  owner.money += actualPayment;

  addEvent(state, 'rent', `${payer.name} paid ${actualPayment.toLocaleString()} IQD rent to ${owner.name}`,
    `${payer.name} دفع ${actualPayment.toLocaleString()} دينار إيجار لـ ${owner.name}`);

  // Track stats
  state.gameStats.rentPaid[payer.id] = (state.gameStats.rentPaid[payer.id] || 0) + actualPayment;
  state.gameStats.rentReceived[owner.id] = (state.gameStats.rentReceived[owner.id] || 0) + actualPayment;
  if (!state.gameStats.rentPaidTo[payer.id]) state.gameStats.rentPaidTo[payer.id] = {};
  state.gameStats.rentPaidTo[payer.id][owner.id] = (state.gameStats.rentPaidTo[payer.id][owner.id] || 0) + actualPayment;

  return { ownerId: owner.id, amount: actualPayment };
}

export function switchPositions(state: GameState, player: Player, targetId: string): boolean {
  const target = state.players.find(p => p.id === targetId && !p.bankrupt);
  if (!target) return false;
  if (player.money < SWITCH_POSITION_COST) return false;

  player.money -= SWITCH_POSITION_COST;
  const tempPos = player.position;
  player.position = target.position;
  target.position = tempPos;

  addEvent(state, 'switch', `${player.name} switched positions with ${target.name}!`,
    `${player.name} بدّل موقعه مع ${target.name}!`);

  return true;
}

export function checkBankrupt(player: Player, threshold: number = -500000): boolean {
  return player.money <= threshold && !player.bankrupt;
}

export function bankruptPlayer(state: GameState, player: Player): void {
  player.bankrupt = true;
  // Return all properties to unowned
  player.properties = [];
  player.houses = {};
  addEvent(state, 'bankrupt', `${player.name} went bankrupt!`,
    `${player.name} أفلس!`);
}

export function sellProperty(state: GameState, player: Player, tileId: number): boolean {
  if (!player.properties.includes(tileId)) return false;
  const tile = getTileData(tileId);
  if (!tile.property) return false;

  // Can't sell if there are houses on any property in the group
  const group = tile.property.group;
  if (!['station', 'utility', 'special'].includes(group)) {
    const groupTiles = BOARD_TILES.filter(t => t.property?.group === group);
    const hasHouses = groupTiles.some(t => (player.houses[t.id] || 0) > 0);
    if (hasHouses) return false;
  }

  const sellPrice = Math.floor(tile.property.price / 2);
  player.money += sellPrice;
  player.properties = player.properties.filter(id => id !== tileId);
  delete player.houses[tileId];

  addEvent(state, 'sell', `${player.name} sold ${tile.nameEn} for ${sellPrice.toLocaleString()} IQD`,
    `${player.name} باع ${tile.name} بـ ${sellPrice.toLocaleString()} دينار`);

  return true;
}

export function getActivePlayers(state: GameState): Player[] {
  return state.players.filter(p => !p.bankrupt);
}

export function checkGameOver(state: GameState): boolean {
  const active = getActivePlayers(state);
  if (active.length <= 1) {
    state.phase = 'game_over';
    state.winner = active[0]?.id || null;
    if (active[0]) {
      addEvent(state, 'game_over', `${active[0].name} wins the game!`,
        `${active[0].name} فاز باللعبة! الف مبروك!`);
    }
    return true;
  }
  return false;
}

export function advanceToNextPlayer(state: GameState): void {
  const numPlayers = state.players.length;
  let nextIndex = (state.currentPlayerIndex + 1) % numPlayers;

  // Skip bankrupt players
  let attempts = 0;
  while (state.players[nextIndex].bankrupt && attempts < numPlayers) {
    nextIndex = (nextIndex + 1) % numPlayers;
    attempts++;
  }

  state.currentPlayerIndex = nextIndex;
  state.phase = 'rolling';
  state.dice = null;
  state.doublesCount = 0;
  state.currentCard = null;

  const currentPlayer = getCurrentPlayer(state);
  if (currentPlayer.inJail) {
    state.phase = 'in_jail';
  }
}

export function calculateNetWorth(player: Player): number {
  let worth = player.money;
  for (const tileId of player.properties) {
    const tile = getTileData(tileId);
    if (tile.property) {
      worth += tile.property.price;
      const houses = player.houses[tileId] || 0;
      if (houses > 0) {
        worth += houses * tile.property.houseCost;
      }
    }
  }
  return worth;
}

export function executeTrade(state: GameState, trade: TradeOffer): boolean {
  const from = state.players.find(p => p.id === trade.fromPlayerId);
  const to = state.players.find(p => p.id === trade.toPlayerId);
  if (!from || !to) return false;

  // Validate
  if (from.money < trade.offerMoney) return false;
  if (to.money < trade.requestMoney) return false;
  if (!trade.offerProperties.every(id => from.properties.includes(id))) return false;
  if (!trade.requestProperties.every(id => to.properties.includes(id))) return false;
  if (from.getOutOfJailCards < trade.offerJailCards) return false;
  if (to.getOutOfJailCards < trade.requestJailCards) return false;

  // Execute money
  from.money -= trade.offerMoney;
  to.money += trade.offerMoney;
  to.money -= trade.requestMoney;
  from.money += trade.requestMoney;

  // Execute properties
  for (const id of trade.offerProperties) {
    from.properties = from.properties.filter(p => p !== id);
    to.properties.push(id);
  }
  for (const id of trade.requestProperties) {
    to.properties = to.properties.filter(p => p !== id);
    from.properties.push(id);
  }

  // Jail cards
  from.getOutOfJailCards -= trade.offerJailCards;
  to.getOutOfJailCards += trade.offerJailCards;
  to.getOutOfJailCards -= trade.requestJailCards;
  from.getOutOfJailCards += trade.requestJailCards;

  // Apply conditions (rent immunities)
  if (trade.conditions) {
    for (const cond of trade.conditions) {
      if (cond.type === 'rent_immunity') {
        // The property owner grants immunity to the other player
        if (cond.beneficiary === 'from') {
          // 'from' player gets immunity - the tile must be owned by 'to'
          to.rentImmunities[cond.tileId] = from.id;
        } else {
          // 'to' player gets immunity - the tile must be owned by 'from'
          from.rentImmunities[cond.tileId] = to.id;
        }
      }
    }
  }

  addEvent(state, 'trade', `${from.name} and ${to.name} completed a trade!`,
    `${from.name} و ${to.name} أتمّوا صفقة!`);

  return true;
}
