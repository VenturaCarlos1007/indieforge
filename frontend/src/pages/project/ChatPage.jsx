import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, MessageSquare, Loader2 } from 'lucide-react';
import api from '../../services/api';
import { getSocket } from '../../services/socket';
import { useProject } from '../../components/layout/ProjectLayout';
import { useAuth } from '../../context/AuthContext';
import { timeAgo } from '../../utils/helpers';
import UserAvatar, { nameColor } from '../../components/common/UserAvatar';

function MentionText({ text, members }) {
  if (!text) return null;
  if (!members?.length) {
    const parts = text.split(/(@\S+)/g);
    return parts.map((p, i) =>
      p.startsWith('@') ? <span key={i} className="font-semibold" style={{ color: '#a855f7' }}>{p}</span> : p
    );
  }
  const sorted = [...members].sort((a, b) => b.name.length - a.name.length);
  const escaped = sorted.map(m => m.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const pattern = new RegExp(`(@(?:${escaped.join('|')})|@\\S+)`, 'g');
  const parts = text.split(pattern).filter(Boolean);
  return parts.map((p, i) =>
    p.startsWith('@')
      ? <span key={i} className="font-semibold" style={{ color: '#a855f7' }}>{p}</span>
      : p
  );
}

export default function ChatPage() {
  const { projectId, members } = useProject();
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [typers, setTypers] = useState(new Map());
  const [mentionQuery, setMentionQuery] = useState(null);
  const [mentionIndex, setMentionIndex] = useState(0);
  const [mentionedIds, setMentionedIds] = useState(new Set());
  const bottomRef = useRef(null);
  const typingTimer = useRef(null);
  const isTyping = useRef(false);
  const textareaRef = useRef(null);

  const filteredMembers = mentionQuery !== null
    ? members.filter(m => m.user_id !== user?.id && m.name.toLowerCase().includes(mentionQuery.toLowerCase())).slice(0, 6)
    : [];

  useEffect(() => {
    api.get(`/messages?project_id=${projectId}`)
      .then(({ data }) => setMessages(data.messages))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [projectId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typers]);

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
    const val = e.target.value;
    const cursor = e.target.selectionStart;
    setText(val);

    // Remove IDs whose @Name was deleted from the text
    setMentionedIds(prev => {
      if (!prev.size) return prev;
      const next = new Set();
      for (const id of prev) {
        const member = members.find(m => m.user_id === id);
        if (member && val.includes(`@${member.name}`)) next.add(id);
      }
      return next.size === prev.size ? prev : next;
    });

    const textBefore = val.slice(0, cursor);
    const match = textBefore.match(/@([^\s@]*)$/);
    if (match) {
      setMentionQuery(match[1]);
      setMentionIndex(0);
    } else {
      setMentionQuery(null);
    }

    emitTypingStart();
    clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(emitTypingStop, 2000);
  };

  const insertMention = (member) => {
    const cursor = textareaRef.current?.selectionStart ?? text.length;
    const textBefore = text.slice(0, cursor);
    const match = textBefore.match(/@([^\s@]*)$/);
    if (!match) return;
    const start = cursor - match[0].length;
    const updated = text.slice(0, start) + `@${member.name} ` + text.slice(cursor);
    setText(updated);
    setMentionedIds(prev => new Set([...prev, member.user_id]));
    setMentionQuery(null);
    setTimeout(() => textareaRef.current?.focus(), 0);
  };

  const send = async (e) => {
    e?.preventDefault();
    if (!text.trim() || sending) return;
    clearTimeout(typingTimer.current);
    emitTypingStop();
    setSending(true);
    const currentMentions = [...mentionedIds];
    try {
      await api.post('/messages', {
        project_id: projectId,
        content: text.trim(),
        mention_ids: currentMentions,
      });
      setText('');
      setMentionedIds(new Set());
      setMentionQuery(null);
    } catch (err) {
      console.error(err);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e) => {
    if (mentionQuery !== null && filteredMembers.length > 0) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setMentionIndex(i => Math.min(i + 1, filteredMembers.length - 1)); return; }
      if (e.key === 'ArrowUp')   { e.preventDefault(); setMentionIndex(i => Math.max(i - 1, 0)); return; }
      if (e.key === 'Tab')       { e.preventDefault(); insertMention(filteredMembers[mentionIndex]); return; }
      if (e.key === 'Escape')    { setMentionQuery(null); return; }
      if (e.key === 'Enter')     { e.preventDefault(); insertMention(filteredMembers[mentionIndex]); return; }
    }
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
          <MessageList messages={messages} currentUserId={user?.id} members={members} />
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
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={text}
              onChange={handleInput}
              onKeyDown={handleKeyDown}
              placeholder="Escribe un mensaje… (@ para mencionar)"
              rows={1}
              className="input-field w-full resize-none py-2.5 leading-relaxed"
              style={{ maxHeight: '120px', overflowY: 'auto' }}
            />
            {/* Mention dropdown */}
            <AnimatePresence>
              {mentionQuery !== null && filteredMembers.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 4 }}
                  className="absolute bottom-full mb-1.5 left-0 right-0 rounded-xl overflow-hidden z-50 shadow-2xl"
                  style={{ background: 'var(--glass-strong-bg, rgba(15,15,25,0.97))', border: '1px solid var(--glass-strong-border, rgba(255,255,255,0.1))', backdropFilter: 'blur(20px)' }}>
                  {filteredMembers.map((m, i) => (
                    <button
                      key={m.user_id}
                      type="button"
                      onMouseDown={(e) => { e.preventDefault(); insertMention(m); }}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors ${
                        i === mentionIndex ? 'bg-purple-500/15' : 'hover:bg-white/5'
                      }`}>
                      <UserAvatar name={m.name} avatarUrl={m.avatar_url} size={24} />
                      <span className="font-medium">{m.name}</span>
                      <span className="text-xs text-surface-500 ml-auto">{m.role}</span>
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <button type="submit" disabled={!text.trim() || sending}
            className="btn-primary px-3 py-2.5 shrink-0 disabled:opacity-40">
            {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          </button>
        </form>
        <p className="text-[10px] text-surface-500 mt-1.5">Enter para enviar · Shift+Enter para nueva línea · @ para mencionar</p>
      </div>
    </div>
  );
}

function MessageList({ messages, currentUserId, members }) {
  let lastUserId = null;
  let lastDate = null;

  return messages.map((msg) => {
    const isMe = msg.user_id === currentUserId;
    const msgDate = new Date(msg.created_at).toLocaleDateString('es-ES');
    const showDate = msgDate !== lastDate;
    const showAvatar = msg.user_id !== lastUserId || showDate;
    lastUserId = msg.user_id;
    lastDate = msgDate;
    const color = nameColor(msg.user_name);

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
            <UserAvatar name={msg.user_name} avatarUrl={msg.avatar_url} size={28} className="mt-0.5" />
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
              isMe ? 'rounded-tr-sm' : 'rounded-tl-sm'
            }`}
              style={isMe
                ? { background: 'linear-gradient(135deg, rgba(124,58,237,0.25), rgba(6,182,212,0.15))', border: '1px solid rgba(124,58,237,0.2)' }
                : { background: 'var(--glass-sm-bg)', border: '1px solid var(--glass-sm-border)' }
              }>
              <MentionText text={msg.content} members={members} />
            </div>
          </div>
        </motion.div>
      </div>
    );
  });
}
