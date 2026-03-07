import { useState, useEffect, useRef } from 'react';
import { socket } from '../socket';
import type { Room, GameState, Player, ChatMessage, GameEvent } from '../App';
import { BOARD_TILES, GROUP_COLORS, PLAYER_PIECES, formatMoney } from '../gameData';
import WaitingRoom from './WaitingRoom';
import BoardTile from './BoardTile';
import PlayerPanel from './PlayerPanel';
import DiceDisplay from './DiceDisplay';
import ActionPanel, { RENT_DATA } from './ActionPanel';
import ChatPanel from './ChatPanel';
import TradePanel from './TradePanel';
import CardPopup from './CardPopup';
import EventBanner from './EventBanner';
import TileDetailPopup from './TileDetailPopup';
import QuickChat from './QuickChat';
import EventLog from './EventLog';
import BuildPanel from './BuildPanel';
import { SFX } from '../sounds';

interface Props {
  room: Room;
  gameState: GameState | null;
  playerId: string | null;
  chatMessages: ChatMessage[];
  events: GameEvent[];
  latestEvent: GameEvent | null;
  pauseCode?: string | null;
}

const PLAYER_COLORS = ['#e74c3c', '#3498db', '#2ecc71', '#f39c12', '#9b59b6', '#1abc9c', '#e67e22', '#e84393', '#00b894', '#fd79a8'];

export default function GameBoard({ room, gameState, playerId, chatMessages, events, latestEvent, pauseCode }: Props) {
  const [showChat, setShowChat] = useState(false);
  const [showTrade, setShowTrade] = useState(false);
  const [showMyCards, setShowMyCards] = useState(false);
  const [selectedTileId, setSelectedTileId] = useState<number | null>(null);
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [showBuild, setShowBuild] = useState(false);
  const [chatBubbles, setChatBubbles] = useState<Record<string, { text: string; id: number }>>({});
  const bubbleIdRef = useRef(0);

  // Step-by-step animation state
  const [animPositions, setAnimPositions] = useState<Record<string, number>>({});
  const prevPositionsRef = useRef<Record<string, number>>({});
  const animatingRef = useRef(false);

  const isHost = playerId === room.hostId;

  // Turn timer countdown
  const [turnTimeLeft, setTurnTimeLeft] = useState<number | null>(null);
  useEffect(() => {
    if (!gameState?.turnStartedAt || !gameState?.settings?.turnTimerSeconds) {
      setTurnTimeLeft(null);
      return;
    }
    const totalMs = gameState.settings.turnTimerSeconds * 1000;
    const update = () => {
      const elapsed = Date.now() - gameState.turnStartedAt!;
      const remaining = Math.max(0, Math.ceil((totalMs - elapsed) / 1000));
      setTurnTimeLeft(remaining);
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [gameState?.turnStartedAt, gameState?.settings?.turnTimerSeconds]);

  // Sound effects for events
  const prevPhaseRef = useRef<string>('');
  const prevEventRef = useRef<string>('');

  useEffect(() => {
    if (!gameState) return;
    const phase = gameState.phase;
    const prevPhase = prevPhaseRef.current;

    if (phase !== prevPhase) {
      if (phase === 'buying') SFX.click();
      if (phase === 'paying_rent') SFX.rent();
      if (phase === 'in_jail') SFX.jail();
      if (phase === 'card_drawn') SFX.card();
      if (phase === 'game_over') SFX.win();
      prevPhaseRef.current = phase;
    }

  }, [gameState?.phase]);

  useEffect(() => {
    if (!latestEvent) return;
    if (latestEvent.id === prevEventRef.current) return;
    prevEventRef.current = latestEvent.id;

    if (latestEvent.type === 'pass_go' || latestEvent.type === 'land_go') SFX.passGo();
    if (latestEvent.type === 'bankrupt') SFX.bankrupt();
    if (latestEvent.type === 'build') SFX.buildHouse();
    if (latestEvent.type === 'buy') SFX.buy();
    if (latestEvent.type === 'rent') SFX.rent();
    if (latestEvent.type === 'tax' || latestEvent.type === 'bank_tax') SFX.tax();
    if (latestEvent.type === 'collect_pot') SFX.passGo();
    if (latestEvent.type === 'switch') SFX.notification();
  }, [latestEvent]);

  // Chat bubble handler
  const showBubble = (pid: string, text: string) => {
    const id = ++bubbleIdRef.current;
    setChatBubbles(prev => ({ ...prev, [pid]: { text, id } }));
    setTimeout(() => {
      setChatBubbles(prev => {
        if (prev[pid]?.id === id) {
          const next = { ...prev };
          delete next[pid];
          return next;
        }
        return prev;
      });
    }, 4000);
  };

  // Chat message sound + show bubble
  const prevChatCountRef = useRef(0);
  useEffect(() => {
    if (chatMessages.length > prevChatCountRef.current && prevChatCountRef.current > 0) {
      SFX.chat();
      const lastMsg = chatMessages[chatMessages.length - 1];
      if (lastMsg) {
        showBubble(lastMsg.senderId, lastMsg.text);
      }
    }
    prevChatCountRef.current = chatMessages.length;
  }, [chatMessages.length]);

  // Step-by-step movement animation
  useEffect(() => {
    if (!gameState || animatingRef.current) return;

    const prevPositions = prevPositionsRef.current;
    const newPositions: Record<string, number> = {};
    for (const p of gameState.players) {
      newPositions[p.id] = p.position;
    }

    // Find players who moved
    const movedPlayers: { id: string; from: number; to: number }[] = [];
    for (const p of gameState.players) {
      const prev = prevPositions[p.id];
      if (prev !== undefined && prev !== p.position && !p.bankrupt) {
        movedPlayers.push({ id: p.id, from: prev, to: p.position });
      }
    }

    if (movedPlayers.length > 0) {
      animatingRef.current = true;
      // Animate first moved player (usually just one)
      const mp = movedPlayers[0];
      const steps: number[] = [];

      if (mp.to > mp.from) {
        for (let i = mp.from + 1; i <= mp.to; i++) steps.push(i);
      } else {
        // Wrapped around
        for (let i = mp.from + 1; i < 40; i++) steps.push(i);
        for (let i = 0; i <= mp.to; i++) steps.push(i);
      }

      // Start from previous position
      setAnimPositions(prev => ({ ...prev, [mp.id]: mp.from }));

      // Animate each step
      steps.forEach((stepPos, idx) => {
        setTimeout(() => {
          SFX.move();
          setAnimPositions(prev => ({ ...prev, [mp.id]: stepPos }));

          // On last step, clear animation
          if (idx === steps.length - 1) {
            setTimeout(() => {
              setAnimPositions(prev => {
                const next = { ...prev };
                delete next[mp.id];
                return next;
              });
              animatingRef.current = false;
            }, 150);
          }
        }, (idx + 1) * 120);
      });
    }

    prevPositionsRef.current = newPositions;
  }, [gameState?.players.map(p => `${p.id}:${p.position}`).join(',')]);

  if (!room.gameStarted || !gameState) {
    return <WaitingRoom room={room} playerId={playerId} isHost={isHost} />;
  }

  const currentPlayer = gameState.players[gameState.currentPlayerIndex];
  const myPlayer = gameState.players.find(p => p.id === playerId);
  const isMyTurn = currentPlayer?.id === playerId;

  const getPieceEmoji = (pieceId: string) =>
    PLAYER_PIECES.find(p => p.id === pieceId)?.emoji || '?';

  const getPlayerColor = (pid: string) => {
    const idx = gameState.players.findIndex(p => p.id === pid);
    return PLAYER_COLORS[idx >= 0 ? idx : 0];
  };

  // Build player positions map (use animation positions if animating)
  const playerPositions: Record<number, Player[]> = {};
  for (const p of gameState.players) {
    if (p.bankrupt) continue;
    const pos = animPositions[p.id] !== undefined ? animPositions[p.id] : p.position;
    if (!playerPositions[pos]) playerPositions[pos] = [];
    playerPositions[pos].push(p);
  }

  const tileOwners: Record<number, Player> = {};
  for (const p of gameState.players) {
    for (const tileId of p.properties) {
      tileOwners[tileId] = p;
    }
  }

  const pendingTrades = gameState.trades.filter(
    t => t.status === 'pending' && t.toPlayerId === playerId
  );

  const currentTileId = currentPlayer?.position;

  // Build bubble list with player positions
  const activeBubbles: { pid: string; name: string; text: string; position: number; pieceId: string }[] = [];
  for (const [pid, bubble] of Object.entries(chatBubbles)) {
    const player = gameState.players.find(p => p.id === pid);
    if (player && !player.bankrupt) {
      const pos = animPositions[pid] !== undefined ? animPositions[pid] : player.position;
      activeBubbles.push({ pid, name: player.name, text: bubble.text, position: pos, pieceId: player.pieceId });
    }
  }

  const renderTile = (id: number, side: string) => (
    <BoardTile
      key={id}
      tile={BOARD_TILES[id]}
      players={playerPositions[id]}
      owner={tileOwners[id]}
      ownerColor={tileOwners[id] ? getPlayerColor(tileOwners[id].id) : undefined}
      houses={tileOwners[id]?.houses[id] || 0}
      getPieceEmoji={getPieceEmoji}
      getPlayerColor={getPlayerColor}
      isHighlighted={id === currentTileId}
      middlePot={id === 20 ? gameState.middlePot : undefined}
      side={side}
      onClick={() => setSelectedTileId(id)}
    />
  );

  return (
    <div className="game-container">
      {/* Chat bubbles floating */}
      {activeBubbles.length > 0 && (
        <div className="chat-bubbles-overlay">
          {activeBubbles.map(b => (
            <div key={b.pid + '-' + chatBubbles[b.pid]?.id} className="floating-chat-bubble">
              <span className="bubble-piece" style={{ background: getPlayerColor(b.pid) }}>
                {getPieceEmoji(b.pieceId)}
              </span>
              <div className="bubble-body">
                <span className="bubble-name">{b.name}</span>
                <span className="bubble-text">{b.text}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {latestEvent && <EventBanner event={latestEvent} />}

      {gameState.currentCard && gameState.phase === 'card_drawn' && (
        <CardPopup deck={gameState.currentCard.deck} cardId={gameState.currentCard.cardId} isMyTurn={isMyTurn} />
      )}

      {/* Action popup (center of screen) */}
      <ActionPanel
        gameState={gameState}
        isMyTurn={isMyTurn}
        myPlayer={myPlayer || null}
        currentPlayer={currentPlayer}
      />

      <div className="game-layout">
        {/* Right: Player Panel */}
        <div className="side-panel right-panel">
          <PlayerPanel
            players={gameState.players}
            currentPlayerId={currentPlayer?.id}
            myPlayerId={playerId}
            middlePot={gameState.middlePot}
            playerColors={PLAYER_COLORS}
          />
        </div>

        {/* Center: Board */}
        <div className="board-wrapper">
          <div className="board">
            {/* 4 Corners */}
            <div className="board-corner corner-br">{renderTile(0, 'corner')}</div>
            <div className="board-corner corner-tr">{renderTile(10, 'corner')}</div>
            <div className="board-corner corner-tl">{renderTile(20, 'corner')}</div>
            <div className="board-corner corner-bl">{renderTile(30, 'corner')}</div>

            {/* RIGHT column: tiles 1-9 going UP */}
            <div className="board-col col-right">
              {[9, 8, 7, 6, 5, 4, 3, 2, 1].map(id => renderTile(id, 'right'))}
            </div>

            {/* TOP row: tiles 11-19 going LEFT */}
            <div className="board-row row-top">
              {[11, 12, 13, 14, 15, 16, 17, 18, 19].map(id => renderTile(id, 'top'))}
            </div>

            {/* LEFT column: tiles 21-29 going DOWN */}
            <div className="board-col col-left">
              {[21, 22, 23, 24, 25, 26, 27, 28, 29].map(id => renderTile(id, 'left'))}
            </div>

            {/* BOTTOM row: tiles 31-39 going RIGHT (31 near GoToJail, 39 near GO) */}
            <div className="board-row row-bottom">
              {[31, 32, 33, 34, 35, 36, 37, 38, 39].map(id => renderTile(id, 'bottom'))}
            </div>

            {/* Center area */}
            <div className="board-center">
              {/* Buy card inline - no overlay */}
              {isMyTurn && gameState.phase === 'buying' ? (() => {
                const buyTile = BOARD_TILES[currentPlayer?.position || 0];
                const groupColor = buyTile?.group ? GROUP_COLORS[buyTile.group] : undefined;
                const rentData = buyTile ? RENT_DATA[buyTile.id] : undefined;
                return (
                  <div className="center-buy-card">
                    <div className="center-buy-inner">
                      {groupColor && <div className="buy-card-color" style={{ background: groupColor }} />}
                      <div className="buy-card-name">{buyTile?.name}</div>
                      {buyTile?.nameEn && <div className="buy-card-name-en">{buyTile.nameEn}</div>}
                      {buyTile?.price && (
                        <div className="buy-card-price">💰 {formatMoney(buyTile.price)} د.ع</div>
                      )}
                      {rentData && (
                        <div className="buy-card-rents">
                          <div className="buy-rent-row"><span>بدون</span><span>{formatMoney(rentData.baseRent)}</span></div>
                          <div className="buy-rent-row"><span>🏠×1</span><span>{formatMoney(rentData.rent1)}</span></div>
                          <div className="buy-rent-row"><span>🏠×2</span><span>{formatMoney(rentData.rent2)}</span></div>
                          <div className="buy-rent-row"><span>🏠×3</span><span>{formatMoney(rentData.rent3)}</span></div>
                          <div className="buy-rent-row"><span>🏠×4</span><span>{formatMoney(rentData.rent4)}</span></div>
                          <div className="buy-rent-row"><span>🏨</span><span>{formatMoney(rentData.hotel)}</span></div>
                          <div className="buy-rent-row build-cost"><span>🏗️</span><span>{formatMoney(rentData.houseCost)}/بيت</span></div>
                        </div>
                      )}
                      {buyTile?.type === 'station' && (
                        <div className="buy-card-rents">
                          <div className="buy-rent-row"><span>1 محطة</span><span>50K</span></div>
                          <div className="buy-rent-row"><span>2 محطة</span><span>100K</span></div>
                          <div className="buy-rent-row"><span>3 محطات</span><span>150K</span></div>
                          <div className="buy-rent-row"><span>4 محطات</span><span>200K</span></div>
                        </div>
                      )}
                      {buyTile?.type === 'utility' && (
                        <div className="buy-card-rents">
                          <div className="buy-rent-row"><span>الإيجار</span><span>نرد × 100K</span></div>
                        </div>
                      )}
                    </div>
                    <div className="center-buy-buttons">
                      <button className="center-buy-yes" onClick={() => socket.emit('buy_property')}>✅ اشتري</button>
                      <button className="center-buy-no" onClick={() => socket.emit('skip_buy')}>❌ لا</button>
                    </div>
                  </div>
                );
              })() : (
                <>
                  <div className="center-logo">🏛️</div>
                  <div className="center-title">لعبة بغداد</div>
                  {turnTimeLeft !== null && gameState.phase !== 'game_over' && (
                    <div className={`turn-timer ${turnTimeLeft <= 10 ? 'turn-timer-urgent' : ''}`}>
                      ⏱️ {turnTimeLeft}s
                    </div>
                  )}
                  <DiceDisplay dice={gameState.dice} />
                  {isMyTurn && gameState.phase === 'rolling' && (
                    <button className="roll-center-btn" onClick={() => socket.emit('roll_dice')}>
                      🎲 ارمي النرد
                    </button>
                  )}
                  {isMyTurn && gameState.phase === 'paying_rent' && (
                    <div className="center-paying-rent">
                      <div className="paying-rent-spinner" />
                      <div className="paying-rent-text">💸 جاري دفع الإيجار...</div>
                    </div>
                  )}
                  {isMyTurn && gameState.phase === 'managing' && (() => {
                    const hasCompleteSets = myPlayer ? myPlayer.properties.some(id => {
                      const t = BOARD_TILES[id];
                      if (!t?.group || ['station', 'utility', 'special'].includes(t.group)) return false;
                      const groupTiles = BOARD_TILES.filter(bt => bt.group === t.group);
                      return groupTiles.every(gt => myPlayer.properties.includes(gt.id))
                        && groupTiles.some(gt => (myPlayer.houses[gt.id] || 0) < 5);
                    }) : false;
                    if (!hasCompleteSets) {
                      return (
                        <div className="center-paying-rent">
                          <div className="paying-rent-spinner" />
                          <div className="paying-rent-text">⏳ جاري انهاء الدور...</div>
                        </div>
                      );
                    }
                    return (
                      <div className="center-manage-btns">
                        <button className="roll-center-btn build-center" onClick={() => setShowBuild(true)}>
                          🏗️ بناء
                        </button>
                        <button className="roll-center-btn end-turn-center" onClick={() => socket.emit('end_turn')}>
                          ✅ انهاء الدور
                        </button>
                      </div>
                    );
                  })()}
                  {!isMyTurn && (
                    <div className="center-waiting">⏳ دور {currentPlayer?.name}</div>
                  )}
                  {gameState.middlePot > 0 && (
                    <div className="pot-display">
                      <div className="pot-icon">💰</div>
                      <div className="pot-amount">{formatMoney(gameState.middlePot)} د.ع</div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {/* Left: Inventory + Buttons */}
        <div className="side-panel left-panel">
          {myPlayer && (
            <div className="my-inventory">
              <div className="panel-header-bar clickable" onClick={() => setShowMyCards(!showMyCards)}>
                <span className="panel-header-icon">🎒</span>
                <span className="panel-header-text">ممتلكاتي</span>
                <span className="panel-header-count">{showMyCards ? '▲' : '▼'}</span>
              </div>
              {showMyCards && (
                <div className="inventory-panel">
                  <div className="inv-section">
                    <div className="inv-money">💰 {formatMoney(myPlayer.money)} د.ع</div>
                  </div>
                  {myPlayer.getOutOfJailCards > 0 && (
                    <div className="inv-section inv-cards">
                      <div className="inv-card-item">🎫 بطاقة خروج من السجن x{myPlayer.getOutOfJailCards}</div>
                    </div>
                  )}
                  {myPlayer.properties.length > 0 && (
                    <div className="inv-section">
                      <div className="inv-label">🏠 العقارات ({myPlayer.properties.length}):</div>
                      {myPlayer.properties.map(id => {
                        const t = BOARD_TILES[id];
                        const h = myPlayer.houses[id] || 0;
                        const canBuild = isMyTurn && gameState.phase === 'managing' && t?.group
                          && !['station', 'utility', 'special'].includes(t.group)
                          && BOARD_TILES.filter(bt => bt.group === t.group).every(gt => myPlayer.properties.includes(gt.id));
                        return (
                          <div key={id} className="inv-prop">
                            <span onClick={() => setSelectedTileId(id)} style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1, cursor: 'pointer' }}>
                              {t?.group && <span className="inv-dot" style={{ background: GROUP_COLORS[t.group] }} />}
                              <span className="inv-prop-name">{t?.name}</span>
                              {h > 0 && h < 5 && <span className="inv-houses">{'🏠'.repeat(h)}</span>}
                              {h === 5 && <span className="inv-houses">🏨</span>}
                            </span>
                            {canBuild && (
                              <span className="inv-build-btns">
                                <button className="small-btn build" onClick={() => socket.emit('build_house', id)} disabled={h >= 5}>+</button>
                                <button className="small-btn sell" onClick={() => socket.emit('sell_house', id)} disabled={h <= 0}>-</button>
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                  {myPlayer.properties.length === 0 && !myPlayer.getOutOfJailCards && (
                    <div className="inv-empty">لا تملك شيء بعد</div>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="panel-buttons">
            <button className="panel-btn chat-btn" onClick={() => setShowChat(!showChat)}>
              💬 محادثة
            </button>
            <button className="panel-btn trade-btn" onClick={() => setShowTrade(!showTrade)}>
              🤝 تبادل
            </button>
          </div>

          {/* Event Log */}
          <EventLog events={gameState.events || []} />

          {isHost && gameState.phase !== 'game_over' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <button className="panel-btn trade-btn" style={{ flex: 'none' }} onClick={() => socket.emit('pause_game')}>
                ⏸️ إيقاف مؤقت
              </button>
              <button className="panel-btn end-game-btn" onClick={() => setShowEndConfirm(true)}>
                🛑 إنهاء اللعبة
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Quick Chat */}
      <QuickChat onBubble={(text) => playerId && showBubble(playerId, text)} />

      {/* Tile Detail Popup */}
      {selectedTileId !== null && (
        <TileDetailPopup
          tile={BOARD_TILES[selectedTileId]}
          owner={tileOwners[selectedTileId]}
          ownerColor={tileOwners[selectedTileId] ? getPlayerColor(tileOwners[selectedTileId].id) : undefined}
          houses={tileOwners[selectedTileId]?.houses[selectedTileId] || 0}
          onClose={() => setSelectedTileId(null)}
        />
      )}

      {/* End Game Confirmation */}
      {showEndConfirm && (
        <div className="confirm-overlay" onClick={() => setShowEndConfirm(false)}>
          <div className="confirm-card" onClick={e => e.stopPropagation()}>
            <h3>🛑 إنهاء اللعبة؟</h3>
            <p>سيفوز اللاعب الأغنى. هل أنت متأكد؟</p>
            <div className="confirm-buttons">
              <button className="action-btn pay-btn" onClick={() => { socket.emit('end_game'); setShowEndConfirm(false); }}>
                نعم، أنهِ اللعبة
              </button>
              <button className="action-btn secondary" onClick={() => setShowEndConfirm(false)}>
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {showBuild && myPlayer && (
        <BuildPanel myPlayer={myPlayer} onClose={() => setShowBuild(false)} />
      )}
      {showChat && (
        <ChatPanel messages={chatMessages} players={gameState.players} myPlayerId={playerId} onClose={() => setShowChat(false)} />
      )}
      {showTrade && myPlayer && (
        <TradePanel myPlayer={myPlayer} players={gameState.players} pendingTrades={pendingTrades} onClose={() => setShowTrade(false)} />
      )}
      {pendingTrades.length > 0 && !showTrade && (
        <div className="trade-notification" onClick={() => setShowTrade(true)}>
          🔔 لديك {pendingTrades.length} عرض تبادل
        </div>
      )}
      {pauseCode && (
        <div className="game-over-overlay">
          <div className="confirm-card" style={{ maxWidth: 400 }}>
            <h3 style={{ color: 'var(--gold)', fontSize: 24 }}>⏸️ تم إيقاف اللعبة</h3>
            <p style={{ marginBottom: 12 }}>رمز الاستئناف:</p>
            <div style={{
              fontSize: 36, fontWeight: 900, letterSpacing: 8, fontFamily: 'monospace',
              background: 'rgba(251,191,36,0.1)', padding: '12px 24px', borderRadius: 12,
              border: '2px solid rgba(251,191,36,0.25)', marginBottom: 16, color: 'var(--gold)'
            }}>
              {pauseCode}
            </div>
            <p style={{ color: 'var(--text-dim)', fontSize: 13 }}>
              احفظ هذا الرمز! ستحتاجه لاستئناف اللعبة لاحقاً.
              <br />كل لاعب يدخل نفس اسمه السابق مع هذا الرمز.
            </p>
          </div>
        </div>
      )}
      {gameState.phase === 'game_over' && (() => {
        const winner = gameState.players.find(p => p.id === gameState.winner);
        const stats = gameState.gameStats;
        const players = gameState.players;

        // Fun stats calculations
        const mostRentPayer = stats ? players.reduce((best, p) => {
          const paid = stats.rentPaid[p.id] || 0;
          return paid > (stats.rentPaid[best.id] || 0) ? p : best;
        }, players[0]) : null;

        const mostRentReceiver = stats ? players.reduce((best, p) => {
          const received = stats.rentReceived[p.id] || 0;
          return received > (stats.rentReceived[best.id] || 0) ? p : best;
        }, players[0]) : null;

        const mostDoublesPlayer = stats ? players.reduce((best, p) => {
          const d = stats.doublesRolled[p.id] || 0;
          return d > (stats.doublesRolled[best.id] || 0) ? p : best;
        }, players[0]) : null;

        const mostJailedPlayer = stats ? players.reduce((best, p) => {
          const j = stats.timesInJail[p.id] || 0;
          return j > (stats.timesInJail[best.id] || 0) ? p : best;
        }, players[0]) : null;

        const biggestBuilder = stats ? players.reduce((best, p) => {
          const h = stats.moneySpentOnHouses[p.id] || 0;
          return h > (stats.moneySpentOnHouses[best.id] || 0) ? p : best;
        }, players[0]) : null;

        // Most landed-on tile
        let hotTileId = 0;
        let hotTileCount = 0;
        let coldTileId = 0;
        let coldTileCount = Infinity;
        if (stats) {
          const allLandings: Record<number, number> = {};
          for (const pLandings of Object.values(stats.tileLandings)) {
            for (const [tid, count] of Object.entries(pLandings)) {
              allLandings[Number(tid)] = (allLandings[Number(tid)] || 0) + count;
            }
          }
          for (const [tid, count] of Object.entries(allLandings)) {
            if (count > hotTileCount) { hotTileCount = count; hotTileId = Number(tid); }
            if (count < coldTileCount) { coldTileCount = count; coldTileId = Number(tid); }
          }
        }

        // Biggest single rent payment
        let biggestRentPair = '';
        let biggestRentAmount = 0;
        if (stats?.rentPaidTo) {
          for (const [payerId, receivers] of Object.entries(stats.rentPaidTo)) {
            for (const [receiverId, amount] of Object.entries(receivers)) {
              if (amount > biggestRentAmount) {
                biggestRentAmount = amount;
                const payer = players.find(p => p.id === payerId);
                const receiver = players.find(p => p.id === receiverId);
                biggestRentPair = `${payer?.name || '?'} ← ${receiver?.name || '?'}`;
              }
            }
          }
        }

        const hotTile = BOARD_TILES[hotTileId];
        const coldTile = BOARD_TILES[coldTileId];

        return (
          <div className="game-over-overlay">
            <div className="game-over-card">
              <div className="game-over-trophy">🏆</div>
              <h1 className="game-over-title">انتهت اللعبة!</h1>
              <h2 className="game-over-winner">🎉 {winner?.name || 'لا أحد'} 🎉</h2>
              <p className="game-over-subtitle">الف مبروك!</p>

              {stats && (
                <div className="fun-stats">
                  <h3 className="fun-stats-title">📊 احصائيات المباراة</h3>
                  <div className="fun-stats-grid">
                    {mostRentPayer && (stats.rentPaid[mostRentPayer.id] || 0) > 0 && (
                      <div className="fun-stat-card">
                        <div className="fun-stat-icon">💸</div>
                        <div className="fun-stat-label">اكثر دافع ايجار</div>
                        <div className="fun-stat-value">{mostRentPayer.name}</div>
                        <div className="fun-stat-detail">{formatMoney(stats.rentPaid[mostRentPayer.id] || 0)}</div>
                      </div>
                    )}
                    {mostRentReceiver && (stats.rentReceived[mostRentReceiver.id] || 0) > 0 && (
                      <div className="fun-stat-card">
                        <div className="fun-stat-icon">🤑</div>
                        <div className="fun-stat-label">اكثر جامع ايجار</div>
                        <div className="fun-stat-value">{mostRentReceiver.name}</div>
                        <div className="fun-stat-detail">{formatMoney(stats.rentReceived[mostRentReceiver.id] || 0)}</div>
                      </div>
                    )}
                    {mostDoublesPlayer && (stats.doublesRolled[mostDoublesPlayer.id] || 0) > 0 && (
                      <div className="fun-stat-card">
                        <div className="fun-stat-icon">🎲</div>
                        <div className="fun-stat-label">ملك الدوبل</div>
                        <div className="fun-stat-value">{mostDoublesPlayer.name}</div>
                        <div className="fun-stat-detail">{stats.doublesRolled[mostDoublesPlayer.id]} مرات</div>
                      </div>
                    )}
                    {mostJailedPlayer && (stats.timesInJail[mostJailedPlayer.id] || 0) > 0 && (
                      <div className="fun-stat-card">
                        <div className="fun-stat-icon">🔒</div>
                        <div className="fun-stat-label">اكثر واحد سجنوه</div>
                        <div className="fun-stat-value">{mostJailedPlayer.name}</div>
                        <div className="fun-stat-detail">{stats.timesInJail[mostJailedPlayer.id]} مرات</div>
                      </div>
                    )}
                    {biggestBuilder && (stats.moneySpentOnHouses[biggestBuilder.id] || 0) > 0 && (
                      <div className="fun-stat-card">
                        <div className="fun-stat-icon">🏗️</div>
                        <div className="fun-stat-label">اكبر معمّر</div>
                        <div className="fun-stat-value">{biggestBuilder.name}</div>
                        <div className="fun-stat-detail">{formatMoney(stats.moneySpentOnHouses[biggestBuilder.id] || 0)}</div>
                      </div>
                    )}
                    {hotTile && hotTileCount > 0 && (
                      <div className="fun-stat-card">
                        <div className="fun-stat-icon">🔥</div>
                        <div className="fun-stat-label">اكثر ارض وقفوا عليها</div>
                        <div className="fun-stat-value">{hotTile.name}</div>
                        <div className="fun-stat-detail">{hotTileCount} مرات</div>
                      </div>
                    )}
                    {coldTile && coldTileCount < Infinity && (
                      <div className="fun-stat-card">
                        <div className="fun-stat-icon">🧊</div>
                        <div className="fun-stat-label">اقل ارض وقفوا عليها</div>
                        <div className="fun-stat-value">{coldTile.name}</div>
                        <div className="fun-stat-detail">{coldTileCount} مرات</div>
                      </div>
                    )}
                    {biggestRentAmount > 0 && (
                      <div className="fun-stat-card">
                        <div className="fun-stat-icon">💰</div>
                        <div className="fun-stat-label">اكبر مبلغ ايجار بين لاعبين</div>
                        <div className="fun-stat-value">{biggestRentPair}</div>
                        <div className="fun-stat-detail">{formatMoney(biggestRentAmount)}</div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })()}
    </div>
  );
}
