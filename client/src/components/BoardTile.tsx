import type { Player } from '../App';
import type { TileData, PropertyGroup } from '../gameData';
import { GROUP_COLORS, formatMoney } from '../gameData';

interface Props {
  tile: TileData;
  players?: Player[];
  owner?: Player;
  ownerColor?: string;
  houses: number;
  getPieceEmoji: (pieceId: string) => string;
  getPlayerColor: (playerId: string) => string;
  isHighlighted: boolean;
  middlePot?: number;
  side: string;
  onClick?: () => void;
  chatBubble?: { playerName: string; text: string };
}

const TILE_ICONS: Record<string, string> = {
  go: '🚀',
  tax: '💰',
  bank_tax: '🏦',
  lucky_chest: '📦',
  luck_card: '🔮',
  jail: '🔒',
  go_to_jail: '👮',
  collect_pot: '💎',
  switch_position: '🔄',
  station: '🚂',
  utility: '📡',
  special_property: '🏰',
  property: '🏘️',
};

export default function BoardTile({ tile, players, owner, ownerColor, houses, getPieceEmoji, getPlayerColor, isHighlighted, middlePot, side, onClick, chatBubble }: Props) {
  const groupColor = tile.group ? GROUP_COLORS[tile.group] : undefined;

  return (
    <div
      className={`tile tile-${tile.type} ${isHighlighted ? 'tile-highlighted' : ''} ${owner ? 'tile-owned' : ''}`}
      style={owner && ownerColor ? { boxShadow: `inset 0 0 0 2px ${ownerColor}` } as any : undefined}
      title={`${tile.name} - ${tile.nameEn}`}
      onClick={onClick}
    >
      {/* Color strip for properties */}
      {groupColor && <div className={`tile-color tile-color-${side}`} style={{ backgroundColor: groupColor }} />}

      {/* Tile content */}
      <div className="tile-content">
        <div className="tile-icon">{TILE_ICONS[tile.type] || ''}</div>
        <div className="tile-name">{tile.name}</div>
        {tile.price && (
          <div className="tile-price">{formatMoney(tile.price)}</div>
        )}
        {tile.type === 'collect_pot' && middlePot !== undefined && middlePot > 0 && (
          <div className="tile-pot">{formatMoney(middlePot)}</div>
        )}
      </div>

      {/* Houses display */}
      {houses > 0 && houses < 5 && (
        <div className={`tile-houses tile-houses-${side}`}>
          {Array.from({ length: houses }).map((_, i) => (
            <span key={i} className="house">🏠</span>
          ))}
        </div>
      )}
      {houses === 5 && (
        <div className={`tile-houses tile-houses-${side}`}>
          <span className="hotel">🏨</span>
        </div>
      )}

      {/* Owner indicator */}
      {owner && ownerColor && (
        <div className="tile-owner-flag" style={{ background: ownerColor }}>
          {getPieceEmoji(owner.pieceId)}
        </div>
      )}

      {/* Players on tile */}
      {players && players.length > 0 && (
        <div className="tile-players">
          {players.map(p => (
            <span key={p.id} className="tile-player" style={{ background: getPlayerColor(p.id) }} title={p.name}>
              {getPieceEmoji(p.pieceId)}
            </span>
          ))}
        </div>
      )}

      {/* Chat bubble */}
      {chatBubble && (
        <div className="chat-bubble-container">
          <div className="chat-bubble">
            <span className="chat-bubble-text">{chatBubble.text}</span>
          </div>
        </div>
      )}
    </div>
  );
}
