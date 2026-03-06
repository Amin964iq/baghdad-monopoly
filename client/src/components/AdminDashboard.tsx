import { useState, useEffect, useCallback } from 'react';

const API_BASE = import.meta.env.PROD ? '/api/admin' : 'http://localhost:3001/api/admin';

interface AdminState {
  token: string | null;
  needsSetup: boolean;
  config: any;
  games: any[];
  analytics: any;
  activeTab: string;
}

export default function AdminDashboard() {
  const [state, setState] = useState<AdminState>({
    token: localStorage.getItem('admin_token'),
    needsSetup: false,
    config: null,
    games: [],
    analytics: null,
    activeTab: 'settings',
  });
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const api = useCallback(async (path: string, options?: RequestInit) => {
    const res = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(state.token ? { Authorization: `Bearer ${state.token}` } : {}),
        ...options?.headers,
      },
    });
    if (res.status === 401) {
      localStorage.removeItem('admin_token');
      setState(s => ({ ...s, token: null }));
      throw new Error('Session expired');
    }
    return res.json();
  }, [state.token]);

  // Check status on mount
  useEffect(() => {
    api('/status').then(data => {
      setState(s => ({ ...s, needsSetup: data.needsSetup }));
    }).catch(() => {});
  }, []);

  // Load data when authenticated
  useEffect(() => {
    if (!state.token) return;
    Promise.all([
      api('/config').then(config => setState(s => ({ ...s, config }))),
      api('/games').then(games => setState(s => ({ ...s, games }))),
      api('/analytics').then(analytics => setState(s => ({ ...s, analytics }))),
    ]).catch(() => {});
  }, [state.token, api]);

  const handleSetup = async () => {
    try {
      await api('/setup', {
        method: 'POST',
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
      });
      setSuccess('Admin account created! Now login.');
      setState(s => ({ ...s, needsSetup: false }));
    } catch (e: any) {
      setError(e.message);
    }
  };

  const handleLogin = async () => {
    try {
      setError('');
      const data = await api('/login', {
        method: 'POST',
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
      });
      if (data.token) {
        localStorage.setItem('admin_token', data.token);
        setState(s => ({ ...s, token: data.token }));
        setSuccess('Logged in!');
      } else {
        setError(data.error || 'Login failed');
      }
    } catch (e: any) {
      setError(e.message || 'Login failed');
    }
  };

  const updateConfig = async (section: string, data: any) => {
    try {
      const result = await api(`/config/${section}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
      if (result.success) {
        // Reload config
        const config = await api('/config');
        setState(s => ({ ...s, config }));
        setSuccess('Saved!');
        setTimeout(() => setSuccess(''), 2000);
      }
    } catch (e: any) {
      setError(e.message);
    }
  };

  const updateTile = async (tileId: number, data: any) => {
    try {
      await api(`/config/tiles/${tileId}`, { method: 'PUT', body: JSON.stringify(data) });
      const config = await api('/config');
      setState(s => ({ ...s, config }));
      setSuccess('Tile updated!');
      setTimeout(() => setSuccess(''), 2000);
    } catch (e: any) {
      setError(e.message);
    }
  };

  const updateCard = async (deck: string, cardId: number, data: any) => {
    try {
      await api(`/config/cards/${deck}/${cardId}`, { method: 'PUT', body: JSON.stringify(data) });
      const config = await api('/config');
      setState(s => ({ ...s, config }));
      setSuccess('Card updated!');
      setTimeout(() => setSuccess(''), 2000);
    } catch (e: any) {
      setError(e.message);
    }
  };

  const refreshGames = async () => {
    const games = await api('/games');
    setState(s => ({ ...s, games }));
  };

  // === LOGIN / SETUP SCREEN ===
  if (!state.token) {
    return (
      <div className="admin-login">
        <div className="admin-login-card">
          <h1>🔐 لوحة التحكم</h1>
          <h2>Baghdad Monopoly Admin</h2>
          {error && <div className="admin-error">{error}</div>}
          {success && <div className="admin-success">{success}</div>}
          <input
            placeholder="البريد الإلكتروني"
            type="email"
            value={loginEmail}
            onChange={e => setLoginEmail(e.target.value)}
            className="admin-input"
          />
          <input
            placeholder="كلمة المرور"
            type="password"
            value={loginPassword}
            onChange={e => setLoginPassword(e.target.value)}
            className="admin-input"
            onKeyDown={e => e.key === 'Enter' && (state.needsSetup ? handleSetup() : handleLogin())}
          />
          <button
            className="admin-btn primary"
            onClick={state.needsSetup ? handleSetup : handleLogin}
          >
            {state.needsSetup ? 'انشاء حساب المدير' : 'تسجيل الدخول'}
          </button>
        </div>
      </div>
    );
  }

  if (!state.config) {
    return <div className="admin-loading">جاري التحميل...</div>;
  }

  const { config } = state;

  // === ADMIN DASHBOARD ===
  return (
    <div className="admin-dashboard">
      {/* Sidebar */}
      <div className="admin-sidebar">
        <h2>🏛️ لوحة التحكم</h2>
        {[
          { key: 'settings', label: '⚙️ اعدادات اللعبة', },
          { key: 'tiles', label: '🗺️ محرر اللوحة' },
          { key: 'cards', label: '🃏 محرر البطاقات' },
          { key: 'economy', label: '💰 الاقتصاد' },
          { key: 'bots', label: '🤖 الروبوتات' },
          { key: 'games', label: '🎮 المباريات' },
          { key: 'pot', label: '🏦 الصندوق' },
          { key: 'sounds', label: '🔊 الاصوات' },
          { key: 'flavor', label: '🇮🇶 النكهة العراقية' },
          { key: 'analytics', label: '📊 الاحصائيات' },
        ].map(tab => (
          <button
            key={tab.key}
            className={`admin-tab ${state.activeTab === tab.key ? 'active' : ''}`}
            onClick={() => setState(s => ({ ...s, activeTab: tab.key }))}
          >
            {tab.label}
          </button>
        ))}
        <button className="admin-tab logout" onClick={() => {
          localStorage.removeItem('admin_token');
          setState(s => ({ ...s, token: null }));
        }}>
          🚪 تسجيل الخروج
        </button>
      </div>

      {/* Main Content */}
      <div className="admin-content">
        {error && <div className="admin-error">{error}</div>}
        {success && <div className="admin-success">{success}</div>}

        {/* 1. Game Settings */}
        {state.activeTab === 'settings' && (
          <div className="admin-section">
            <h2>⚙️ اعدادات اللعبة</h2>
            <div className="admin-grid">
              <SettingField label="المال الابتدائي" value={config.gameSettings.startingMoney} type="number"
                onChange={v => updateConfig('game-settings', { startingMoney: Number(v) })} />
              <SettingField label="مكافأة عبور الانطلاق" value={config.gameSettings.goPassReward} type="number"
                onChange={v => updateConfig('game-settings', { goPassReward: Number(v) })} />
              <SettingField label="مكافأة الوقوف على الانطلاق" value={config.gameSettings.goLandReward} type="number"
                onChange={v => updateConfig('game-settings', { goLandReward: Number(v) })} />
              <SettingField label="أدوار السجن" value={config.gameSettings.jailMaxTurns} type="number"
                onChange={v => updateConfig('game-settings', { jailMaxTurns: Number(v) })} />
              <SettingField label="غرامة السجن" value={config.gameSettings.jailFine} type="number"
                onChange={v => updateConfig('game-settings', { jailFine: Number(v) })} />
              <SettingField label="مؤقت الدور (ثواني)" value={config.gameSettings.turnTimerSeconds} type="number"
                onChange={v => updateConfig('game-settings', { turnTimerSeconds: Number(v) })} />
              <SettingField label="أقل عدد لاعبين" value={config.gameSettings.minPlayers} type="number"
                onChange={v => updateConfig('game-settings', { minPlayers: Number(v) })} />
              <SettingField label="أكثر عدد لاعبين" value={config.gameSettings.maxPlayers} type="number"
                onChange={v => updateConfig('game-settings', { maxPlayers: Number(v) })} />
            </div>
          </div>
        )}

        {/* 2. Board Editor */}
        {state.activeTab === 'tiles' && (
          <div className="admin-section">
            <h2>🗺️ محرر اللوحة</h2>
            <div className="tiles-grid">
              {config.boardTiles.map((tile: any) => (
                <TileEditor key={tile.id} tile={tile} onSave={(data: any) => updateTile(tile.id, data)} />
              ))}
            </div>
          </div>
        )}

        {/* 3. Card Editor */}
        {state.activeTab === 'cards' && (
          <div className="admin-section">
            <h2>🃏 محرر البطاقات</h2>
            <h3>📦 صندوق اللعبة</h3>
            {config.luckyChestCards.map((card: any) => (
              <CardEditor key={card.id} card={card} onSave={(data: any) => updateCard('lucky_chest', card.id, data)} />
            ))}
            <h3 style={{ marginTop: 20 }}>❓ حظك</h3>
            {config.luckCards.map((card: any) => (
              <CardEditor key={card.id} card={card} onSave={(data: any) => updateCard('luck_card', card.id, data)} />
            ))}
          </div>
        )}

        {/* 4. Economy */}
        {state.activeTab === 'economy' && (
          <div className="admin-section">
            <h2>💰 موازنة الاقتصاد</h2>
            <div className="admin-grid">
              <SettingField label="مضاعف الإيجار" value={config.economy.rentMultiplier} type="number" step="0.1"
                onChange={v => updateConfig('economy', { rentMultiplier: Number(v) })} />
              <SettingField label="مضاعف تكلفة البيت" value={config.economy.houseCostMultiplier} type="number" step="0.1"
                onChange={v => updateConfig('economy', { houseCostMultiplier: Number(v) })} />
              <SettingField label="مضاعف تكلفة الفندق" value={config.economy.hotelCostMultiplier} type="number" step="0.1"
                onChange={v => updateConfig('economy', { hotelCostMultiplier: Number(v) })} />
              <SettingField label="مضاعف خدمة الانترنت" value={config.economy.utilityMultiplier} type="number"
                onChange={v => updateConfig('economy', { utilityMultiplier: Number(v) })} />
            </div>
          </div>
        )}

        {/* 5. Bots */}
        {state.activeTab === 'bots' && (
          <div className="admin-section">
            <h2>🤖 اعدادات الروبوتات</h2>
            <div className="admin-grid">
              <SettingToggle label="تفعيل الروبوتات" value={config.botSettings.enabled}
                onChange={v => updateConfig('bots', { enabled: v })} />
              <SettingSelect label="الصعوبة الافتراضية" value={config.botSettings.defaultDifficulty}
                options={[{ value: 'easy', label: 'سهل' }, { value: 'normal', label: 'عادي' }, { value: 'smart', label: 'ذكي' }]}
                onChange={v => updateConfig('bots', { defaultDifficulty: v })} />
              <SettingField label="احتمال شراء (سهل)" value={config.botSettings.easyBuyProbability} type="number" step="0.1"
                onChange={v => updateConfig('bots', { easyBuyProbability: Number(v) })} />
              <SettingField label="احتمال شراء (عادي)" value={config.botSettings.normalBuyProbability} type="number" step="0.1"
                onChange={v => updateConfig('bots', { normalBuyProbability: Number(v) })} />
              <SettingField label="احتمال شراء (ذكي)" value={config.botSettings.smartBuyProbability} type="number" step="0.1"
                onChange={v => updateConfig('bots', { smartBuyProbability: Number(v) })} />
            </div>
          </div>
        )}

        {/* 6. Live Games */}
        {state.activeTab === 'games' && (
          <div className="admin-section">
            <h2>🎮 المباريات النشطة</h2>
            <button className="admin-btn secondary" onClick={refreshGames}>🔄 تحديث</button>
            {state.games.length === 0 ? (
              <p className="admin-empty">لا توجد مباريات نشطة</p>
            ) : (
              state.games.map((game: any) => (
                <div key={game.id} className="admin-game-card">
                  <h4>غرفة: {game.id}</h4>
                  <p>المرحلة: {game.phase} | الصندوق: {game.middlePot?.toLocaleString()} | المدة: {game.duration} دقيقة</p>
                  <div className="admin-game-players">
                    {game.players?.map((p: any, i: number) => (
                      <span key={i} className={`admin-player-tag ${p.bankrupt ? 'bankrupt' : ''}`}>
                        {p.isBot ? '🤖' : '👤'} {p.name} ({p.money?.toLocaleString()})
                      </span>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* 7. Pot System */}
        {state.activeTab === 'pot' && (
          <div className="admin-section">
            <h2>🏦 نظام الصندوق</h2>
            <div className="admin-grid">
              <SettingField label="مبلغ الضريبة" value={config.potSettings.taxAmount} type="number"
                onChange={v => updateConfig('pot', { taxAmount: Number(v) })} />
              <SettingField label="ضريبة البنك" value={config.potSettings.bankTaxAmount} type="number"
                onChange={v => updateConfig('pot', { bankTaxAmount: Number(v) })} />
              <SettingField label="تكلفة تبديل الموقع" value={config.potSettings.switchPositionCost} type="number"
                onChange={v => updateConfig('pot', { switchPositionCost: Number(v) })} />
            </div>
          </div>
        )}

        {/* 8. Sounds */}
        {state.activeTab === 'sounds' && (
          <div className="admin-section">
            <h2>🔊 اعدادات الاصوات</h2>
            <div className="admin-grid">
              <SettingToggle label="صوت النرد" value={config.soundSettings.diceSound}
                onChange={v => updateConfig('sounds', { diceSound: v })} />
              <SettingToggle label="صوت الإيجار" value={config.soundSettings.rentSound}
                onChange={v => updateConfig('sounds', { rentSound: v })} />
              <SettingToggle label="صوت الفوز" value={config.soundSettings.winSound}
                onChange={v => updateConfig('sounds', { winSound: v })} />
              <SettingToggle label="صوت الشراء" value={config.soundSettings.buySound}
                onChange={v => updateConfig('sounds', { buySound: v })} />
              <SettingToggle label="صوت السجن" value={config.soundSettings.jailSound}
                onChange={v => updateConfig('sounds', { jailSound: v })} />
            </div>
          </div>
        )}

        {/* 9. Iraqi Flavor */}
        {state.activeTab === 'flavor' && (
          <div className="admin-section">
            <h2>🇮🇶 النكهة العراقية</h2>
            <div className="admin-grid">
              <SettingToggle label="المؤثرات الصوتية العراقية" value={config.iraqiFlavor.iraqiSoundEffects}
                onChange={v => updateConfig('flavor', { iraqiSoundEffects: v })} />
              <SettingToggle label="الرسائل العراقية" value={config.iraqiFlavor.iraqiMessages}
                onChange={v => updateConfig('flavor', { iraqiMessages: v })} />
              <SettingToggle label="ردود الفعل المضحكة" value={config.iraqiFlavor.funnyReactions}
                onChange={v => updateConfig('flavor', { funnyReactions: v })} />
            </div>
          </div>
        )}

        {/* 10. Analytics */}
        {state.activeTab === 'analytics' && (
          <div className="admin-section">
            <h2>📊 الاحصائيات</h2>
            {state.analytics ? (
              <div className="admin-grid">
                <div className="admin-stat-card">
                  <div className="stat-value">{state.analytics.totalGamesPlayed}</div>
                  <div className="stat-label">مباريات</div>
                </div>
                <div className="admin-stat-card">
                  <div className="stat-value">{state.analytics.totalPlayersJoined}</div>
                  <div className="stat-label">لاعبين</div>
                </div>
                <div className="admin-stat-card">
                  <div className="stat-value">{state.analytics.averageGameLengthMinutes}م</div>
                  <div className="stat-label">متوسط المدة</div>
                </div>
              </div>
            ) : (
              <p className="admin-empty">لا توجد بيانات بعد</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ===== Reusable Components =====

function SettingField({ label, value, type, step, onChange }: {
  label: string; value: any; type: string; step?: string;
  onChange: (value: string) => void;
}) {
  const [localValue, setLocalValue] = useState(value);
  useEffect(() => { setLocalValue(value); }, [value]);

  return (
    <div className="admin-field">
      <label>{label}</label>
      <div className="admin-field-input">
        <input
          type={type}
          value={localValue}
          step={step}
          onChange={e => setLocalValue(e.target.value)}
          className="admin-input"
        />
        <button className="admin-btn small" onClick={() => onChange(localValue)}>حفظ</button>
      </div>
    </div>
  );
}

function SettingToggle({ label, value, onChange }: {
  label: string; value: boolean; onChange: (value: boolean) => void;
}) {
  return (
    <div className="admin-field">
      <label>{label}</label>
      <button
        className={`admin-toggle ${value ? 'on' : 'off'}`}
        onClick={() => onChange(!value)}
      >
        {value ? 'مفعل ✓' : 'معطل ✕'}
      </button>
    </div>
  );
}

function SettingSelect({ label, value, options, onChange }: {
  label: string; value: string; options: { value: string; label: string }[];
  onChange: (value: string) => void;
}) {
  return (
    <div className="admin-field">
      <label>{label}</label>
      <select value={value} onChange={e => onChange(e.target.value)} className="admin-input">
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

function TileEditor({ tile, onSave }: { tile: any; onSave: (data: any) => void }) {
  const [expanded, setExpanded] = useState(false);
  const [data, setData] = useState(tile);

  const isProperty = ['property', 'station', 'utility', 'special_property'].includes(tile.type);

  const groupColors: Record<string, string> = {
    brown: '#8B4513', cyan: '#00CED1', pink: '#FF69B4', orange: '#FF8C00',
    red: '#DC143C', yellow: '#FFD700', green: '#228B22', blue: '#1a1a8a',
    station: '#555', utility: '#808080', special: '#800080',
  };

  return (
    <div className={`tile-editor ${!data.enabled ? 'disabled' : ''}`}>
      <div className="tile-editor-header" onClick={() => setExpanded(!expanded)}>
        {data.group && <span className="tile-color-dot" style={{ background: groupColors[data.group] || '#ccc' }} />}
        <span className="tile-editor-id">#{data.id}</span>
        <span className="tile-editor-name">{data.name}</span>
        <span className="tile-editor-type">{data.type}</span>
        {data.price && <span className="tile-editor-price">{data.price.toLocaleString()}</span>}
        <span className="tile-editor-arrow">{expanded ? '▲' : '▼'}</span>
      </div>
      {expanded && (
        <div className="tile-editor-body">
          <div className="admin-field-row">
            <label>الاسم:</label>
            <input value={data.name} onChange={e => setData({ ...data, name: e.target.value })} className="admin-input" />
          </div>
          <div className="admin-field-row">
            <label>English:</label>
            <input value={data.nameEn} onChange={e => setData({ ...data, nameEn: e.target.value })} className="admin-input" />
          </div>
          <div className="admin-field-row">
            <label>النوع:</label>
            <select value={data.type} onChange={e => setData({ ...data, type: e.target.value })} className="admin-input">
              {['property', 'station', 'utility', 'special_property', 'tax', 'bank_tax', 'lucky_chest', 'luck_card', 'jail', 'go_to_jail', 'go', 'collect_pot', 'switch_position'].map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          {isProperty && (
            <>
              <div className="admin-field-row">
                <label>المجموعة:</label>
                <select value={data.group || ''} onChange={e => setData({ ...data, group: e.target.value })} className="admin-input">
                  {['brown', 'cyan', 'pink', 'orange', 'red', 'yellow', 'green', 'blue', 'station', 'utility', 'special'].map(g => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
              </div>
              <div className="admin-field-row">
                <label>السعر:</label>
                <input type="number" value={data.price || 0} onChange={e => setData({ ...data, price: Number(e.target.value) })} className="admin-input" />
              </div>
              <div className="admin-field-row">
                <label>الإيجار:</label>
                <input type="number" value={data.baseRent || 0} onChange={e => setData({ ...data, baseRent: Number(e.target.value) })} className="admin-input" />
              </div>
              {data.type === 'property' && (
                <>
                  <div className="admin-field-row">
                    <label>إيجار 1 بيت:</label>
                    <input type="number" value={data.rent1House || 0} onChange={e => setData({ ...data, rent1House: Number(e.target.value) })} className="admin-input" />
                  </div>
                  <div className="admin-field-row">
                    <label>إيجار 2 بيت:</label>
                    <input type="number" value={data.rent2House || 0} onChange={e => setData({ ...data, rent2House: Number(e.target.value) })} className="admin-input" />
                  </div>
                  <div className="admin-field-row">
                    <label>إيجار فندق:</label>
                    <input type="number" value={data.rentHotel || 0} onChange={e => setData({ ...data, rentHotel: Number(e.target.value) })} className="admin-input" />
                  </div>
                  <div className="admin-field-row">
                    <label>تكلفة البيت:</label>
                    <input type="number" value={data.houseCost || 0} onChange={e => setData({ ...data, houseCost: Number(e.target.value) })} className="admin-input" />
                  </div>
                </>
              )}
            </>
          )}
          <div className="tile-editor-actions">
            <button className={`admin-toggle ${data.enabled ? 'on' : 'off'}`}
              onClick={() => { const d = { ...data, enabled: !data.enabled }; setData(d); }}
            >
              {data.enabled ? 'مفعل' : 'معطل'}
            </button>
            <button className="admin-btn primary" onClick={() => onSave(data)}>💾 حفظ</button>
          </div>
        </div>
      )}
    </div>
  );
}

function CardEditor({ card, onSave }: { card: any; onSave: (data: any) => void }) {
  const [expanded, setExpanded] = useState(false);
  const [data, setData] = useState(card);

  return (
    <div className={`card-editor ${!data.enabled ? 'disabled' : ''}`}>
      <div className="card-editor-header" onClick={() => setExpanded(!expanded)}>
        <span className="card-editor-id">#{data.id}</span>
        <span className="card-editor-title">{data.title}</span>
        <span className="card-editor-effect">{data.effectType}</span>
        <span className="tile-editor-arrow">{expanded ? '▲' : '▼'}</span>
      </div>
      {expanded && (
        <div className="card-editor-body">
          <div className="admin-field-row">
            <label>العنوان:</label>
            <input value={data.title} onChange={e => setData({ ...data, title: e.target.value })} className="admin-input" />
          </div>
          <div className="admin-field-row">
            <label>الوصف:</label>
            <input value={data.description} onChange={e => setData({ ...data, description: e.target.value })} className="admin-input" />
          </div>
          <div className="admin-field-row">
            <label>نوع التأثير:</label>
            <select value={data.effectType} onChange={e => setData({ ...data, effectType: e.target.value })} className="admin-input">
              {['GiveMoney', 'TakeMoney', 'MoveForward', 'MoveBackward', 'GoToJail', 'AdvanceToTile', 'PayEachPlayer', 'ReceiveFromEachPlayer', 'GetOutOfJailCard', 'AdvanceToNearestStation', 'RepairBuildings'].map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <div className="admin-field-row">
            <label>القيمة:</label>
            <input type="number" value={data.effectValue} onChange={e => setData({ ...data, effectValue: Number(e.target.value) })} className="admin-input" />
          </div>
          <div className="card-editor-actions">
            <button className={`admin-toggle ${data.enabled ? 'on' : 'off'}`}
              onClick={() => { const d = { ...data, enabled: !data.enabled }; setData(d); }}
            >
              {data.enabled ? 'مفعل' : 'معطل'}
            </button>
            <button className="admin-btn primary" onClick={() => onSave(data)}>💾 حفظ</button>
          </div>
        </div>
      )}
    </div>
  );
}
