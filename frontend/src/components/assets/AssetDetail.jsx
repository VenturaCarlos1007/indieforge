import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import api from '../../services/api';
import { timeAgo } from '../../utils/helpers';
import { useProject } from '../layout/ProjectLayout';
import { History, RotateCcw, MessageSquare, Send, Check, Reply, ChevronDown, ChevronUp, Download, ZoomIn, X, Loader2, Upload } from 'lucide-react';

function formatBytes(bytes) {
  const n = Number(bytes);
  if (!n || n <= 0) return '0 B';
  const k = 1024, sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.min(Math.floor(Math.log(n) / Math.log(k)), sizes.length - 1);
  return parseFloat((n / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export default function AssetDetail({ asset, onUpdate }) {
  const { role } = useProject();
  const isViewer = role === 'viewer';
  const [tab, setTab] = useState('versions');
  const [lightbox, setLightbox] = useState(false);
  const [sendingComment, setSendingComment] = useState(false);
  const [restoringId, setRestoringId] = useState(null);
  const [uploadingNewVersion, setUploadingNewVersion] = useState(false);
  const [versions, setVersions] = useState([]);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [replyTo, setReplyTo] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!lightbox) return;
    const handler = (e) => { if (e.key === 'Escape') setLightbox(false); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [lightbox]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [vRes, cRes] = await Promise.all([
          api.get(`/assets/${asset.id}/versions`),
          api.get(`/comments?asset_id=${asset.id}`),
        ]);
        setVersions(vRes.data.versions);
        setComments(cRes.data.comments);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    };
    load();
  }, [asset.id]);

  const restore = async (versionId) => {
    if (restoringId) return;
    setRestoringId(versionId);
    try {
      await api.post(`/assets/${asset.id}/restore/${versionId}`);
      const vRes = await api.get(`/assets/${asset.id}/versions`);
      setVersions(vRes.data.versions);
      onUpdate?.();
    } finally { setRestoringId(null); }
  };

  const handleUploadNewVersion = () => {
    if (uploadingNewVersion) return;
    const input = document.createElement('input');
    input.type = 'file';
    input.onchange = (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setUploadingNewVersion(true);
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const { data } = await api.post(`/assets/${asset.id}/versions`, {
            storage_url: reader.result,
            size_bytes: file.size,
          });
          setVersions(prev => [
            data.version,
            ...prev.map(v => ({ ...v, is_active: false })),
          ]);
          onUpdate?.();
        } catch (err) {
          console.error('Error uploading new version:', err);
        } finally {
          setUploadingNewVersion(false);
        }
      };
      reader.onerror = () => setUploadingNewVersion(false);
      reader.readAsDataURL(file);
    };
    input.click();
  };

  const sendComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim() || sendingComment) return;
    setSendingComment(true);
    try {
      await api.post('/comments', { asset_id: asset.id, content: newComment, parent_id: replyTo });
      const cRes = await api.get(`/comments?asset_id=${asset.id}`);
      setComments(cRes.data.comments);
      setNewComment('');
      setReplyTo(null);
    } finally { setSendingComment(false); }
  };

  const resolveComment = async (id) => {
    await api.patch(`/comments/${id}/resolve`);
    setComments((prev) => prev.map((c) => c.id === id ? { ...c, resolved: true } : c));
  };

  // Build threaded comments
  const rootComments = comments.filter((c) => !c.parent_id);
  const getReplies = (parentId) => comments.filter((c) => c.parent_id === parentId);

  const tabs = [
    { key: 'versions', label: 'Versiones', icon: History },
    { key: 'comments', label: 'Comentarios', icon: MessageSquare, count: comments.length },
  ];

  return (
    <div className="space-y-5">
      {/* Asset info & Preview */}
      <div className="flex flex-col gap-4 pb-4 border-b border-white/[0.06]">
        {/* Preview */}
        {asset.type === 'image' && versions.find(v => v.is_active)?.storage_url && (() => {
          const url = versions.find(v => v.is_active).storage_url;
          return (
            <>
              <div
                className="w-full bg-black/40 rounded-xl overflow-hidden border border-white/10 cursor-zoom-in relative group"
                style={{ height: '320px' }}
                onClick={() => setLightbox(true)}
              >
                <img src={url} alt={asset.name} className="w-full h-full object-contain" />
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                  <div className="bg-black/60 rounded-full p-2.5">
                    <ZoomIn size={22} className="text-white" />
                  </div>
                </div>
              </div>

              {lightbox && (
                <div
                  className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm"
                  onClick={() => setLightbox(false)}
                >
                  <button
                    className="absolute top-4 right-4 bg-white/10 hover:bg-white/20 rounded-full p-2 transition-colors"
                    onClick={() => setLightbox(false)}
                  >
                    <X size={22} className="text-white" />
                  </button>
                  <img
                    src={url}
                    alt={asset.name}
                    className="max-w-[90vw] max-h-[90vh] object-contain rounded-xl shadow-2xl"
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
              )}
            </>
          );
        })()}
        {asset.type === 'audio' && versions.find(v => v.is_active)?.storage_url && (
          <div className="w-full bg-black/40 rounded-xl border border-white/10 p-4">
            <audio controls className="w-full h-10" src={versions.find(v => v.is_active).storage_url} />
          </div>
        )}

        <div className="flex items-center justify-between gap-4">
          <div className="flex-1 space-y-0.5">
            <p className="text-sm text-surface-300">Tipo: <span className="text-white font-medium">{asset.type}</span></p>
            <p className="text-sm text-surface-300">
              Versión actual:{' '}
              <span className="text-brand-400 font-semibold">
                v{versions.find(v => v.is_active)?.version_number ?? asset.current_version}
              </span>
            </p>
            <p className="text-sm text-surface-300">Subido por: <span className="text-white">{asset.uploader_name}</span></p>
          </div>
          {!isViewer && (
            <button
              onClick={handleUploadNewVersion}
              disabled={uploadingNewVersion}
              className="btn-secondary flex items-center gap-1.5 shrink-0 disabled:opacity-50"
            >
              {uploadingNewVersion
                ? <><Loader2 size={14} className="animate-spin" /> Subiendo…</>
                : <><Upload size={14} /> Nueva versión</>
              }
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-white/[0.03] rounded-xl p-1">
        {tabs.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all flex-1 justify-center ${
              tab === t.key ? 'bg-white/[0.08] text-white' : 'text-surface-300 hover:text-white'
            }`}
          >
            <t.icon size={15} />
            {t.label}
            {t.count > 0 && <span className="badge badge-purple ml-1">{t.count}</span>}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => <div key={i} className="skeleton h-16 rounded-xl" />)}
        </div>
      ) : tab === 'versions' ? (
        /* Versions */
        <div className="space-y-2">
          {versions.map((v) => (
            <motion.div
              key={v.id}
              className={`flex items-center gap-3 p-3 rounded-xl transition-all ${
                v.is_active ? 'bg-brand-500/10 border border-brand-500/20' : 'bg-white/[0.02] border border-white/[0.04]'
              }`}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            >
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${
                v.is_active ? 'bg-brand-500 text-white' : 'bg-white/[0.06] text-surface-300'
              }`}>
                v{v.version_number}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{v.uploader_name}</p>
                <div className="flex items-center gap-2">
                  <p className="text-xs text-surface-400">{timeAgo(v.created_at)}</p>
                  <span className="text-xs text-surface-500">•</span>
                  <p className="text-xs text-surface-400">{formatBytes(v.size_bytes)}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <a href={v.storage_url} download={`${asset.name}-v${v.version_number}`} className="btn-ghost p-1.5 text-surface-300 hover:text-white rounded-lg">
                  <Download size={14} />
                </a>
                {v.is_active ? (
                  <span className="badge badge-green"><Check size={12} /> Activa</span>
                ) : (
                  <button
                    onClick={() => restore(v.id)}
                    disabled={!!restoringId}
                    className="btn-ghost flex items-center gap-1 text-xs disabled:opacity-50"
                  >
                    {restoringId === v.id
                      ? <><Loader2 size={13} className="animate-spin" /> Restaurando…</>
                      : <><RotateCcw size={13} /> Restaurar</>
                    }
                  </button>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        /* Comments */
        <div className="space-y-4">
          {rootComments.length === 0 && (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-3"
                style={{ background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.15)' }}>
                <MessageSquare size={20} style={{ color: '#fbbf24' }} />
              </div>
              <p className="text-sm font-semibold text-surface-200 mb-1">Sé el primero en comentar</p>
              <p className="text-xs text-surface-500">Los comentarios ayudan al equipo a dar feedback</p>
            </div>
          )}

          {rootComments.map((c) => (
            <CommentNode key={c.id} comment={c} replies={getReplies(c.id)} allComments={comments}
              onReply={(id) => setReplyTo(id)} onResolve={resolveComment} isViewer={isViewer} />
          ))}

          {/* New comment form — hidden for viewer */}
          {!isViewer && (
            <form onSubmit={sendComment} className="flex gap-2 pt-2 border-t border-white/[0.06]">
              <div className="flex-1">
                {replyTo && (
                  <div className="flex items-center gap-2 text-xs text-surface-300 mb-1.5">
                    <Reply size={12} /> Respondiendo a un comentario
                    <button type="button" onClick={() => setReplyTo(null)} className="text-red-400 hover:text-red-300">✕</button>
                  </div>
                )}
                <input value={newComment} onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Escribe un comentario…" className="input-sm" />
              </div>
              <button type="submit" className="btn-primary px-3 self-end disabled:opacity-50" disabled={sendingComment}>
                {sendingComment ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}

function CommentNode({ comment: c, replies, allComments, onReply, onResolve, isViewer }) {
  const [expanded, setExpanded] = useState(true);
  const nestedReplies = (id) => allComments.filter((x) => x.parent_id === id);

  return (
    <div className={`pl-0 ${c.resolved ? 'opacity-60' : ''}`}>
      <div className="flex gap-3 group">
        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-brand-500 to-cyan-500 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
          {(c.user_name || '?')[0].toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">{c.user_name}</span>
            <span className="text-xs text-surface-400">{timeAgo(c.created_at)}</span>
            {c.resolved && <span className="badge badge-green text-[10px]"><Check size={10} /> Resuelto</span>}
          </div>
          <p className="text-sm text-surface-200 mt-0.5">{c.content}</p>
          <div className="flex gap-2 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={() => onReply(c.id)} className="text-xs text-surface-300 hover:text-brand-400 flex items-center gap-1">
              <Reply size={12} /> Responder
            </button>
            {!c.resolved && !c.parent_id && !isViewer && (
              <button onClick={() => onResolve(c.id)} className="text-xs text-surface-300 hover:text-emerald-400 flex items-center gap-1">
                <Check size={12} /> Resolver
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Nested replies */}
      {replies.length > 0 && (
        <div className="ml-10 mt-2 space-y-2 border-l border-white/[0.06] pl-4">
          {expanded && replies.map((r) => (
            <CommentNode key={r.id} comment={r} replies={nestedReplies(r.id)} allComments={allComments}
              onReply={onReply} onResolve={onResolve} isViewer={isViewer} />
          ))}
          {replies.length > 0 && (
            <button onClick={() => setExpanded(!expanded)} className="text-xs text-surface-400 hover:text-white flex items-center gap-1">
              {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              {expanded ? 'Ocultar' : `Ver ${replies.length} respuesta${replies.length > 1 ? 's' : ''}`}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
