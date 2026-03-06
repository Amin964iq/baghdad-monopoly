import type { GameEvent } from '../App';

interface Props {
  events: GameEvent[];
}

const EVENT_ICONS: Record<string, string> = {
  buy: '🏠',
  rent: '💸',
  tax: '💰',
  bank_tax: '🏦',
  build: '🏗️',
  jail: '🔒',
  freed: '🔓',
  pass_go: '🚀',
  land_go: '🚀',
  card: '🃏',
  collect_pot: '💎',
  switch: '🔄',
  bankrupt: '💀',
  trade: '🤝',
  game_over: '🏆',
  double: '🎯',
};

const EVENT_COLORS: Record<string, string> = {
  buy: '#22c55e',
  rent: '#ef4444',
  tax: '#f59e0b',
  bank_tax: '#f59e0b',
  build: '#3b82f6',
  jail: '#f97316',
  freed: '#22c55e',
  pass_go: '#22c55e',
  land_go: '#22c55e',
  card: '#a855f7',
  collect_pot: '#fbbf24',
  switch: '#a855f7',
  bankrupt: '#dc2626',
  trade: '#3b82f6',
  game_over: '#fbbf24',
  double: '#f43f5e',
};

export default function EventLog({ events }: Props) {
  const recent = events.slice(-6).reverse();

  if (recent.length === 0) return null;

  return (
    <div className="event-log">
      <div className="panel-header-bar small">
        <span className="panel-header-icon">📋</span>
        <span className="panel-header-text">آخر الأحداث</span>
      </div>
      <div className="event-log-list">
        {recent.map((ev, i) => (
          <div
            key={ev.id}
            className={`event-log-item event-log-${ev.type}`}
            style={{
              opacity: 1 - i * 0.12,
              borderRightColor: EVENT_COLORS[ev.type] || '#fbbf24',
            }}
          >
            <span className="event-log-icon">{EVENT_ICONS[ev.type] || '📌'}</span>
            <span className="event-log-text">{ev.messageAr}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
