// ========================================
// Baghdad Monopoly - Bot AI
// ========================================

import type { GameState, Player } from './types.js';
import {
  canBuildHouse, calculateNetWorth, getTileData, getPropertyOwner,
  getActivePlayers,
} from './gameEngine.js';
import { BOARD_TILES } from './gameData.js';

type Difficulty = 'easy' | 'normal' | 'smart';

function shouldBuyProperty(player: Player, state: GameState, difficulty: Difficulty): boolean {
  const tile = getTileData(player.position);
  if (!tile.property) return false;

  const price = tile.property.price;

  switch (difficulty) {
    case 'easy':
      // Easy bot: buy if can afford and has 50% left
      return player.money - price > player.money * 0.3;

    case 'normal': {
      // Normal bot: smarter about buying, considers group completion
      const group = tile.property.group;
      const groupTiles = BOARD_TILES.filter(t => t.property?.group === group);
      const ownedInGroup = groupTiles.filter(t => player.properties.includes(t.id)).length;
      const needForMonopoly = groupTiles.length - ownedInGroup - 1;

      if (needForMonopoly === 0) return player.money - price > 200_000;
      if (needForMonopoly === 1) return player.money - price > 300_000;
      return player.money - price > player.money * 0.4;
    }

    case 'smart': {
      // Smart bot: strategic buying
      const group = tile.property.group;
      const groupTiles = BOARD_TILES.filter(t => t.property?.group === group);
      const ownedInGroup = groupTiles.filter(t => player.properties.includes(t.id)).length;
      const opponentOwnsInGroup = groupTiles.filter(t => {
        const owner = getPropertyOwner(state, t.id);
        return owner && owner.id !== player.id;
      }).length;

      // Always buy if it completes a monopoly
      if (ownedInGroup === groupTiles.length - 1) return player.money - price > 100_000;

      // Buy to block opponents
      if (opponentOwnsInGroup > 0) return player.money - price > 200_000;

      // Stations are always good
      if (group === 'station') return player.money - price > 300_000;

      return player.money - price > player.money * 0.35;
    }
  }
}

function chooseBuildTargets(player: Player, state: GameState, difficulty: Difficulty): number[] {
  const targets: number[] = [];

  for (const tileId of player.properties) {
    if (canBuildHouse(state, player, tileId)) {
      targets.push(tileId);
    }
  }

  if (difficulty === 'easy') {
    // Easy: build randomly on one property
    return targets.length > 0 ? [targets[Math.floor(Math.random() * targets.length)]] : [];
  }

  if (difficulty === 'normal') {
    // Build on cheapest properties first
    return targets.sort((a, b) => {
      const tA = getTileData(a);
      const tB = getTileData(b);
      return (tA.property?.houseCost || 0) - (tB.property?.houseCost || 0);
    }).slice(0, 2);
  }

  // Smart: build strategically, keep cash reserve
  return targets.filter(tileId => {
    const tile = getTileData(tileId);
    return player.money - (tile.property?.houseCost || 0) > 500_000;
  }).slice(0, 3);
}

function chooseSwitchTarget(player: Player, state: GameState, difficulty: Difficulty): string | null {
  const activePlayers = getActivePlayers(state).filter(p => p.id !== player.id);
  if (activePlayers.length === 0) return null;

  if (difficulty === 'easy') {
    return null; // Easy bots don't use switch
  }

  // Find player with best position (near unowned expensive properties or free parking)
  const scored = activePlayers.map(p => {
    const tile = getTileData(p.position);
    let score = 0;
    if (tile.type === 'collect_pot' && state.middlePot > 100_000) score += 100;
    if (tile.type === 'go') score += 50;
    // Avoid jail
    if (tile.type === 'go_to_jail') score -= 100;
    return { player: p, score };
  });

  const best = scored.sort((a, b) => b.score - a.score)[0];
  if (best && best.score > 0) return best.player.id;
  return null;
}

function chooseJailAction(player: Player, state: GameState, difficulty: Difficulty): 'pay' | 'card' | 'roll' | 'wait' {
  if (player.getOutOfJailCards > 0) return 'card';

  if (difficulty === 'easy') {
    return player.jailTurns >= 2 ? 'pay' : 'wait';
  }

  if (difficulty === 'smart') {
    // Smart: stay in jail early game (fewer properties to land on)
    const totalOwned = state.players.reduce((sum, p) => sum + p.properties.length, 0);
    if (totalOwned > 15 && player.money > 300_000) return 'pay';
    return player.jailTurns >= 2 ? 'pay' : 'roll';
  }

  return player.jailTurns >= 1 ? 'pay' : 'roll';
}

export const BotAI = {
  shouldBuyProperty,
  chooseBuildTargets,
  chooseSwitchTarget,
  chooseJailAction,
};
