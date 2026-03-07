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

  // Also show stations, utilities, special properties for selling
  const otherProps = myPlayer.properties.filter(id => {
    const t = BOARD_TILES[id];
    return t && ['station', 'utility', 'special'].includes(t.group || '');
  });

  const groupKeys = Object.keys(grouped);

  return (
    <div className="build-overlay" onClick={onClose}>
      <div className="build-panel" onClick={e => e.stopPropagation()}>
        <div className="build-panel-header">
          <span>🏗️ إدارة العقارات</span>
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
                        <div className="build-prop-actions">
                          {isSet && (
                            <>
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
                            </>
                          )}
                          {p.houses === 0 && (
                            <button
                              className="build-btn sell-prop-btn"
                              onClick={() => {
                                const tile = BOARD_TILES[p.id];
                                const price = tile?.price ? Math.floor(tile.price / 2) : 0;
                                if (confirm(`بيع ${p.name} بـ ${formatMoney(price)} د.ع؟`)) {
                                  socket.emit('sell_property' as any, p.id);
                                }
                              }}
                              title="بيع العقار"
                            >
                              🏷️
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Other properties (stations, utilities, special) */}
        {otherProps.length > 0 && (
          <div className="build-groups" style={{ marginTop: 8 }}>
            <div className="build-group incomplete-set">
              <div className="build-group-header">
                <span className="build-group-dot" style={{ background: '#888' }} />
                <span className="build-group-name">محطات وخدمات</span>
              </div>
              <div className="build-group-props">
                {otherProps.map(id => {
                  const t = BOARD_TILES[id];
                  if (!t) return null;
                  return (
                    <div key={id} className="build-prop-row">
                      <div className="build-prop-info">
                        <span className="build-prop-name">{t.name}</span>
                        <span className="build-prop-houses">{t.type === 'station' ? '🚂' : t.type === 'utility' ? '📡' : '🏰'}</span>
                      </div>
                      <div className="build-prop-actions">
                        <button
                          className="build-btn sell-prop-btn"
                          onClick={() => {
                            const price = t.price ? Math.floor(t.price / 2) : 0;
                            if (confirm(`بيع ${t.name} بـ ${formatMoney(price)} د.ع؟`)) {
                              socket.emit('sell_property' as any, id);
                            }
                          }}
                          title="بيع العقار"
                        >
                          🏷️
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
