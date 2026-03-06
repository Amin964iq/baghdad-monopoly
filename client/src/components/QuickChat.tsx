import { useState } from 'react';
import { socket } from '../socket';

const QUICK_MESSAGES = [
  { text: 'يلا اسرع! 😤', emoji: '⏩' },
  { text: 'ههههههه 🤣', emoji: '🤣' },
  { text: 'خرب إنْه! 😩', emoji: '😩' },
  { text: 'شكد حظي زفت 💀', emoji: '💀' },
  { text: 'ادفع يا بخيل! 💸', emoji: '💸' },
  { text: 'الله يستر 🤲', emoji: '🤲' },
  { text: 'لا تشتريها خلها! 🚫', emoji: '🚫' },
  { text: 'مبروووك! 🎉', emoji: '🎉' },
  { text: 'تره أفلسك! 😈', emoji: '😈' },
  { text: 'بيع لي رخيص 🤝', emoji: '🤝' },
  { text: 'يا سلاااام 🔥', emoji: '🔥' },
  { text: 'شدسوي بحياتي 😭', emoji: '😭' },
  { text: 'اي والله عاش 👏', emoji: '👏' },
  { text: 'هسه دوري ترا 🎲', emoji: '🎲' },
  { text: 'خوش ضربة! 💪', emoji: '💪' },
  { text: 'روح للسجن 😂', emoji: '🔒' },
];

interface Props {
  onBubble?: (text: string) => void;
}

export default function QuickChat({ onBubble }: Props) {
  const [show, setShow] = useState(false);
  const [lastSent, setLastSent] = useState('');

  const send = (text: string) => {
    socket.emit('send_chat', { text });
    setLastSent(text);
    if (onBubble) onBubble(text);
    setTimeout(() => setLastSent(''), 2000);
  };

  return (
    <div className="quick-chat">
      <button className="quick-chat-toggle" onClick={() => setShow(!show)} title="رسائل سريعة">
        ⚡
      </button>
      {show && (
        <div className="quick-chat-grid">
          {QUICK_MESSAGES.map((msg, i) => (
            <button
              key={i}
              className={`quick-msg-btn ${lastSent === msg.text ? 'sent' : ''}`}
              onClick={() => send(msg.text)}
              disabled={lastSent === msg.text}
              title={msg.text}
            >
              {msg.emoji}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
