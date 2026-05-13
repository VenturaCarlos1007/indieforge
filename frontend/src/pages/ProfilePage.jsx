import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Camera, User, Loader2, Lock, Eye, EyeOff,
  Pencil, MapPin, Globe, Calendar, Briefcase,
  CheckSquare, ChevronRight,
} from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/common/Modal';
import { EngineImg } from '../components/common/EngineIcons';

const ENGINES = {
  unity:  { label: 'Unity',         color: '#4CAF50' },
  unreal: { label: 'Unreal Engine', color: '#2196F3' },
  godot:  { label: 'Godot Engine',  color: '#5C6BC0' },
  roblox: { label: 'Roblox Studio', color: '#F59E0B' },
  custom: { label: 'Personalizado', color: '#7C3AED' },
};

const ENGINE_OPTIONS = [
  { value: null,     label: 'Ninguno',       color: '#6B7280' },
  { value: 'unity',  label: 'Unity',         color: '#4CAF50' },
  { value: 'unreal', label: 'Unreal Engine', color: '#2196F3' },
  { value: 'godot',  label: 'Godot Engine',  color: '#5C6BC0' },
  { value: 'roblox', label: 'Roblox Studio', color: '#F59E0B' },
  { value: 'custom', label: 'Personalizado', color: '#7C3AED' },
];

const ROLE_LABELS = { owner: 'Propietario', admin: 'Admin', member: 'Miembro', viewer: 'Observador' };
const ROLE_COLORS = { owner: '#a855f7', admin: '#22d3ee', member: '#64748b', viewer: '#94a3b8' };

function memberSince(d) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('es-AR', { month: 'long', year: 'numeric' });
}

function normalizeUrl(url) {
  if (!url) return null;
  return url.startsWith('http') ? url : `https://${url}`;
}

function displayUrl(url) {
  if (!url) return url;
  return url.replace(/^https?:\/\//, '').replace(/\/$/, '');
}

const stagger = { show: { transition: { staggerChildren: 0.06 } } };
const item    = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };

export default function ProfilePage() {
  const { updateUser } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading]   = useState(true);
  const [user, setUser]         = useState(null);
  const [stats, setStats]       = useState({ projectsCount: 0, tasksAssignedCount: 0 });
  const [projects, setProjects] = useState([]);

  // Edit modal
  const [showModal, setShowModal] = useState(false);
  const [form, setForm]           = useState({ name: '', bio: '', location: '', website: '', favorite_engine: null, avatar_url: '' });
  const [saving, setSaving]       = useState(false);
  const [saveError, setSaveError] = useState('');
  const [websiteError, setWebsiteError] = useState('');
  const fileInputRef              = useRef(null);

  // Password change
  const [pwCurrent, setPwCurrent]   = useState('');
  const [pwNew, setPwNew]           = useState('');
  const [pwConfirm, setPwConfirm]   = useState('');
  const [pwSaving, setPwSaving]     = useState(false);
  const [pwMsg, setPwMsg]           = useState({ text: '', ok: true });
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew]         = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => { fetchProfile(); }, []);

  const fetchProfile = async () => {
    try {
      const { data } = await api.get('/profile');
      setUser(data.user);
      setStats(data.stats);
      setProjects(data.projects || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const openEdit = () => {
    setForm({
      name:            user.name || '',
      bio:             user.bio || '',
      location:        user.location || '',
      website:         user.website || '',
      favorite_engine: user.favorite_engine || null,
      avatar_url:      user.avatar_url || '',
    });
    setSaveError('');
    setShowModal(true);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert('La imagen no debe superar 5 MB');
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => setForm(f => ({ ...f, avatar_url: reader.result }));
    reader.readAsDataURL(file);
  };

  const handleWebsiteBlur = () => {
    const val = form.website?.trim();
    if (val && !/^https?:\/\/.+/.test(val)) {
      setWebsiteError('Debe ser una URL válida (https://...)');
    } else {
      setWebsiteError('');
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || saving) return;
    if (form.name.trim().length < 2) { setSaveError('El nombre debe tener al menos 2 caracteres.'); return; }
    const websiteVal = form.website?.trim();
    if (websiteVal && !/^https?:\/\/.+/.test(websiteVal)) {
      setSaveError('El sitio web debe ser una URL válida (ej. https://miweb.com).');
      return;
    }
    setSaving(true);
    setSaveError('');
    try {
      const { data } = await api.patch('/profile', {
        name:            form.name.trim(),
        bio:             form.bio || null,
        favorite_engine: form.favorite_engine,
        location:        form.location || null,
        website:         form.website || null,
        avatar_url:      form.avatar_url || null,
      });
      setUser(data.user);
      updateUser(data.user);
      setShowModal(false);
    } catch (err) {
      setSaveError(err.response?.data?.error || 'Error al guardar.');
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setPwMsg({ text: '', ok: true });
    if (pwNew !== pwConfirm) { setPwMsg({ text: 'Las contraseñas no coinciden.', ok: false }); return; }
    if (pwNew.length < 6)   { setPwMsg({ text: 'Mínimo 6 caracteres.', ok: false }); return; }
    setPwSaving(true);
    try {
      await api.put('/profile/password', { current_password: pwCurrent, new_password: pwNew });
      setPwMsg({ text: 'Contraseña actualizada correctamente.', ok: true });
      setPwCurrent(''); setPwNew(''); setPwConfirm('');
      setTimeout(() => setPwMsg({ text: '', ok: true }), 4000);
    } catch (err) {
      setPwMsg({ text: err.response?.data?.error || 'Error al cambiar la contraseña.', ok: false });
    } finally { setPwSaving(false); }
  };

  if (loading) return (
    <div className="flex h-full items-center justify-center">
      <Loader2 className="w-8 h-8 text-brand-400 animate-spin" />
    </div>
  );

  const accent     = ENGINES[user?.favorite_engine]?.color || '#7C3AED';
  const engLabel   = ENGINES[user?.favorite_engine]?.label;
  const hasWebsite = normalizeUrl(user?.website);

  return (
    <motion.div className="max-w-5xl mx-auto space-y-5" variants={stagger} initial="hidden" animate="show">

      {/* ── Hero ────────────────────────────────────────────────────── */}
      <motion.div variants={item} className="glass overflow-hidden">
        {/* Banner */}
        <div className="h-28 relative"
          style={{ background: `linear-gradient(135deg, ${accent}35 0%, ${accent}12 60%, transparent 100%)` }}>
          <div className="absolute inset-0"
            style={{ background: `radial-gradient(ellipse at 25% 60%, ${accent}20, transparent 65%)` }} />
          <button onClick={openEdit}
            className="absolute top-4 right-4 flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-xl border border-white/[0.1] hover:border-white/[0.2] text-surface-300 hover:text-white bg-black/20 backdrop-blur-sm transition-all">
            <Pencil size={12} /> Editar perfil
          </button>
        </div>

        {/* Avatar + info */}
        <div className="px-6 pb-6">
          <div className="flex flex-col items-center sm:flex-row sm:items-end gap-3 sm:gap-4 -mt-10 mb-2">
            {/* Avatar */}
            <div className="relative group cursor-pointer shrink-0"
              onClick={openEdit}>
              <div className="w-20 h-20 rounded-full overflow-hidden"
                style={{ border: `3px solid ${accent}`, boxShadow: `0 0 20px ${accent}35` }}>
                {user?.avatar_url ? (
                  <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-2xl font-bold"
                    style={{ background: `${accent}25`, color: accent }}>
                    {user?.name?.[0]?.toUpperCase() || <User size={28} />}
                  </div>
                )}
              </div>
              <div className="absolute inset-0 rounded-full bg-black/55 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Camera size={18} className="text-white" />
              </div>
            </div>

            <div className="mb-1 text-center sm:text-left">
              <h1 className="text-xl font-bold text-white leading-tight">{user?.name}</h1>
              <p className="text-sm text-surface-400">{user?.email}</p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ── Info + Stats ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Info */}
        <motion.div variants={item} className="lg:col-span-2 glass p-6 space-y-5">
          {/* Bio */}
          <div>
            <p className="text-xs font-semibold text-surface-500 uppercase tracking-wider mb-1.5">Bio</p>
            <p className="text-sm text-surface-300 leading-relaxed">
              {user?.bio || <span className="italic text-surface-500">Sin bio aún</span>}
            </p>
          </div>

          {/* Meta row */}
          <div className="flex flex-wrap gap-x-5 gap-y-2">
            {user?.location && (
              <div className="flex items-center gap-1.5 text-sm text-surface-400">
                <MapPin size={13} className="text-surface-500 shrink-0" />
                <span>{user.location}</span>
              </div>
            )}
            {hasWebsite && (
              <a href={hasWebsite} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-sm text-surface-400 hover:text-white transition-colors">
                <Globe size={13} className="text-surface-500 shrink-0" />
                <span className="truncate max-w-[180px]">{displayUrl(user.website)}</span>
              </a>
            )}
            <div className="flex items-center gap-1.5 text-sm text-surface-400">
              <Calendar size={13} className="text-surface-500 shrink-0" />
              <span>Miembro desde {memberSince(user?.created_at)}</span>
            </div>
          </div>

          {/* Favorite engine */}
          {user?.favorite_engine && (
            <div>
              <p className="text-xs font-semibold text-surface-500 uppercase tracking-wider mb-2">Engine favorito</p>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border text-sm font-medium"
                style={{
                  background:   `${accent}12`,
                  borderColor:  `${accent}35`,
                  color:        accent,
                }}>
                <EngineImg engine={user.favorite_engine} size={16} />
                {engLabel}
              </div>
            </div>
          )}
        </motion.div>

        {/* Stats */}
        <div className="flex flex-row gap-4 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible">
          <motion.div variants={item} className="glass p-5 flex items-center gap-4 min-w-[150px] flex-1 lg:min-w-0"
            style={{ borderColor: '#a855f720' }}>
            <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: '#a855f718', boxShadow: '0 0 16px #a855f715' }}>
              <Briefcase size={18} style={{ color: '#a855f7' }} />
            </div>
            <div>
              <p className="text-xs text-surface-400 font-medium">Proyectos</p>
              <p className="text-3xl font-extrabold" style={{ color: '#a855f7' }}>{stats.projectsCount}</p>
            </div>
          </motion.div>

          <motion.div variants={item} className="glass p-5 flex items-center gap-4 min-w-[150px] flex-1 lg:min-w-0"
            style={{ borderColor: '#22d3ee20' }}>
            <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: '#22d3ee18', boxShadow: '0 0 16px #22d3ee15' }}>
              <CheckSquare size={18} style={{ color: '#22d3ee' }} />
            </div>
            <div>
              <p className="text-xs text-surface-400 font-medium">Tareas asignadas</p>
              <p className="text-3xl font-extrabold" style={{ color: '#22d3ee' }}>{stats.tasksAssignedCount}</p>
            </div>
          </motion.div>
        </div>
      </div>

      {/* ── Mis Proyectos ─────────────────────────────────────────────── */}
      <motion.div variants={item} className="glass p-6">
        <div className="flex items-center gap-2.5 mb-5">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: '#a855f718' }}>
            <Briefcase size={14} style={{ color: '#a855f7' }} />
          </div>
          <h2 className="font-semibold">Mis Proyectos</h2>
          <span className="text-xs text-surface-500 ml-1">· {projects.length}</span>
        </div>

        {projects.length === 0 ? (
          <p className="text-sm text-surface-500 text-center py-8">Sin proyectos aún.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {projects.map(p => {
              const eng      = ENGINES[p.engine] || ENGINES.custom;
              const rColor   = ROLE_COLORS[p.role] || '#64748b';
              return (
                <button key={p.id}
                  onClick={() => navigate(`/project/${p.id}`)}
                  className="flex items-center gap-3 p-3.5 rounded-xl border border-white/[0.05] hover:border-white/[0.1] hover:bg-white/[0.03] transition-all text-left group">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: `${eng.color}18`, border: `1px solid ${eng.color}30` }}>
                    <EngineImg engine={p.engine || 'custom'} size={20} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{p.name}</p>
                    <span className="text-[11px] font-medium" style={{ color: rColor }}>
                      {ROLE_LABELS[p.role] || p.role}
                    </span>
                  </div>
                  <ChevronRight size={14} className="text-surface-600 group-hover:text-surface-400 transition-colors shrink-0" />
                </button>
              );
            })}
          </div>
        )}
      </motion.div>

      {/* ── Cambiar contraseña ───────────────────────────────────────── */}
      <motion.div variants={item} className="glass p-6">
        <div className="flex items-center gap-2 mb-5">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: '#7C3AED18' }}>
            <Lock size={14} style={{ color: '#a855f7' }} />
          </div>
          <h2 className="font-semibold">Cambiar contraseña</h2>
        </div>

        <form onSubmit={handlePasswordChange} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { label: 'Contraseña actual',          val: pwCurrent, set: setPwCurrent, show: showCurrent, setShow: setShowCurrent },
            { label: 'Nueva contraseña',           val: pwNew,     set: setPwNew,     show: showNew,     setShow: setShowNew,     placeholder: 'Mín. 6 caracteres' },
            { label: 'Confirmar nueva contraseña', val: pwConfirm, set: setPwConfirm, show: showConfirm, setShow: setShowConfirm, placeholder: 'Repetir contraseña' },
          ].map(({ label, val, set, show, setShow, placeholder }) => (
            <div key={label}>
              <label className="text-xs font-medium text-surface-400 mb-1.5 block">{label}</label>
              <div className="relative">
                <input
                  type={show ? 'text' : 'password'}
                  value={val}
                  onChange={e => set(e.target.value)}
                  placeholder={placeholder || '••••••••'}
                  required
                  className="input-field pr-10"
                />
                <button type="button" onClick={() => setShow(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-500 hover:text-surface-300 transition-colors">
                  {show ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>
          ))}

          <div className="sm:col-span-3 flex items-center justify-between pt-1">
            <span className={`text-sm ${pwMsg.ok ? 'text-emerald-400' : 'text-red-400'}`}>{pwMsg.text}</span>
            <button type="submit" disabled={pwSaving}
              className="btn-primary flex items-center gap-2 disabled:opacity-50">
              {pwSaving ? <Loader2 size={14} className="animate-spin" /> : <Lock size={14} />}
              Cambiar contraseña
            </button>
          </div>
        </form>
      </motion.div>

      {/* ── Edit Modal ───────────────────────────────────────────────── */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title="Editar perfil">
        <form onSubmit={handleSave} className="space-y-4">

          {/* Avatar upload */}
          <div className="flex items-center gap-4">
            <div className="relative group cursor-pointer shrink-0"
              onClick={() => fileInputRef.current?.click()}>
              <div className="w-16 h-16 rounded-full overflow-hidden"
                style={{ border: `2px solid ${accent}`, boxShadow: `0 0 12px ${accent}30` }}>
                {form.avatar_url ? (
                  <img src={form.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-lg font-bold"
                    style={{ background: `${accent}20`, color: accent }}>
                    {form.name?.[0]?.toUpperCase() || <User size={20} />}
                  </div>
                )}
              </div>
              <div className="absolute inset-0 rounded-full bg-black/55 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Camera size={16} className="text-white" />
              </div>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
            </div>
            <div>
              <p className="text-xs font-medium text-white mb-1">Foto de perfil</p>
              <button type="button" onClick={() => fileInputRef.current?.click()}
                className="text-xs text-brand-400 hover:text-brand-300 transition-colors">
                Cambiar imagen
              </button>
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-surface-400 mb-1.5 block">Nombre *</label>
            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              className="input-field" required />
          </div>

          <div>
            <label className="text-xs font-medium text-surface-400 mb-1.5 block">Bio</label>
            <textarea value={form.bio} onChange={e => setForm(f => ({ ...f, bio: e.target.value }))}
              rows={3} className="input-field resize-none" placeholder="Contá algo sobre vos..." />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-surface-400 mb-1.5 block">
                <MapPin size={11} className="inline mr-1" />Ubicación
              </label>
              <input value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
                className="input-field" placeholder="Ej: Buenos Aires" />
            </div>
            <div>
              <label className="text-xs font-medium text-surface-400 mb-1.5 block">
                <Globe size={11} className="inline mr-1" />Website
              </label>
              <input
                value={form.website}
                onChange={e => { setForm(f => ({ ...f, website: e.target.value })); if (websiteError) setWebsiteError(''); }}
                onBlur={handleWebsiteBlur}
                className="input-field"
                style={websiteError ? { borderColor: '#f87171' } : {}}
                placeholder="Ej: https://mi-sitio.com"
              />
              {websiteError && <p className="text-xs text-red-400 mt-1">{websiteError}</p>}
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-surface-400 mb-2 block">Engine favorito</label>
            <div className="grid grid-cols-3 gap-2">
              {ENGINE_OPTIONS.map(({ value, label, color }) => {
                const selected = form.favorite_engine === value;
                return (
                  <button key={value ?? 'none'} type="button"
                    onClick={() => setForm(f => ({ ...f, favorite_engine: value }))}
                    className="flex flex-col items-center gap-1.5 py-2.5 px-1 rounded-xl border text-[11px] font-medium transition-all"
                    style={{
                      background:   selected ? `${color}18` : 'transparent',
                      borderColor:  selected ? `${color}40` : 'rgba(255,255,255,0.06)',
                      color:        selected ? color : '#6B7280',
                    }}>
                    {value ? (
                      <EngineImg engine={value} size={20} />
                    ) : (
                      <div className="w-5 h-5 rounded-full flex items-center justify-center text-[10px]"
                        style={{ border: `1.5px solid ${color}` }}>–</div>
                    )}
                    <span className="leading-none text-center">{label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {saveError && <p className="text-xs text-red-400">{saveError}</p>}

          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">Cancelar</button>
            <button type="submit" disabled={saving || !form.name.trim()} className="btn-primary disabled:opacity-50">
              {saving ? <><Loader2 size={14} className="animate-spin mr-1.5" />Guardando…</> : 'Guardar cambios'}
            </button>
          </div>
        </form>
      </Modal>
    </motion.div>
  );
}
