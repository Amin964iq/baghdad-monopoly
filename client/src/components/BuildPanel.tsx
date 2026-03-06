import { socket } from '../socket';
import type { Player } from '../App';
import { BOARD_TILES, GROUP_COLORS, formatMoney } from '../gameData';

interface Props {
  myPlayer: Player;
  onClose: () => void;
}

const BUILDABLE_GROUPS = ['brown', 'cyan', 'pink', 'orange', 'red', 'yellow', 'green', 'blue'] as const;

const GROUP_NAMES: Record<string, string> = {
  brown: 'البنية',
  cyan: 'السماوية',
  pink: 'الوردية',
  orange: 'البرتقالية',
  red: 'الحمراء',
  yellow: 'الصفراء',
  green: 'الخضراء',
  blue: 'الزرقاء',
};

export default function BuildPanel({ myPlayer, onClose }: Props) {
  // Group properties by color
  const grouped: Record<string, { id: number; name: string; houses: number; isSet: boolean }[]> = {};

  for (const group of BUILDABLE_GROUPS) {
    const groupTiles = BOARD_TILES.filter(t => t.group === group);
    const owned = groupTiles.filter(t => myPlayer.properties.includes(t.id));
    if (owned.length === 0) continue;

    const isSet = groupTiles.every(t => myPlayer.properties.includes(t.id));

    grouped[group] = owned.map(t => ({
      id: t.id,
      name: t.name,
      houses: myPlayer.houses[t.id] || 0,
      isSet,
    }));
  }

  const groupKeys = Object.keys(grouped);

  return (
    <div className="build-overlay" onClick={onClose}>
      <div className="build-panel" onClick={e => e.stopPropagation()}>
        <div className="build-panel-header">
          <span>🏗️ بناء بيوت وفنادق</span>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        {groupKeys.length === 0 ? (
          <div className="build-empty">لا تملك عقارات بعد</div>
        ) : (
          <div className="build-groups">
            {groupKeys.map(group => {
              const props = grouped[group];
              const isSet = props[0].isSet;
              const color = GROUP_COLORS[group as keyof typeof GROUP_COLORS];

              return (
                <div key={group} className={`build-group ${isSet ? 'complete-set' : 'incomplete-set'}`}>
                  <div className="build-group-header">
                    <span className="build-group-dot" style={{ background: color }} />
                    <span className="build-group-name">{GROUP_NAMES[group] || group}</span>
                    {isSet ? (
                      <span className="build-set-badge">مجموعة كاملة ✓</span>
                    ) : (
                      <span className="build-set-missing">
                        {props.length}/{BOARD_TILES.filter(t => t.group === group).length}
                      </span>
                    )}
                  </div>
                  <div className="build-group-props">
                    {props.map(p => (
                      <div key={p.id} className="build-prop-row">
                        <div className="build-prop-info">
                          <span className="build-prop-name">{p.name}</span>
                          <span className="build-prop-houses">
                            {p.houses === 0 && 'بدون بناء'}
                            {p.houses > 0 && p.houses < 5 && '🏠'.repeat(p.houses)}
                            {p.houses === 5 && '🏨 فندق'}
                          </span>
                        </div>
                        {isSet && (
                          <div className="build-prop-actions">
                            <button
                              className="build-btn build-minus"
                              onClick={() => socket.emit('sell_house', p.id)}
                              disabled={p.houses <= 0}
                            >
                              −
                            </button>
                            <span className="build-count">{p.houses}</span>
                            <button
                              className="build-btn build-plus"
                              onClick={() => socket.emit('build_house', p.id)}
                              disabled={p.houses >= 5}
                            >
                              +
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
