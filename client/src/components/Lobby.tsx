import { useState } from 'react';
import type { UserSession } from '../App';

interface LobbyProps {
  onCreateRoom: (playerName: string, roomName: string) => void;
  onJoinRoom: (roomCode: string, playerName: string) => void;
  onResumeGame: (pauseCode: string, playerName: string) => void;
  connected: boolean;
  user: UserSession;
  onLogout: () => void;
}

export default function Lobby({ onCreateRoom, onJoinRoom, onResumeGame, connected, user, onLogout }: LobbyProps) {
  const [mode, setMode] = useState<'menu' | 'create' | 'join' | 'resume'>('menu');
  const [playerName, setPlayerName] = useState(user.username);
  const [roomName, setRoomName] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [resumeCode, setResumeCode] = useState('');

  if (mode === 'create') {
    return (
      <div className="lobby">
        <div className="lobby-card">
          <h1 className="lobby-title">لعبة بغداد</h1>
          <h2 className="lobby-subtitle">انشاء غرفة جديدة</h2>
          <input
            className="lobby-input"
            placeholder="اسمك"
            value={playerName}
            onChange={e => setPlayerName(e.target.value)}
            maxLength={20}
          />
          <input
            className="lobby-input"
            placeholder="اسم الغرفة"
            value={roomName}
            onChange={e => setRoomName(e.target.value)}
            maxLength={30}
          />
          <button
            className="lobby-btn primary"
            onClick={() => playerName.trim() && onCreateRoom(playerName.trim(), roomName.trim())}
            disabled={!playerName.trim() || !connected}
          >
            انشاء الغرفة
          </button>
          <button className="lobby-btn secondary" onClick={() => setMode('menu')}>
            رجوع
          </button>
        </div>
      </div>
    );
  }

  if (mode === 'join') {
    return (
      <div className="lobby">
        <div className="lobby-card">
          <h1 className="lobby-title">لعبة بغداد</h1>
          <h2 className="lobby-subtitle">الانضمام لغرفة</h2>
          <input
            className="lobby-input"
            placeholder="اسمك"
            value={playerName}
            onChange={e => setPlayerName(e.target.value)}
            maxLength={20}
          />
          <input
            className="lobby-input"
            placeholder="كود الغرفة"
            value={roomCode}
            onChange={e => setRoomCode(e.target.value.toUpperCase())}
            maxLength={6}
            style={{ textAlign: 'center', letterSpacing: '4px', fontFamily: 'monospace' }}
          />
          <button
            className="lobby-btn primary"
            onClick={() => playerName.trim() && roomCode.trim() && onJoinRoom(roomCode.trim(), playerName.trim())}
            disabled={!playerName.trim() || !roomCode.trim() || !connected}
          >
            انضمام
          </button>
          <button className="lobby-btn secondary" onClick={() => setMode('menu')}>
            رجوع
          </button>
        </div>
      </div>
    );
  }

  if (mode === 'resume') {
    return (
      <div className="lobby">
        <div className="lobby-card">
          <h1 className="lobby-title">لعبة بغداد</h1>
          <h2 className="lobby-subtitle">استئناف لعبة محفوظة</h2>
          <input
            className="lobby-input"
            placeholder="اسمك (نفس الاسم السابق)"
            value={playerName}
            onChange={e => setPlayerName(e.target.value)}
            maxLength={20}
          />
          <input
            className="lobby-input"
            placeholder="رمز الاستئناف"
            value={resumeCode}
            onChange={e => setResumeCode(e.target.value.toUpperCase())}
            maxLength={6}
            style={{ textAlign: 'center', letterSpacing: '4px', fontFamily: 'monospace' }}
          />
          <button
            className="lobby-btn primary"
            onClick={() => playerName.trim() && resumeCode.trim() && onResumeGame(resumeCode.trim(), playerName.trim())}
            disabled={!playerName.trim() || !resumeCode.trim() || !connected}
          >
            استئناف اللعبة
          </button>
          <button className="lobby-btn secondary" onClick={() => setMode('menu')}>
            رجوع
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="lobby">
      {user.isAdmin && (
        <button className="lobby-admin-btn" onClick={() => { window.location.pathname = '/admin'; }}>
          ⚙️ لوحة التحكم
        </button>
      )}
      <div className="login-user-info">
        <strong>{user.username}</strong>
        <button className="login-logout-btn" onClick={onLogout}>خروج</button>
      </div>
      <div className="lobby-card">
        <div className="lobby-logo">🏛️</div>
        <h1 className="lobby-title">لعبة بغداد</h1>
        <p className="lobby-desc">Baghdad Monopoly</p>
        <div className="lobby-status">
          <span className={`status-dot ${connected ? 'online' : 'offline'}`} />
          {connected ? 'متصل' : 'جاري الاتصال...'}
        </div>
        <button className="lobby-btn primary" onClick={() => setMode('create')} disabled={!connected}>
          انشاء غرفة جديدة
        </button>
        <button className="lobby-btn secondary" onClick={() => setMode('join')} disabled={!connected}>
          الانضمام لغرفة
        </button>
        <button className="lobby-btn secondary" onClick={() => setMode('resume')} disabled={!connected}>
          استئناف لعبة محفوظة
        </button>
      </div>
    </div>
  );
}
