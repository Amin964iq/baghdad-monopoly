import { useState } from 'react';
import type { UserSession } from '../App';


interface Props {
  onLogin: (session: UserSession) => void;
}

export default function LoginScreen({ onLogin }: Props) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!username.trim() || !pin.trim()) return;
    setError('');
    setLoading(true);

    try {
      const endpoint = mode === 'login' ? '/api/user/login' : '/api/user/register';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), pin: pin.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'حدث خطأ');
        setLoading(false);
        return;
      }
      // Save admin token if returned (for admin dashboard)
      if (data.adminToken) {
        localStorage.setItem('admin_token', data.adminToken);
      }
      onLogin({ username: data.username, isAdmin: data.isAdmin });
    } catch {
      setError('خطأ في الاتصال بالسيرفر');
    }
    setLoading(false);
  };

  return (
    <div className="login-screen">
      <div className="login-card">
        <div className="login-logo">🏛️</div>
        <h1 className="login-title">لعبة بغداد</h1>
        <p className="login-subtitle">{mode === 'login' ? 'تسجيل الدخول' : 'حساب جديد'}</p>

        <input
          className="login-input"
          placeholder="اسم المستخدم"
          value={username}
          onChange={e => setUsername(e.target.value)}
          maxLength={20}
          autoFocus
        />
        <input
          className="login-input login-pin-input"
          placeholder="••••"
          type="password"
          inputMode="numeric"
          value={pin}
          onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0, 8))}
          maxLength={8}
          onKeyDown={e => e.key === 'Enter' && handleSubmit()}
        />

        <button
          className="login-btn"
          onClick={handleSubmit}
          disabled={!username.trim() || pin.length < 4 || loading}
        >
          {loading ? '...' : mode === 'login' ? 'دخول' : 'انشاء حساب'}
        </button>

        {error && <div className="login-error">{error}</div>}

        <div className="login-toggle" onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }}>
          {mode === 'login' ? (
            <>ما عندك حساب؟ <span>سجّل الآن</span></>
          ) : (
            <>عندك حساب؟ <span>سجّل دخول</span></>
          )}
        </div>
      </div>
    </div>
  );
}
