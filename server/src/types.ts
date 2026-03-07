// ========================================
// Baghdad Monopoly - Shared Types
// ========================================

export interface Player {
  id: string;
  name: string;
  pieceId: string;
  money: number;
  position: number;
  properties: number[]; // tile IDs
  houses: Record<number, number>; // tileId -> house count (5 = hotel)
  inJail: boolean;
  jailTurns: number;
  getOutOfJailCards: number;
  rentImmunities: Record<number, string>; // tileId -> playerId who is immune from rent
  bankrupt: boolean;
  isBot: boolean;
  botDifficulty?: 'easy' | 'normal' | 'smart';
  connected: boolean;
  socketId?: string;
}

export interface TradeCondition {
  type: 'rent_immunity';    // player won't pay rent on this tile
  tileId: number;           // which property
  beneficiary: 'from' | 'to'; // who gets the immunity
}

export interface TradeOffer {
  id: string;
  fromPlayerId: string;
  toPlayerId: string;
  offerProperties: number[];
  offerMoney: number;
  requestProperties: number[];
  requestMoney: number;
  offerJailCards: number;
  requestJailCards: number;
  conditions: TradeCondition[];
  status: 'pending' | 'accepted' | 'rejected' | 'cancelled';
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: number;
  isPrivate: boolean;
  recipientId?: string;
}

export interface GameEvent {
  id: string;
  type: string;
  message: string;
  messageAr: string;
  timestamp: number;
  data?: any;
}

export type GamePhase =
  | 'waiting'       // In lobby
  | 'rolling'       // Player needs to roll
  | 'moving'        // Animation phase
  | 'tile_action'   // Processing tile effect
  | 'buying'        // Player can buy property
  | 'paying_rent'   // Player paying rent
  | 'card_drawn'    // Card drawn, showing effect
  | 'in_jail'       // Player in jail, choosing action
  | 'switch_position' // Player choosing who to swap with
  | 'managing'      // Player managing properties (build/sell)
  | 'trading'       // Trade in progress
  | 'bankrupt'      // Player going bankrupt
  | 'game_over';    // Game ended

export interface DiceResult {
  die1: number;
  die2: number;
  total: number;
  isDouble: boolean;
}

export interface GameState {
  id: string;
  hostId: string;
  players: Player[];
  currentPlayerIndex: number;
  phase: GamePhase;
  middlePot: number;
  dice: DiceResult | null;
  doublesCount: number;
  luckyChestDeck: number[];   // shuffled card IDs
  luckCardDeck: number[];     // shuffled card IDs
  luckyChestIndex: number;
  luckCardIndex: number;
  currentCard: { deck: 'lucky_chest' | 'luck_card'; cardId: number } | null;
  trades: TradeOffer[];
  chatMessages: ChatMessage[];
  events: GameEvent[];
  turnTimer: number | null;
  settings: GameSettings;
  winner: string | null;
  createdAt: number;
}

export interface GameSettings {
  maxPlayers: number;
  startingMoney: number;
  turnTimerSeconds: number;
  botsEnabled: boolean;
  botDifficulty: 'easy' | 'normal' | 'smart';
}

export interface Room {
  id: string;
  name: string;
  hostId: string;
  players: RoomPlayer[];
  maxPlayers: number;
  gameStarted: boolean;
  settings: GameSettings;
}

export interface RoomPlayer {
  id: string;
  name: string;
  pieceId: string;
  ready: boolean;
  isBot: boolean;
  socketId?: string;
}

// Socket events
export interface ServerToClientEvents {
  room_updated: (room: Room) => void;
  game_state: (state: GameState) => void;
  game_event: (event: GameEvent) => void;
  chat_message: (message: ChatMessage) => void;
  trade_offer: (trade: TradeOffer) => void;
  error: (message: string) => void;
  game_paused: (data: { pauseCode: string }) => void;
  player_joined: (player: RoomPlayer) => void;
  player_left: (playerId: string) => void;
  dice_rolled: (result: DiceResult & { playerId: string }) => void;
  player_moved: (data: { playerId: string; from: number; to: number; passedGo: boolean }) => void;
  property_bought: (data: { playerId: string; tileId: number }) => void;
  rent_paid: (data: { payerId: string; ownerId: string; amount: number; tileId: number }) => void;
  house_built: (data: { playerId: string; tileId: number; houses: number }) => void;
  player_jailed: (playerId: string) => void;
  player_freed: (playerId: string) => void;
  player_bankrupt: (playerId: string) => void;
  pot_collected: (data: { playerId: string; amount: number }) => void;
  positions_switched: (data: { player1Id: string; player2Id: string; pos1: number; pos2: number }) => void;
  turn_changed: (data: { playerId: string; phase: GamePhase }) => void;
}

export interface ClientToServerEvents {
  create_room: (data: { playerName: string; roomName: string; settings?: Partial<GameSettings> }) => void;
  join_room: (data: { roomId: string; playerName: string }) => void;
  leave_room: () => void;
  select_piece: (pieceId: string) => void;
  toggle_ready: () => void;
  add_bot: (difficulty?: 'easy' | 'normal' | 'smart') => void;
  remove_bot: (botId: string) => void;
  start_game: () => void;
  roll_dice: () => void;
  buy_property: () => void;
  skip_buy: () => void;
  build_house: (tileId: number) => void;
  sell_house: (tileId: number) => void;
  pay_rent: () => void;
  jail_pay: () => void;
  jail_card: () => void;
  jail_wait: () => void;
  switch_position_target: (targetPlayerId: string) => void;
  switch_position_skip: () => void;
  end_turn: () => void;
  send_chat: (data: { text: string; recipientId?: string }) => void;
  propose_trade: (data: Omit<TradeOffer, 'id' | 'status'>) => void;
  respond_trade: (data: { tradeId: string; accept: boolean }) => void;
  cancel_trade: (tradeId: string) => void;
  acknowledge_card: () => void;
  end_game: () => void;
  pause_game: () => void;
  resume_game: (data: { pauseCode: string; playerName: string }) => void;
}
