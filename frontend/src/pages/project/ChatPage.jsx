import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, MessageSquare, Loader2, Pencil, Trash2 } from 'lucide-react';
import api from '../../services/api';
import { getSocket } from '../../services/socket';
import { useProject } from '../../components/layout/ProjectLayout';
import { useAuth } from '../../context/AuthContext';
import { timeAgo } from '../../utils/helpers';
import UserAvatar, { nameColor } from '../../components/common/UserAvatar';

const EMOJI_SET = ['👍', '❤️', '😂', '😮', '😢', '🔥', '🎮', '✅'];
const ENGINE_ACCENT = { unity: '#4CAF50', unreal: '#2196F3', godot: '#5C6BC0', roblox: '#F59E0B', custom: '#7C3AED' };
const MAX_CHARS = 500;

// ── helpers ──────────────────────────────────────────────────────────
function groupReactions(raw = []) {
  const map = {};
  for (const r of raw) {
    if (!map[r.emoji]) map[r.emoji] = { emoji: r.emoji, userIds: [], userNames: [] };
    map[r.emoji].userIds.push(String(r.user_id));
    map[r.emoji].userNames.push(r.user_name);
  }
  return Object.values(map);
}

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

// ── EmojiPicker ───────────────────────────────────────────────────────
function EmojiPicker({ onSelect, pickerRef, isMe }) {
  return (
    <motion.div
      ref={pickerRef}
      initial={{ opacity: 0, scale: 0.88, y: 6 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.88, y: 6 }}
      transition={{ duration: 0.13 }}
      className={`absolute bottom-full mb-2 z-40 flex gap-0.5 p-1.5 rounded-2xl shadow-2xl ${isMe ? 'right-0' : 'left-0'}`}
      style={{ background: 'rgba(8,8,18,0.97)', border: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(20px)' }}
    >
      {EMOJI_SET.map(e => (
        <button
          key={e}
          onMouseDown={(ev) => { ev.stopPropagation(); onSelect(e); }}
          onTouchStart={(ev) => { ev.stopPropagation(); ev.preventDefault(); onSelect(e); }}
          className="w-9 h-9 flex items-center justify-center rounded-xl text-xl hover:bg-white/10 transition-all hover:scale-125"
        >
          {e}
        </button>
      ))}
    </motion.div>
  );
}

// ── ReactionPills ─────────────────────────────────────────────────────
function ReactionPills({ grouped, currentUserId, accent, onToggle }) {
  const [tooltip, setTooltip] = useState(null);
  if (!grouped.length) return null;
  return (
    <div className="flex flex-wrap gap-1 mt-1.5">
      {grouped.map(r => {
        const mine = r.userIds.includes(String(currentUserId));
        return (
          <div key={r.emoji} className="relative">
            <button
              onClick={() => onToggle(r.emoji)}
              onMouseEnter={() => setTooltip(r.emoji)}
              onMouseLeave={() => setTooltip(null)}
              className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium transition-all active:scale-95"
              style={{
                background: mine ? `${accent}22` : 'rgba(255,255,255,0.06)',
                border: `1px solid ${mine ? `${accent}45` : 'rgba(255,255,255,0.08)'}`,
                color: mine ? accent : '#94a3b8',
              }}
            >
              <span>{r.emoji}</span>
              <span>{r.userIds.length}</span>
            </button>
            {tooltip === r.emoji && r.userNames.length > 0 && (
              <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 px-2 py-1 rounded-lg text-[10px] whitespace-nowrap z-50 pointer-events-none"
                style={{ background: 'rgba(8,8,18,0.97)', border: '1px solid rgba(255,255,255,0.1)' }}>
                {r.userNames.join(', ')}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Message ───────────────────────────────────────────────────────────
function Message({ msg, currentUserId, userRole, members, accent, avatarSize, showDate, showAvatar, onEdit, onDelete, onReact }) {
  const isMe = String(msg.user_id) === String(currentUserId);
  const canEdit = isMe;
  const canDelete = isMe || ['owner', 'admin'].includes(userRole);

  const [showActions, setShowActions] = useState(false);
  const [editing, setEditing]         = useState(false);
  const [editText, setEditText]       = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [pickerOpen, setPickerOpen]   = useState(false);
  const [saving, setSaving]           = useState(false);

  const editRef   = useRef(null);
  const pickerRef = useRef(null);
  const hideTimer = useRef(null);
  const touchTimer = useRef(null);

  const color      = nameColor(msg.user_name);
  const reactions  = groupReactions(msg.raw_reactions);
  const msgDate    = new Date(msg.created_at).toLocaleDateString('es-ES');

  // close picker on outside click
  useEffect(() => {
    if (!pickerOpen) return;
    const close = (e) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target)) setPickerOpen(false);
    };
    document.addEventListener('mousedown', close, { capture: true });
    document.addEventListener('touchstart', close, { capture: true, passive: true });
    return () => {
      document.removeEventListener('mousedown', close, { capture: true });
      document.removeEventListener('touchstart', close, { capture: true });
    };
  }, [pickerOpen]);

  useEffect(() => {
    if (editing) {
      editRef.current?.focus();
      const len = editText.length;
      editRef.current?.setSelectionRange(len, len);
    }
  }, [editing]);

  const startEdit = () => { setEditText(msg.content); setEditing(true); setShowActions(false); setConfirmDelete(false); };
  const cancelEdit = () => { setEditing(false); setEditText(''); };

  const submitEdit = async () => {
    const trimmed = editText.trim();
    if (!trimmed || trimmed === msg.content || saving) return;
    setSaving(true);
    try { await onEdit(msg.id, trimmed); setEditing(false); }
    finally { setSaving(false); }
  };

  const handleEditKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitEdit(); }
    if (e.key === 'Escape') cancelEdit();
  };

  const handleMouseEnter = () => { clearTimeout(hideTimer.current); setShowActions(true); };
  const handleMouseLeave = () => {
    hideTimer.current = setTimeout(() => {
      setShowActions(false);
      setPickerOpen(false);
      if (!editing) setConfirmDelete(false);
    }, 150);
  };

  const handleTouchStart = () => { touchTimer.current = setTimeout(() => { setShowActions(true); navigator.vibrate?.(15); }, 600); };
  const handleTouchEnd   = () => clearTimeout(touchTimer.current);
  const handleTouchMove  = () => clearTimeout(touchTimer.current);

  return (
    <div>
      {showDate && (
        <div className="flex items-center gap-3 py-3">
          <div className="flex-1 h-px" style={{ background: 'var(--border-subtle)' }} />
          <span className="text-[10px] text-surface-500 font-medium">{msgDate}</span>
          <div className="flex-1 h-px" style={{ background: 'var(--border-subtle)' }} />
        </div>
      )}
      <motion.div
        initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, height: 0, marginTop: 0, transition: { duration: 0.2 } }}
        className={`flex gap-2.5 ${isMe ? 'flex-row-reverse' : ''} ${showAvatar ? 'mt-3' : 'mt-0.5'}`}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onTouchMove={handleTouchMove}
      >
        {/* Avatar or spacer */}
        {showAvatar
          ? <UserAvatar name={msg.user_name} avatarUrl={msg.avatar_url} size={avatarSize} className="mt-0.5 shrink-0" />
          : <div style={{ width: avatarSize }} className="shrink-0" />
        }

        {/* Content area */}
        <div className={`max-w-[85%] md:max-w-[72%] flex flex-col relative ${isMe ? 'items-end' : 'items-start'}`}>

          {/* Action bar */}
          <AnimatePresence>
            {showActions && !editing && (
              <motion.div
                initial={{ opacity: 0, scale: 0.88 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.88 }}
                transition={{ duration: 0.12 }}
                className={`absolute -top-9 z-20 flex items-center gap-0.5 rounded-xl px-1.5 py-1 ${isMe ? 'left-0' : 'right-0'}`}
                style={{ background: 'rgba(8,8,18,0.96)', border: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(16px)' }}
              >
                <button
                  onClick={() => setPickerOpen(p => !p)}
                  className="w-7 h-7 flex items-center justify-center rounded-lg text-base hover:bg-white/10 transition-all"
                  title="Reaccionar"
                >😊</button>
                {canEdit && (
                  <button onClick={startEdit}
                    className="w-7 h-7 flex items-center justify-center rounded-lg text-surface-400 hover:text-white hover:bg-white/10 transition-all"
                    title="Editar">
                    <Pencil size={13} />
                  </button>
                )}
                {canDelete && (
                  <button onClick={() => { setConfirmDelete(true); setShowActions(false); }}
                    className="w-7 h-7 flex items-center justify-center rounded-lg text-surface-400 hover:text-red-400 hover:bg-red-500/10 transition-all"
                    title="Eliminar">
                    <Trash2 size={13} />
                  </button>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Name + time */}
          {showAvatar && (
            <div className={`flex items-baseline gap-2 mb-1 ${isMe ? 'flex-row-reverse' : ''}`}>
              <span className="text-xs font-semibold" style={{ color }}>{msg.user_name}</span>
              <span className="text-[10px] text-surface-500">{timeAgo(msg.created_at)}</span>
              {msg.edited && <span className="text-[10px] text-surface-500 italic">(editado)</span>}
            </div>
          )}

          {/* Bubble or edit input */}
          {editing ? (
            <div className="w-full min-w-[200px]">
              <textarea
                ref={editRef}
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                onKeyDown={handleEditKeyDown}
                rows={2}
                className="input-field w-full text-sm resize-none"
              />
              <div className={`flex gap-1.5 mt-1.5 ${isMe ? 'justify-end' : ''}`}>
                <button onClick={cancelEdit} className="text-[11px] text-surface-400 hover:text-white px-2.5 py-1 rounded-lg hover:bg-white/5 transition-all">
                  Cancelar
                </button>
                <button onClick={submitEdit} disabled={saving}
                  className="text-[11px] text-brand-300 hover:text-white px-2.5 py-1 rounded-lg hover:bg-brand-500/20 transition-all font-medium disabled:opacity-50">
                  {saving ? 'Guardando…' : 'Guardar'}
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="relative">
                <div
                  className={`px-3 py-2 rounded-2xl text-sm leading-relaxed break-words ${isMe ? 'rounded-tr-sm' : 'rounded-tl-sm'} ${confirmDelete ? 'opacity-40' : ''}`}
                  style={isMe
                    ? { background: 'linear-gradient(135deg, rgba(124,58,237,0.25), rgba(6,182,212,0.15))', border: '1px solid rgba(124,58,237,0.2)' }
                    : { background: 'var(--glass-sm-bg)', border: '1px solid var(--glass-sm-border)' }
                  }
                >
                  <MentionText text={msg.content} members={members} />
                  {msg.edited && !showAvatar && (
                    <span className="text-[10px] text-surface-500 italic ml-1.5">(editado)</span>
                  )}
                </div>

                {/* Emoji picker */}
                <AnimatePresence>
                  {pickerOpen && (
                    <EmojiPicker
                      pickerRef={pickerRef}
                      isMe={isMe}
                      onSelect={(emoji) => { onReact(msg.id, emoji); setPickerOpen(false); }}
                    />
                  )}
                </AnimatePresence>
              </div>

              {/* Inline delete confirm */}
              <AnimatePresence>
                {confirmDelete && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
                    className={`flex items-center gap-2 mt-1.5 text-xs ${isMe ? 'justify-end' : ''}`}
                  >
                    <span className="text-red-400">¿Eliminar?</span>
                    <button
                      onClick={() => { onDelete(msg.id); setConfirmDelete(false); }}
                      className="text-red-400 hover:text-red-300 font-semibold px-2 py-0.5 rounded-lg hover:bg-red-500/10 transition-all">
                      Sí
                    </button>
                    <button
                      onClick={() => setConfirmDelete(false)}
                      className="text-surface-400 hover:text-white px-2 py-0.5 rounded-lg hover:bg-white/5 transition-all">
                      No
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </>
          )}

          {/* Reaction pills */}
          <ReactionPills
            grouped={reactions}
            currentUserId={currentUserId}
            accent={accent}
            onToggle={(emoji) => onReact(msg.id, emoji)}
          />
        </div>
      </motion.div>
    </div>
  );
}

// ── MessageList ───────────────────────────────────────────────────────
function MessageList({ messages, currentUserId, userRole, members, accent, avatarSize, onEdit, onDelete, onReact }) {
  let lastUserId = null;
  let lastDate   = null;

  return (
    <AnimatePresence initial={false}>
      {messages.map((msg) => {
        const msgDate  = new Date(msg.created_at).toLocaleDateString('es-ES');
        const showDate = msgDate !== lastDate;
        const showAvatar = String(msg.user_id) !== String(lastUserId) || showDate;
        lastUserId = String(msg.user_id);
        lastDate   = msgDate;

        return (
          <Message
            key={msg.id}
            msg={msg}
            currentUserId={currentUserId}
            userRole={userRole}
            members={members}
            accent={accent}
            avatarSize={avatarSize}
            showDate={showDate}
            showAvatar={showAvatar}
            onEdit={onEdit}
            onDelete={onDelete}
            onReact={onReact}
          />
        );
      })}
    </AnimatePresence>
  );
}

// ── ChatPage ──────────────────────────────────────────────────────────
export default function ChatPage() {
  const { projectId, members, project, role } = useProject();
  const { user } = useAuth();
  const accent = ENGINE_ACCENT[project?.engine] || '#7C3AED';

  const [messages,      setMessages]      = useState([]);
  const [text,          setText]          = useState('');
  const [loading,       setLoading]       = useState(true);
  const [sending,       setSending]       = useState(false);
  const [typers,        setTypers]        = useState(new Map());
  const [mentionQuery,  setMentionQuery]  = useState(null);
  const [mentionIndex,  setMentionIndex]  = useState(0);
  const [mentionedIds,  setMentionedIds]  = useState(new Set());
  const [isMobile,      setIsMobile]      = useState(() => typeof window !== 'undefined' && window.innerWidth < 768);

  const bottomRef    = useRef(null);
  const typingTimer  = useRef(null);
  const isTyping     = useRef(false);
  const textareaRef  = useRef(null);

  useEffect(() => {
    const h = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', h, { passive: true });
    return () => window.removeEventListener('resize', h);
  }, []);

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
    const onTyping  = ({ userId, userName, typing }) => {
      if (String(userId) === String(user?.id)) return;
      setTypers(prev => {
        const next = new Map(prev);
        if (typing) next.set(userId, userName); else next.delete(userId);
        return next;
      });
    };
    const onEdited   = ({ id, content, edited, edited_at }) =>
      setMessages(prev => prev.map(m => String(m.id) === String(id) ? { ...m, content, edited, edited_at } : m));
    const onDeleted  = ({ id }) =>
      setMessages(prev => prev.filter(m => String(m.id) !== String(id)));
    const onReaction = ({ messageId, reactions }) =>
      setMessages(prev => prev.map(m => String(m.id) === String(messageId) ? { ...m, raw_reactions: reactions } : m));

    socket.on('chat:message',          onMessage);
    socket.on('chat:typing',           onTyping);
    socket.on('chat:message_edited',   onEdited);
    socket.on('chat:message_deleted',  onDeleted);
    socket.on('chat:message_reaction', onReaction);

    return () => {
      socket.off('chat:message',          onMessage);
      socket.off('chat:typing',           onTyping);
      socket.off('chat:message_edited',   onEdited);
      socket.off('chat:message_deleted',  onDeleted);
      socket.off('chat:message_reaction', onReaction);
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

  // ── Message actions ────────────────────────────────────────────────
  const editMessage = useCallback(async (msgId, content) => {
    try {
      await api.patch(`/messages/${msgId}`, { content });
      setMessages(prev => prev.map(m => String(m.id) === String(msgId)
        ? { ...m, content, edited: true, edited_at: new Date().toISOString() }
        : m
      ));
    } catch (err) { console.error(err); }
  }, []);

  const deleteMessage = useCallback(async (msgId) => {
    try {
      await api.delete(`/messages/${msgId}`);
      setMessages(prev => prev.filter(m => String(m.id) !== String(msgId)));
    } catch (err) { console.error(err); }
  }, []);

  const reactToMessage = useCallback(async (msgId, emoji) => {
    // optimistic update
    setMessages(prev => prev.map(m => {
      if (String(m.id) !== String(msgId)) return m;
      const raw = m.raw_reactions || [];
      const myPrev = raw.find(r => String(r.user_id) === String(user?.id));
      let newRaw = raw.filter(r => String(r.user_id) !== String(user?.id));
      if (!myPrev || myPrev.emoji !== emoji) {
        newRaw = [...newRaw, { emoji, user_id: String(user?.id), user_name: user?.name }];
      }
      return { ...m, raw_reactions: newRaw };
    }));
    try {
      const { data } = await api.post(`/messages/${msgId}/reactions`, { emoji });
      setMessages(prev => prev.map(m => String(m.id) === String(msgId)
        ? { ...m, raw_reactions: data.reactions }
        : m
      ));
    } catch (err) { console.error(err); }
  }, [user?.id, user?.name]);

  // ── Input handlers ─────────────────────────────────────────────────
  const handleInput = (e) => {
    const val    = e.target.value;
    const cursor = e.target.selectionStart;
    setText(val);

    setMentionedIds(prev => {
      if (!prev.size) return prev;
      const next = new Set();
      for (const id of prev) {
        const member = members.find(m => m.user_id === id);
        if (member && val.includes(`@${member.name}`)) next.add(id);
      }
      return next.size === prev.size ? prev : next;
    });

    const match = val.slice(0, cursor).match(/@([^\s@]*)$/);
    if (match) { setMentionQuery(match[1]); setMentionIndex(0); }
    else setMentionQuery(null);

    emitTypingStart();
    clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(emitTypingStop, 2000);
  };

  const insertMention = (member) => {
    const cursor = textareaRef.current?.selectionStart ?? text.length;
    const textBefore = text.slice(0, cursor);
    const match = textBefore.match(/@([^\s@]*)$/);
    if (!match) return;
    const start   = cursor - match[0].length;
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
    } catch (err) { console.error(err); }
    finally { setSending(false); }
  };

  const handleKeyDown = (e) => {
    if (mentionQuery !== null && filteredMembers.length > 0) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setMentionIndex(i => Math.min(i + 1, filteredMembers.length - 1)); return; }
      if (e.key === 'ArrowUp')   { e.preventDefault(); setMentionIndex(i => Math.max(i - 1, 0)); return; }
      if (e.key === 'Tab')       { e.preventDefault(); insertMention(filteredMembers[mentionIndex]); return; }
      if (e.key === 'Escape')    { setMentionQuery(null); return; }
      if (e.key === 'Enter')     { e.preventDefault(); insertMention(filteredMembers[mentionIndex]); return; }
    }
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  };

  const typerNames = [...typers.values()];
  const avatarSize = isMobile ? 32 : 28;

  return (
    <div className="flex flex-col h-[100dvh] md:h-full md:max-h-[calc(100vh-6rem)]">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 md:px-6 py-4 border-b shrink-0"
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
      <div className="flex-1 overflow-y-auto px-3 md:px-6 py-4 scrollbar-thin">
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
          <MessageList
            messages={messages}
            currentUserId={user?.id}
            userRole={role}
            members={members}
            accent={accent}
            avatarSize={avatarSize}
            onEdit={editMessage}
            onDelete={deleteMessage}
            onReact={reactToMessage}
          />
        )}

        {/* Typing indicator */}
        <AnimatePresence>
          {typerNames.length > 0 && (
            <motion.div
              key="typing"
              initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 4 }}
              className="flex items-center gap-2 px-2 py-1 mt-1">
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
      <div className="px-3 md:px-6 py-3 md:py-4 border-t shrink-0" style={{ borderColor: 'var(--border-subtle)' }}>
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
              maxLength={MAX_CHARS}
              style={{ maxHeight: '120px', overflowY: 'auto', fontSize: isMobile ? '16px' : undefined }}
            />
            {/* Mention dropdown */}
            <AnimatePresence>
              {mentionQuery !== null && filteredMembers.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 4 }}
                  className="absolute bottom-full mb-1.5 left-0 right-0 rounded-xl overflow-hidden z-50 shadow-2xl"
                  style={{ background: 'rgba(8,8,18,0.97)', border: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(20px)' }}>
                  {filteredMembers.map((m, i) => (
                    <button key={m.user_id} type="button"
                      onMouseDown={(e) => { e.preventDefault(); insertMention(m); }}
                      className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-sm transition-colors ${
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
          <button type="submit" disabled={!text.trim() || sending || text.length > MAX_CHARS}
            className="btn-primary px-3 py-2.5 min-h-[44px] min-w-[44px] shrink-0 disabled:opacity-40 flex items-center justify-center">
            {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          </button>
        </form>
        <div className="flex items-center justify-between mt-1.5">
          <p className="hidden md:block text-[10px] text-surface-500">
            Enter para enviar · Shift+Enter para nueva línea · @ para mencionar
          </p>
          <span className={`text-xs ml-auto ${
            text.length >= MAX_CHARS ? 'text-red-400' : text.length > 450 ? 'text-yellow-400' : 'text-surface-500'
          }`}>{text.length}/{MAX_CHARS}</span>
        </div>
      </div>
    </div>
  );
}
