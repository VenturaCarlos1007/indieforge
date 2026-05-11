import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, MessageSquare, Loader2 } from 'lucide-react';
import api from '../../services/api';
import { getSocket } from '../../services/socket';
import { useProject } from '../../components/layout/ProjectLayout';
import { useAuth } from '../../context/AuthContext';
import { timeAgo } from '../../utils/helpers';

const initial = (name) => name?.[0]?.toUpperCase() || '?';

const ACCENT_COLORS = ['#a855f7', '#22d3ee', '#34d399', '#f472b6', '#fbbf24', '#fb923c'];
const userColor = (id) => ACCENT_COLORS[id % ACCENT_COLORS.length];

export default function ChatPage() {
  const { projectId, members } = useProject();
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [typers, setTypers] = useState(new Map()); // userId → name
  const bottomRef = useRef(null);
  const typingTimer = useRef(null);
  const isTyping = useRef(false);

  useEffect(() => {
    api.get(`/messages?project_id=${projectId}`)
      .then(({ data }) => setMessages(data.messages))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [projectId]);

  // Auto-scroll on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typers]);

  // Socket listeners
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const onMessage = (msg) => setMessages(prev => [...prev, msg]);

    const onTyping = ({ userId, userName, typing }) => {
      if (userId === user?.id) return;
      setTypers(prev => {
        const next = new Map(prev);
        if (typing) next.set(userId, userName);
        else next.delete(userId);
        return next;
      });
    };

    socket.on('chat:message', onMessage);
    socket.on('chat:typing', onTyping);
    return () => {
      socket.off('chat:message', onMessage);
      socket.off('chat:typing', onTyping);
    };
  }, [user?.id]);

  const emitTypingStart = useCallback(() => {
    const socket = getSocket();
    if (!socket || isTyping.current) return;
    isTyping.current = true;
    socket.emit('chat:typing_start', { projectId, userName: user?.name });
  }, [projectId, user?.name]);

  const emitTypingStop = useCallback(() => {
    const socket = getSocket();
    if (!socket || !isTyping.current) return;
    isTyping.current = false;
    socket.emit('chat:typing_stop', { projectId });
  }, [projectId]);

  const handleInput = (e) => {
    setText(e.target.value);
    emitTypingStart();
    clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(emitTypingStop, 2000);
  };

  const send = async (e) => {
    e?.preventDefault();
    if (!text.trim() || sending) return;
    clearTimeout(typingTimer.current);
    emitTypingStop();
    setSending(true);
    try {
      await api.post('/messages', { project_id: projectId, content: text.trim() });
      setText('');
    } catch (err) {
      console.error(err);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const typerNames = [...typers.values()];

  return (
    <div className="flex flex-col h-full max-h-[calc(100vh-6rem)]">
      {/* Header */}
      <div className="flex items-center gap-3 px-6 py-4 border-b"
        style={{ borderColor: 'var(--border-subtle)' }}>
        <div className="w-8 h-8 rounded-xl flex items-center justify-center"
          style={{ background: 'rgba(168,85,247,0.12)', border: '1px solid rgba(168,85,247,0.2)' }}>
          <MessageSquare size={16} style={{ color: '#a855f7' }} />
        </div>
        <div>
          <h2 className="font-semibold text-sm">Chat del proyecto</h2>
          <p className="text-xs text-surface-500">{members.length} miembro{members.length !== 1 ? 's' : ''}</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-1 scrollbar-thin">
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 size={20} className="animate-spin text-surface-400" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
              style={{ background: 'rgba(168,85,247,0.08)', border: '1px solid rgba(168,85,247,0.15)' }}>
              <MessageSquare size={24} style={{ color: '#a855f7' }} />
            </div>
            <p className="text-sm font-semibold text-surface-300 mb-1">Todavía no hay mensajes</p>
            <p className="text-xs text-surface-500">Sé el primero en escribir algo</p>
          </div>
        ) : (
          <MessageList messages={messages} currentUserId={user?.id} />
        )}

        {/* Typing indicator */}
        <AnimatePresence>
          {typerNames.length > 0 && (
            <motion.div
              key="typing"
              initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 4 }}
              className="flex items-center gap-2 px-2 py-1">
              <div className="flex gap-1">
                {[0, 1, 2].map(i => (
                  <motion.div key={i} className="w-1.5 h-1.5 rounded-full bg-surface-400"
                    animate={{ y: [0, -4, 0] }}
                    transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }} />
                ))}
              </div>
              <span className="text-xs text-surface-500">
                {typerNames.join(', ')} {typerNames.length === 1 ? 'está' : 'están'} escribiendo…
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-6 py-4 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
        <form onSubmit={send} className="flex items-end gap-2">
          <textarea
            value={text}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            placeholder="Escribe un mensaje… (Enter para enviar)"
            rows={1}
            className="input-field flex-1 resize-none py-2.5 leading-relaxed"
            style={{ maxHeight: '120px', overflowY: 'auto' }}
          />
          <button type="submit" disabled={!text.trim() || sending}
            className="btn-primary px-3 py-2.5 shrink-0 disabled:opacity-40">
            {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          </button>
        </form>
        <p className="text-[10px] text-surface-500 mt-1.5">Enter para enviar · Shift+Enter para nueva línea</p>
      </div>
    </div>
  );
}

function MessageList({ messages, currentUserId }) {
  let lastUserId = null;
  let lastDate = null;

  return messages.map((msg) => {
    const isMe = msg.user_id === currentUserId;
    const msgDate = new Date(msg.created_at).toLocaleDateString('es-ES');
    const showDate = msgDate !== lastDate;
    const showAvatar = msg.user_id !== lastUserId || showDate;
    lastUserId = msg.user_id;
    lastDate = msgDate;
    const color = userColor(msg.user_id);

    return (
      <div key={msg.id}>
        {showDate && (
          <div className="flex items-center gap-3 py-3">
            <div className="flex-1 h-px" style={{ background: 'var(--border-subtle)' }} />
            <span className="text-[10px] text-surface-500 font-medium">{msgDate}</span>
            <div className="flex-1 h-px" style={{ background: 'var(--border-subtle)' }} />
          </div>
        )}
        <motion.div
          initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
          className={`flex gap-2.5 ${isMe ? 'flex-row-reverse' : ''} ${showAvatar ? 'mt-3' : 'mt-0.5'}`}>
          {showAvatar ? (
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5"
              style={{ background: `${color}25`, color, border: `1px solid ${color}40` }}>
              {initial(msg.user_name)}
            </div>
          ) : (
            <div className="w-7 shrink-0" />
          )}
          <div className={`max-w-[72%] ${isMe ? 'items-end' : 'items-start'} flex flex-col`}>
            {showAvatar && (
              <div className={`flex items-baseline gap-2 mb-1 ${isMe ? 'flex-row-reverse' : ''}`}>
                <span className="text-xs font-semibold" style={{ color }}>{msg.user_name}</span>
                <span className="text-[10px] text-surface-500">{timeAgo(msg.created_at)}</span>
              </div>
            )}
            <div className={`px-3 py-2 rounded-2xl text-sm leading-relaxed break-words ${
              isMe
                ? 'rounded-tr-sm'
                : 'rounded-tl-sm'
            }`}
              style={isMe
                ? { background: 'linear-gradient(135deg, rgba(124,58,237,0.25), rgba(6,182,212,0.15))', border: '1px solid rgba(124,58,237,0.2)' }
                : { background: 'var(--glass-sm-bg)', border: '1px solid var(--glass-sm-border)' }
              }>
              {msg.content}
            </div>
          </div>
        </motion.div>
      </div>
    );
  });
}
