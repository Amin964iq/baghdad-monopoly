import { useState, useEffect, useCallback } from 'react';
import { socket } from './socket';
import Lobby from './components/Lobby';
import GameBoard from './components/GameBoard';
import AdminDashboard from './components/AdminDashboard';
import LoginScreen from './components/LoginScreen';

export interface GameStats {
  rentPaid: Record<string, number>;
  rentReceived: Record<string, number>;
  rentPaidTo: Record<string, Record<string, number>>;
  tileLandings: Record<string, Record<number, number>>;
  propertiesBought: Record<string, number>;
  doublesRolled: Record<string, number>;
  timesInJail: Record<string, number>;
  moneySpentOnHouses: Record<string, number>;
}

export interface GameState {
  id: string;
  hostId: string;
  players: Player[];
  currentPlayerIndex: number;
  phase: string;
  middlePot: number;
  dice: { die1: number; die2: number; total: number; isDouble: boolean } | null;
  doublesCount: number;
  currentCard: { deck: string; cardId: number } | null;
  trades: TradeOffer[];
  chatMessages: ChatMessage[];
  events: GameEvent[];
  turnTimer: number | null;
  turnStartedAt: number | null;
  settings: any;
  winner: string | null;
  gameStats?: GameStats;
}

export interface Player {
  id: string;
  name: string;
  pieceId: string;
  money: number;
  position: number;
  properties: number[];
  houses: Record<number, number>;
  inJail: boolean;
  jailTurns: number;
  getOutOfJailCards: number;
  rentImmunities: Record<number, string>;
  bankrupt: boolean;
  isBot: boolean;
  connected: boolean;
}

export interface Room {
  id: string;
  name: string;
  hostId: string;
  players: RoomPlayer[];
  maxPlayers: number;
  gameStarted: boolean;
  settings: any;
}

export interface RoomPlayer {
  id: string;
  name: string;
  pieceId: string;
  ready: boolean;
  isBot: boolean;
}

export interface TradeCondition {
  type: 'rent_immunity';
  tileId: number;
  beneficiary: 'from' | 'to';
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
  status: string;
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

export interface UserSession {
  username: string;
  isAdmin: boolean;
}

function AppRouter() {
  const [user, setUser] = useState<UserSession | null>(() => {
    const saved = localStorage.getItem('baghdad_user');
    return saved ? JSON.parse(saved) : null;
  });

  const handleLogin = (session: UserSession) => {
    setUser(session);
    localStorage.setItem('baghdad_user', JSON.stringify(session));
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('baghdad_user');
    localStorage.removeItem('baghdad_pin');
    localStorage.removeItem('admin_token');
  };

  if (!user) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  if (window.location.pathname === '/admin') {
    if (!user.isAdmin) {
      window.location.pathname = '/';
      return null;
    }
    return <AdminDashboard />;
  }
  return <GameApp user={user} onLogout={handleLogout} />;
}

export default AppRouter;

function GameApp({ user, onLogout }: { user: UserSession; onLogout: () => void }) {
  const [connected, setConnected] = useState(false);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [room, setRoom] = useState<Room | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [events, setEvents] = useState<GameEvent[]>([]);
  const [latestEvent, setLatestEvent] = useState<GameEvent | null>(null);
  const [pauseCode, setPauseCode] = useState<string | null>(null);

  useEffect(() => {
    socket.connect();

    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));

    socket.on('room_updated', (r: Room) => {
      setRoom(r);
      setRoomId(r.id);
    });

    let lastEventId = '';
    socket.on('game_state', (state: GameState) => {
      setGameState(state);
      // Detect new events
      const newEvents = state.events || [];
      if (newEvents.length > 0) {
        const latest = newEvents[newEvents.length - 1];
        if (latest.id !== lastEventId) {
          lastEventId = latest.id;
          setLatestEvent(latest);
          setTimeout(() => setLatestEvent(null), 4000);
        }
      }
      // Sync chat from game state
      if (state.chatMessages && state.chatMessages.length > 0) {
        setChatMessages(state.chatMessages);
      }
    });

    socket.on('game_event', (event: GameEvent) => {
      if (event.type === 'player_id') {
        setPlayerId(event.data.playerId);
        setRoomId(event.data.roomId);
      }
    });

    socket.on('chat_message', (msg: ChatMessage) => {
      setChatMessages(prev => [...prev.slice(-100), msg]);
    });

    socket.on('game_paused', ({ pauseCode }) => {
      setPauseCode(pauseCode);
    });

    socket.on('error', (msg: string) => {
      alert(msg);
    });

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('room_updated');
      socket.off('game_state');
      socket.off('game_event');
      socket.off('chat_message');
      socket.off('game_paused');
      socket.off('error');
    };
  }, []);

  const handleCreateRoom = useCallback((playerName: string, roomName: string) => {
    socket.emit('create_room', { playerName, roomName });
  }, []);

  const handleJoinRoom = useCallback((roomCode: string, playerName: string) => {
    socket.emit('join_room', { roomId: roomCode, playerName });
  }, []);

  const handleResumeGame = useCallback((code: string, playerName: string) => {
    socket.emit('resume_game', { pauseCode: code, playerName });
  }, []);

  // Not in a room yet - show lobby
  if (!room) {
    return <Lobby onCreateRoom={handleCreateRoom} onJoinRoom={handleJoinRoom} onResumeGame={handleResumeGame} connected={connected} user={user} onLogout={onLogout} />;
  }

  // In room, game not started - show waiting room
  // In room, game started - show game board
  return (
    <GameBoard
      room={room}
      gameState={gameState}
      playerId={playerId}
      chatMessages={chatMessages}
      events={events}
      latestEvent={latestEvent}
      pauseCode={pauseCode}
    />
  );
}
