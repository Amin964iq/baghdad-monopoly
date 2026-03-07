import { useState } from 'react';
import { socket } from '../socket';
import type { Room } from '../App';
import { PLAYER_PIECES } from '../gameData';

interface Props {
  room: Room;
  playerId: string | null;
  isHost: boolean;
}

export default function WaitingRoom({ room, playerId, isHost }: Props) {
  const myPlayer = room.players.find(p => p.id === playerId);
  const allReady = room.players.filter(p => !p.isBot).every(p => p.ready || p.id === room.hostId);
  const [showSettings, setShowSettings] = useState(false);

  return (
    <div className="waiting-room">
      <div className="waiting-card">
        <h1 className="waiting-title">🏛️ {room.name}</h1>
        <div className="room-code">
          <span className="code-label">كود الغرفة:</span>
          <span className="code-value">{room.id}</span>
        </div>

        <div className="players-list">
          <h3>اللاعبين ({room.players.length}/{room.maxPlayers})</h3>
          {room.players.map(p => (
            <div key={p.id} className={`player-row ${p.id === playerId ? 'me' : ''}`}>
              <span className="player-piece">
                {PLAYER_PIECES.find(pp => pp.id === p.pieceId)?.emoji || '?'}
              </span>
              <span className="player-name">
                {p.name}
                {p.id === room.hostId && ' 👑'}
                {p.isBot && ' 🤖'}
              </span>
              <span className={`player-ready ${p.ready || p.isBot ? 'ready' : ''}`}>
                {p.ready || p.isBot ? 'جاهز ✓' : 'غير جاهز'}
              </span>
              {isHost && p.isBot && (
                <button className="remove-bot-btn" onClick={() => socket.emit('remove_bot', p.id)}>
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Piece selection */}
        {myPlayer && (
          <div className="piece-selection">
            <h3>اختر قطعتك:</h3>
            <div className="piece-grid">
              {PLAYER_PIECES.map(piece => {
                const taken = room.players.some(p => p.pieceId === piece.id && p.id !== playerId);
                return (
                  <button
                    key={piece.id}
                    className={`piece-btn ${myPlayer.pieceId === piece.id ? 'selected' : ''} ${taken ? 'taken' : ''}`}
                    onClick={() => !taken && socket.emit('select_piece', piece.id)}
                    disabled={taken}
                    title={piece.name}
                  >
                    {piece.emoji}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Game Settings (host only) */}
        {isHost && (
          <div className="game-settings-section">
            <button
              className="lobby-btn secondary"
              onClick={() => setShowSettings(!showSettings)}
              style={{ marginBottom: showSettings ? 12 : 0 }}
            >
              ⚙️ اعدادات اللعبة {showSettings ? '▲' : '▼'}
            </button>

            {showSettings && (
              <div className="game-settings-grid">
                <div className="setting-row">
                  <label>💰 رصيد البداية</label>
                  <select
                    value={room.settings?.startingMoney || 2000000}
                    onChange={e => socket.emit('update_settings' as any, { startingMoney: Number(e.target.value) })}
                  >
                    <option value={1000000}>1,000,000</option>
                    <option value={1500000}>1,500,000</option>
                    <option value={2000000}>2,000,000</option>
                    <option value={3000000}>3,000,000</option>
                    <option value={5000000}>5,000,000</option>
                  </select>
                </div>
                <div className="setting-row">
                  <label>⏱️ وقت الدور (ثانية)</label>
                  <select
                    value={room.settings?.turnTimerSeconds || 60}
                    onChange={e => socket.emit('update_settings' as any, { turnTimerSeconds: Number(e.target.value) })}
                  >
                    <option value={30}>30</option>
                    <option value={45}>45</option>
                    <option value={60}>60</option>
                    <option value={90}>90</option>
                    <option value={120}>120</option>
                    <option value={180}>180</option>
                  </select>
                </div>
                <div className="setting-row">
                  <label>📉 حد الإفلاس</label>
                  <select
                    value={room.settings?.bankruptThreshold ?? -500000}
                    onChange={e => socket.emit('update_settings' as any, { bankruptThreshold: Number(e.target.value) })}
                  >
                    <option value={0}>0 (فوري)</option>
                    <option value={-100000}>-100,000</option>
                    <option value={-250000}>-250,000</option>
                    <option value={-500000}>-500,000</option>
                    <option value={-1000000}>-1,000,000</option>
                    <option value={-2000000}>-2,000,000</option>
                  </select>
                </div>
                <div className="setting-row">
                  <label>🤖 مستوى الروبوتات</label>
                  <select
                    value={room.settings?.botDifficulty || 'normal'}
                    onChange={e => socket.emit('update_settings' as any, { botDifficulty: e.target.value })}
                  >
                    <option value="easy">سهل</option>
                    <option value="normal">عادي</option>
                    <option value="smart">ذكي</option>
                  </select>
                </div>
                <div className="setting-row">
                  <label>👥 اقصى عدد لاعبين</label>
                  <select
                    value={room.settings?.maxPlayers || 10}
                    onChange={e => socket.emit('update_settings' as any, { maxPlayers: Number(e.target.value) })}
                  >
                    <option value={2}>2</option>
                    <option value={3}>3</option>
                    <option value={4}>4</option>
                    <option value={5}>5</option>
                    <option value={6}>6</option>
                    <option value={8}>8</option>
                    <option value={10}>10</option>
                  </select>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="waiting-actions">
          {!isHost && myPlayer && (
            <button
              className="lobby-btn primary"
              onClick={() => socket.emit('toggle_ready')}
            >
              {myPlayer.ready ? 'الغاء الجاهزية' : 'جاهز!'}
            </button>
          )}

          {isHost && (
            <>
              <button
                className="lobby-btn primary"
                onClick={() => socket.emit('start_game')}
                disabled={room.players.length < 2 || !allReady}
              >
                ابدأ اللعبة!
              </button>
              <button
                className="lobby-btn secondary"
                onClick={() => socket.emit('add_bot')}
                disabled={room.players.length >= room.maxPlayers}
              >
                🤖 اضافة روبوت
              </button>
            </>
          )}

          <button className="lobby-btn danger" onClick={() => socket.emit('leave_room')}>
            خروج
          </button>
        </div>
      </div>
    </div>
  );
}
