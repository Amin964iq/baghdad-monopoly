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
