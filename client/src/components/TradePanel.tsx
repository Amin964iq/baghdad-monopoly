import { useState } from 'react';
import { socket } from '../socket';
import type { Player, TradeOffer, TradeCondition } from '../App';
import { BOARD_TILES, formatMoney, GROUP_COLORS } from '../gameData';

interface Props {
  myPlayer: Player;
  players: Player[];
  pendingTrades: TradeOffer[];
  onClose: () => void;
}

function PropCard({ tileId, houses, selected, onClick }: { tileId: number; houses: number; selected?: boolean; onClick?: () => void }) {
  const t = BOARD_TILES[tileId];
  if (!t) return null;
  const color = t.group ? GROUP_COLORS[t.group] : '#888';
  const h = houses || 0;

  return (
    <button
      className={`trade-prop-card ${selected ? 'selected' : ''}`}
      onClick={onClick}
    >
      <span className="trade-prop-color" style={{ background: color }} />
      <span className="trade-prop-info">
        <span className="trade-prop-name">{t.name}</span>
        <span className="trade-prop-detail">
          {t.price ? `${formatMoney(t.price)} د.ع` : ''}
          {h > 0 && h < 5 ? ` | ${'🏠'.repeat(h)}` : ''}
          {h === 5 ? ' | 🏨' : ''}
        </span>
      </span>
    </button>
  );
}

function ConditionBadge({ cond }: { cond: TradeCondition }) {
  const tile = BOARD_TILES[cond.tileId];
  if (!tile) return null;
  return (
    <div className="trade-condition-badge">
      🛡️ {cond.beneficiary === 'from' ? 'انت' : 'هو'} معفى من الإيجار على <strong>{tile.name}</strong>
    </div>
  );
}

export default function TradePanel({ myPlayer, players, pendingTrades, onClose }: Props) {
  const [targetId, setTargetId] = useState('');
  const [offerMoney, setOfferMoney] = useState(0);
  const [requestMoney, setRequestMoney] = useState(0);
  const [offerProps, setOfferProps] = useState<number[]>([]);
  const [requestProps, setRequestProps] = useState<number[]>([]);
  const [conditions, setConditions] = useState<TradeCondition[]>([]);
  const [showConditions, setShowConditions] = useState(false);

  const target = players.find(p => p.id === targetId);
  const otherPlayers = players.filter(p => p.id !== myPlayer.id && !p.bankrupt);

  const toggleProp = (tileId: number, type: 'offer' | 'request') => {
    if (type === 'offer') {
      setOfferProps(prev => prev.includes(tileId) ? prev.filter(id => id !== tileId) : [...prev, tileId]);
    } else {
      setRequestProps(prev => prev.includes(tileId) ? prev.filter(id => id !== tileId) : [...prev, tileId]);
    }
  };

  const toggleImmunity = (tileId: number, beneficiary: 'from' | 'to') => {
    setConditions(prev => {
      const exists = prev.find(c => c.tileId === tileId && c.beneficiary === beneficiary);
      if (exists) {
        return prev.filter(c => !(c.tileId === tileId && c.beneficiary === beneficiary));
      }
      return [...prev, { type: 'rent_immunity', tileId, beneficiary }];
    });
  };

  const hasImmunity = (tileId: number, beneficiary: 'from' | 'to') => {
    return conditions.some(c => c.tileId === tileId && c.beneficiary === beneficiary);
  };

  const submitTrade = () => {
    if (!targetId) return;
    if (offerMoney === 0 && offerProps.length === 0 && requestMoney === 0 && requestProps.length === 0 && conditions.length === 0) return;
    socket.emit('propose_trade', {
      fromPlayerId: myPlayer.id,
      toPlayerId: targetId,
      offerProperties: offerProps,
      offerMoney,
      requestProperties: requestProps,
      requestMoney,
      offerJailCards: 0,
      requestJailCards: 0,
      conditions,
    });
    setOfferProps([]);
    setRequestProps([]);
    setOfferMoney(0);
    setRequestMoney(0);
    setConditions([]);
    setShowConditions(false);
  };

  return (
    <div className="chat-overlay">
      <div className="trade-panel">
        <div className="chat-header">
          <h3>🤝 التبادل</h3>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        {/* Pending incoming trades */}
        {pendingTrades.length > 0 && (
          <div className="pending-trades">
            <h4>📨 عروض واردة:</h4>
            {pendingTrades.map(trade => {
              const from = players.find(p => p.id === trade.fromPlayerId);
              return (
                <div key={trade.id} className="trade-offer-card">
                  <div className="trade-offer-header">
                    <strong>{from?.name}</strong> يعرض عليك:
                  </div>
                  <div className="trade-offer-body">
                    <div className="trade-offer-side">
                      <div className="trade-side-label offer-label">يعطيك</div>
                      {trade.offerMoney > 0 && <div className="trade-item money">💰 {formatMoney(trade.offerMoney)} د.ع</div>}
                      {trade.offerProperties.map(id => (
                        <PropCard key={id} tileId={id} houses={from?.houses[id] || 0} />
                      ))}
                      {trade.offerMoney === 0 && trade.offerProperties.length === 0 && <div className="trade-item dim">لا شيء</div>}
                    </div>
                    <div className="trade-offer-arrow">⇄</div>
                    <div className="trade-offer-side">
                      <div className="trade-side-label request-label">يطلب</div>
                      {trade.requestMoney > 0 && <div className="trade-item money">💰 {formatMoney(trade.requestMoney)} د.ع</div>}
                      {trade.requestProperties.map(id => (
                        <PropCard key={id} tileId={id} houses={myPlayer.houses[id] || 0} />
                      ))}
                      {trade.requestMoney === 0 && trade.requestProperties.length === 0 && <div className="trade-item dim">لا شيء</div>}
                    </div>
                  </div>
                  {/* Show conditions on incoming trade */}
                  {trade.conditions && trade.conditions.length > 0 && (
                    <div className="trade-conditions-display">
                      <div className="trade-conditions-label">📋 شروط الصفقة:</div>
                      {trade.conditions.map((cond, i) => {
                        const tile = BOARD_TILES[cond.tileId];
                        const whoGetsIt = cond.beneficiary === 'to' ? 'انت' : from?.name;
                        return (
                          <div key={i} className="trade-condition-badge">
                            🛡️ <strong>{whoGetsIt}</strong> معفى من الإيجار على <strong>{tile?.name}</strong>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  <div className="trade-buttons">
                    <button className="action-btn buy-btn" onClick={() => socket.emit('respond_trade', { tradeId: trade.id, accept: true })}>
                      قبول ✅
                    </button>
                    <button className="action-btn secondary" onClick={() => socket.emit('respond_trade', { tradeId: trade.id, accept: false })}>
                      رفض ❌
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Create new trade */}
        <div className="new-trade">
          <h4>📤 عرض جديد:</h4>
          <div className="trade-target-grid">
            {otherPlayers.map(p => (
              <button
                key={p.id}
                className={`trade-target-btn ${targetId === p.id ? 'selected' : ''}`}
                onClick={() => { setTargetId(p.id); setConditions([]); }}
              >
                <span>{p.name}</span>
                {p.isBot && <span className="trade-bot-tag">🤖</span>}
                <span className="trade-target-money">{formatMoney(p.money)}</span>
              </button>
            ))}
          </div>

          {targetId && (
            <>
              <div className="trade-columns">
                <div className="trade-section">
                  <h5 className="offer-label">🟢 تعرض:</h5>
                  <div className="trade-money">
                    <label>💰</label>
                    <input
                      type="number"
                      value={offerMoney}
                      onChange={e => setOfferMoney(Math.max(0, Number(e.target.value)))}
                      step={10000}
                      placeholder="0"
                    />
                  </div>
                  <div className="trade-props-list">
                    {myPlayer.properties.length > 0 ? myPlayer.properties.map(id => (
                      <PropCard
                        key={id}
                        tileId={id}
                        houses={myPlayer.houses[id] || 0}
                        selected={offerProps.includes(id)}
                        onClick={() => toggleProp(id, 'offer')}
                      />
                    )) : <div className="trade-no-props">لا تملك عقارات</div>}
                  </div>
                </div>

                <div className="trade-section">
                  <h5 className="request-label">🔴 تطلب:</h5>
                  <div className="trade-money">
                    <label>💰</label>
                    <input
                      type="number"
                      value={requestMoney}
                      onChange={e => setRequestMoney(Math.max(0, Number(e.target.value)))}
                      step={10000}
                      placeholder="0"
                    />
                  </div>
                  <div className="trade-props-list">
                    {target?.properties.length ? target.properties.map(id => (
                      <PropCard
                        key={id}
                        tileId={id}
                        houses={target.houses[id] || 0}
                        selected={requestProps.includes(id)}
                        onClick={() => toggleProp(id, 'request')}
                      />
                    )) : <div className="trade-no-props">لا يملك عقارات</div>}
                  </div>
                </div>
              </div>

              {/* Conditions section */}
              <div className="trade-conditions-section">
                <button
                  className={`trade-conditions-toggle ${showConditions ? 'active' : ''}`}
                  onClick={() => setShowConditions(!showConditions)}
                >
                  📋 شروط الصفقة {conditions.length > 0 && `(${conditions.length})`}
                </button>

                {showConditions && (
                  <div className="trade-conditions-panel">
                    <p className="trade-conditions-hint">اختر عقارات للإعفاء من الإيجار:</p>

                    {/* Properties I own - target can get immunity */}
                    {myPlayer.properties.length > 0 && (
                      <div className="trade-immunity-group">
                        <div className="trade-immunity-label">🛡️ {target?.name} معفى من إيجار:</div>
                        <div className="trade-immunity-list">
                          {myPlayer.properties.map(id => {
                            const t = BOARD_TILES[id];
                            if (!t) return null;
                            const color = t.group ? GROUP_COLORS[t.group] : '#888';
                            return (
                              <button
                                key={id}
                                className={`trade-immunity-btn ${hasImmunity(id, 'to') ? 'selected' : ''}`}
                                onClick={() => toggleImmunity(id, 'to')}
                              >
                                <span className="trade-prop-color" style={{ background: color }} />
                                {t.name}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Properties target owns - I can get immunity */}
                    {target && target.properties.length > 0 && (
                      <div className="trade-immunity-group">
                        <div className="trade-immunity-label">🛡️ انت معفى من إيجار:</div>
                        <div className="trade-immunity-list">
                          {target.properties.map(id => {
                            const t = BOARD_TILES[id];
                            if (!t) return null;
                            const color = t.group ? GROUP_COLORS[t.group] : '#888';
                            return (
                              <button
                                key={id}
                                className={`trade-immunity-btn ${hasImmunity(id, 'from') ? 'selected' : ''}`}
                                onClick={() => toggleImmunity(id, 'from')}
                              >
                                <span className="trade-prop-color" style={{ background: color }} />
                                {t.name}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Show active conditions */}
                {conditions.length > 0 && (
                  <div className="trade-conditions-summary">
                    {conditions.map((cond, i) => (
                      <ConditionBadge key={i} cond={cond} />
                    ))}
                  </div>
                )}
              </div>

              <button className="action-btn buy-btn trade-submit" onClick={submitTrade}>
                ارسل العرض 📤
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
