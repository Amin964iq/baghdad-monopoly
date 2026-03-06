import { useState, useRef, useEffect } from 'react';
import { socket } from '../socket';
import type { ChatMessage, Player } from '../App';

interface Props {
  messages: ChatMessage[];
  players: Player[];
  myPlayerId: string | null;
  onClose: () => void;
}

export default function ChatPanel({ messages, players, myPlayerId, onClose }: Props) {
  const [text, setText] = useState('');
  const [privateTarget, setPrivateTarget] = useState<string | undefined>();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const send = () => {
    if (!text.trim()) return;
    socket.emit('send_chat', { text: text.trim(), recipientId: privateTarget });
    setText('');
  };

  return (
    <div className="chat-overlay">
      <div className="chat-panel">
        <div className="chat-header">
          <h3>💬 المحادثة</h3>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="chat-mode">
          <button
            className={`mode-btn ${!privateTarget ? 'active' : ''}`}
            onClick={() => setPrivateTarget(undefined)}
          >
            عام
          </button>
          {players.filter(p => p.id !== myPlayerId && !p.isBot).map(p => (
            <button
              key={p.id}
              className={`mode-btn ${privateTarget === p.id ? 'active' : ''}`}
              onClick={() => setPrivateTarget(p.id)}
            >
              {p.name}
            </button>
          ))}
        </div>

        <div className="chat-messages" ref={scrollRef}>
          {messages.map(msg => (
            <div
              key={msg.id}
              className={`chat-msg ${msg.senderId === myPlayerId ? 'mine' : ''} ${msg.isPrivate ? 'private' : ''}`}
            >
              <span className="msg-sender">{msg.senderName}</span>
              {msg.isPrivate && <span className="msg-private">خاص</span>}
              <span className="msg-text">{msg.text}</span>
            </div>
          ))}
        </div>

        <div className="chat-input">
          <input
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && send()}
            placeholder={privateTarget ? 'رسالة خاصة...' : 'اكتب رسالة...'}
          />
          <button onClick={send}>ارسل</button>
        </div>
      </div>
    </div>
  );
}
