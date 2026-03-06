import type { GameEvent } from '../App';

interface Props {
  event: GameEvent;
}

const EVENT_COLORS: Record<string, string> = {
  buy: '#2ecc71',
  rent: '#e74c3c',
  tax: '#f39c12',
  bank_tax: '#f39c12',
  pass_go: '#2ecc71',
  land_go: '#2ecc71',
  collect_pot: '#ffd700',
  jail: '#e67e22',
  freed: '#2ecc71',
  bankrupt: '#e74c3c',
  build: '#3498db',
  card: '#9b59b6',
  switch: '#9b59b6',
  double: '#e94560',
  game_over: '#ffd700',
};

export default function EventBanner({ event }: Props) {
  const color = EVENT_COLORS[event.type] || '#ffd700';
  const isNegative = ['rent', 'tax', 'bank_tax', 'jail'].includes(event.type);
  const isPositive = ['buy', 'pass_go', 'land_go', 'collect_pot', 'freed'].includes(event.type);

  return (
    <div className={`event-banner event-${event.type}`} style={{ borderColor: color }}>
      <div className="event-text" style={{ color }}>
        {event.messageAr}
      </div>
      {isNegative && <div className="event-indicator negative">-</div>}
      {isPositive && <div className="event-indicator positive">+</div>}
    </div>
  );
}
