import { useState } from 'react';
import type { Player } from '../App';
import { PLAYER_PIECES, formatMoney, BOARD_TILES, GROUP_COLORS } from '../gameData';

interface Props {
  players: Player[];
  currentPlayerId?: string;
  myPlayerId: string | null;
  middlePot: number;
  playerColors: string[];
}

export default function PlayerPanel({ players, currentPlayerId, myPlayerId, middlePot, playerColors }: Props) {
  const [expandedPlayer, setExpandedPlayer] = useState<string | null>(null);

  const getPieceEmoji = (pieceId: string) =>
    PLAYER_PIECES.find(p => p.id === pieceId)?.emoji || '?';

  // Calculate total assets for ranking
  const getNetWorth = (p: Player) => {
    let worth = p.money;
    for (const id of p.properties) {
      const t = BOARD_TILES[id];
      if (t?.price) worth += t.price;
      const h = p.houses[id] || 0;
      if (h > 0) worth += h * 50000; // rough estimate
    }
    return worth;
  };

  return (
    <div className="player-panel">
      <div className="panel-header-bar">
        <span className="panel-header-icon">👥</span>
        <span className="panel-header-text">اللاعبين</span>
        <span className="panel-header-count">{players.filter(p => !p.bankrupt).length}/{players.length}</span>
      </div>
      <div className="players-scroll">
        {players.map((p, idx) => {
          const isActive = p.id === currentPlayerId;
          const isMe = p.id === myPlayerId;
          const expanded = expandedPlayer === p.id;
          const netWorth = getNetWorth(p);

          return (
            <div
              key={p.id}
              className={`player-card ${isActive ? 'active' : ''} ${p.bankrupt ? 'bankrupt' : ''} ${isMe ? 'me' : ''}`}
              onClick={() => setExpandedPlayer(expanded ? null : p.id)}
            >
              {/* Active glow bar */}
              {isActive && <div className="player-active-bar" style={{ background: playerColors[idx] }} />}

              <div className="player-card-header">
                <span className="player-card-piece">{getPieceEmoji(p.pieceId)}</span>
                <div className="player-card-info">
                  <span className="player-card-name">
                    {p.name}
                    {isMe && <span className="player-you-tag">أنت</span>}
                    {p.isBot && <span className="player-bot-tag">🤖</span>}
                  </span>
                  <span className={`player-card-money ${p.money < 0 ? 'negative' : ''}`}>
                    {p.bankrupt ? '💀 مفلس' : `${formatMoney(p.money)} د.ع`}
                  </span>
                </div>
                {isActive && <span className="player-turn-badge">🎲</span>}
                {p.inJail && <span className="player-jail-badge">🔒</span>}
              </div>

              {/* Stats row */}
              {!p.bankrupt && (
                <div className="player-stats-row">
                  {p.properties.length > 0 && (
                    <span className="player-stat">
                      <span className="stat-icon">🏠</span>
                      <span className="stat-val">{p.properties.length}</span>
                    </span>
                  )}
                  {p.getOutOfJailCards > 0 && (
                    <span className="player-stat">
                      <span className="stat-icon">🎫</span>
                      <span className="stat-val">{p.getOutOfJailCards}</span>
                    </span>
                  )}
                  <span className="player-stat player-stat-location">
                    📍 {BOARD_TILES[p.position]?.name || ''}
                  </span>
                </div>
              )}

              {/* Expanded: property list */}
              {expanded && !p.bankrupt && (
                <div className="player-card-details" onClick={e => e.stopPropagation()}>
                  {p.properties.length > 0 ? (
                    <div className="player-props-list">
                      {p.properties.map(id => {
                        const t = BOARD_TILES[id];
                        const h = p.houses[id] || 0;
                        return (
                          <div key={id} className="player-prop-item">
                            {t?.group && <span className="inv-dot" style={{ background: GROUP_COLORS[t.group] }} />}
                            <span className="inv-prop-name">{t?.name}</span>
                            {h > 0 && h < 5 && <span className="inv-houses">{'🏠'.repeat(h)}</span>}
                            {h === 5 && <span className="inv-houses">🏨</span>}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="player-no-props">لا يملك عقارات</div>
                  )}
                  <div className="player-net-worth">💎 القيمة الكلية: {formatMoney(netWorth)} د.ع</div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
