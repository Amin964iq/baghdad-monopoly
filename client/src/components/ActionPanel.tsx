import { socket } from '../socket';
import type { GameState, Player } from '../App';
import { BOARD_TILES, formatMoney, GROUP_COLORS } from '../gameData';

const RENT_DATA: Record<number, { baseRent: number; rent1: number; rent2: number; rent3: number; rent4: number; hotel: number; houseCost: number }> = {
  1: { baseRent: 2000, rent1: 10000, rent2: 30000, rent3: 90000, rent4: 160000, hotel: 250000, houseCost: 50000 },
  3: { baseRent: 4000, rent1: 20000, rent2: 60000, rent3: 180000, rent4: 320000, hotel: 450000, houseCost: 50000 },
  6: { baseRent: 8000, rent1: 40000, rent2: 100000, rent3: 300000, rent4: 450000, hotel: 600000, houseCost: 50000 },
  7: { baseRent: 10000, rent1: 50000, rent2: 150000, rent3: 450000, rent4: 625000, hotel: 750000, houseCost: 100000 },
  9: { baseRent: 12000, rent1: 60000, rent2: 180000, rent3: 500000, rent4: 700000, hotel: 900000, houseCost: 100000 },
  11: { baseRent: 18000, rent1: 90000, rent2: 250000, rent3: 700000, rent4: 875000, hotel: 1050000, houseCost: 150000 },
  12: { baseRent: 18000, rent1: 90000, rent2: 250000, rent3: 700000, rent4: 875000, hotel: 1050000, houseCost: 150000 },
  14: { baseRent: 22000, rent1: 110000, rent2: 330000, rent3: 800000, rent4: 975000, hotel: 1150000, houseCost: 150000 },
  16: { baseRent: 26000, rent1: 130000, rent2: 390000, rent3: 900000, rent4: 1100000, hotel: 1275000, houseCost: 200000 },
  18: { baseRent: 28000, rent1: 150000, rent2: 450000, rent3: 1000000, rent4: 1200000, hotel: 1400000, houseCost: 200000 },
  19: { baseRent: 30000, rent1: 160000, rent2: 470000, rent3: 1050000, rent4: 1250000, hotel: 1500000, houseCost: 200000 },
  21: { baseRent: 35000, rent1: 175000, rent2: 500000, rent3: 1100000, rent4: 1300000, hotel: 1500000, houseCost: 200000 },
  23: { baseRent: 38000, rent1: 185000, rent2: 550000, rent3: 1200000, rent4: 1400000, hotel: 1700000, houseCost: 200000 },
  24: { baseRent: 40000, rent1: 200000, rent2: 600000, rent3: 1400000, rent4: 1700000, hotel: 2000000, houseCost: 200000 },
  26: { baseRent: 44000, rent1: 220000, rent2: 660000, rent3: 1500000, rent4: 1850000, hotel: 2200000, houseCost: 250000 },
  27: { baseRent: 48000, rent1: 240000, rent2: 720000, rent3: 1600000, rent4: 2000000, hotel: 2400000, houseCost: 250000 },
  29: { baseRent: 50000, rent1: 260000, rent2: 780000, rent3: 1800000, rent4: 2200000, hotel: 2600000, houseCost: 250000 },
  31: { baseRent: 55000, rent1: 300000, rent2: 900000, rent3: 2000000, rent4: 2400000, hotel: 2800000, houseCost: 300000 },
  32: { baseRent: 58000, rent1: 320000, rent2: 960000, rent3: 2100000, rent4: 2550000, hotel: 3000000, houseCost: 300000 },
  34: { baseRent: 62000, rent1: 350000, rent2: 1050000, rent3: 2300000, rent4: 2800000, hotel: 3200000, houseCost: 300000 },
  37: { baseRent: 75000, rent1: 400000, rent2: 1200000, rent3: 2800000, rent4: 3400000, hotel: 4000000, houseCost: 400000 },
  39: { baseRent: 90000, rent1: 500000, rent2: 1500000, rent3: 3500000, rent4: 4500000, hotel: 5000000, houseCost: 400000 },
};

export { RENT_DATA };

interface Props {
  gameState: GameState;
  isMyTurn: boolean;
  myPlayer: Player | null;
  currentPlayer: Player;
}

export default function ActionPanel({ gameState, isMyTurn, myPlayer, currentPlayer }: Props) {
  const phase = gameState.phase;
  const tile = BOARD_TILES[currentPlayer?.position || 0];

  // Show full popup only for phases that need real decisions (NOT buying - that's in board center now)
  const showPopup = isMyTurn && ['in_jail', 'switch_position'].includes(phase);

  // Phases handled in board center (rolling, managing, paying_rent, buying)
  if (isMyTurn && ['rolling', 'managing', 'paying_rent', 'buying'].includes(phase)) {
    return null;
  }

  if (!showPopup) {
    return (
      <div className="action-status-bar">
        <div className="status-turn-info">
          {isMyTurn ? '🎲 دورك!' : `⏳ دور ${currentPlayer?.name || ''}`}
        </div>
        <div className="status-tile">📍 {tile?.name || ''}</div>
      </div>
    );
  }

  return (
    <div className="action-popup-overlay">
      <div className="action-popup">
        <div className="action-popup-header">
          <span className="action-popup-title">
            {phase === 'in_jail' && '🔒 في السجن'}
            {phase === 'switch_position' && '🔄 تبديل موقع'}
          </span>
          <span className="action-popup-tile">📍 {tile?.name}</span>
        </div>

        {/* Jail phase */}
        {phase === 'in_jail' && myPlayer && (
          <div className="action-group">
            <p className="action-text">🔒 انت في السجن! اختر:</p>
            <button className="action-btn pay-btn" onClick={() => socket.emit('jail_pay')}>
              💰 ادفع الكفالة (150K) واخرج
            </button>
            {myPlayer.getOutOfJailCards > 0 && (
              <button className="action-btn" onClick={() => socket.emit('jail_card')}>
                🎫 استخدم بطاقة خروج
              </button>
            )}
            <button className="action-btn secondary" onClick={() => socket.emit('jail_wait')}>
              🔒 ابقى بالسجن ({myPlayer.jailTurns}/3 أدوار)
            </button>
          </div>
        )}

        {/* Switch position */}
        {phase === 'switch_position' && (
          <div className="action-group">
            <p className="action-text">🔄 تبديل موقع (120K)</p>
            <p className="action-subtext">اختر لاعب للتبديل معه:</p>
            {gameState.players
              .filter(p => p.id !== myPlayer?.id && !p.bankrupt)
              .map(p => (
                <button
                  key={p.id}
                  className="action-btn"
                  onClick={() => socket.emit('switch_position_target', p.id)}
                >
                  بدّل مع {p.name} (📍 {BOARD_TILES[p.position]?.name})
                </button>
              ))}
            <button className="action-btn secondary" onClick={() => socket.emit('switch_position_skip')}>
              تخطي
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
