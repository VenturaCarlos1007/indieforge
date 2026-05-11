import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Camera, Save, User, Briefcase, CheckSquare, Loader2, Lock, Eye, EyeOff } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function ProfilePage() {
  const { user: authUser, updateUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [user, setUser] = useState({ name: '', email: '', avatar_url: '' });
  const [stats, setStats] = useState({ projectsCount: 0, tasksAssignedCount: 0 });
  const [previewAvatar, setPreviewAvatar] = useState(null);
  const [message, setMessage] = useState('');
  const fileInputRef = useRef(null);

  const [pwCurrent, setPwCurrent] = useState('');
  const [pwNew, setPwNew] = useState('');
  const [pwConfirm, setPwConfirm] = useState('');
  const [pwSaving, setPwSaving] = useState(false);
  const [pwMessage, setPwMessage] = useState({ text: '', ok: true });
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const { data } = await api.get('/profile');
      setUser(data.user);
      setPreviewAvatar(data.user.avatar_url);
      setStats(data.stats);
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('La imagen no debe superar los 5MB');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewAvatar(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    try {
      const { data } = await api.put('/profile', {
        name: user.name,
        avatar_url: previewAvatar
      });
      setUser(data.user);
      updateUser(data.user);
      setMessage('Perfil actualizado exitosamente');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Error updating profile:', error);
      setMessage('Error al actualizar el perfil');
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setPwMessage({ text: '', ok: true });
    if (pwNew !== pwConfirm) {
      setPwMessage({ text: 'Las contraseñas no coinciden.', ok: false });
      return;
    }
    if (pwNew.length < 6) {
      setPwMessage({ text: 'La nueva contraseña debe tener al menos 6 caracteres.', ok: false });
      return;
    }
    setPwSaving(true);
    try {
      await api.put('/profile/password', { current_password: pwCurrent, new_password: pwNew });
      setPwMessage({ text: 'Contraseña actualizada correctamente.', ok: true });
      setPwCurrent(''); setPwNew(''); setPwConfirm('');
      setTimeout(() => setPwMessage({ text: '', ok: true }), 4000);
    } catch (err) {
      setPwMessage({ text: err.response?.data?.error || 'Error al cambiar la contraseña.', ok: false });
    } finally {
      setPwSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex items-center gap-3 mb-8">
        <div className="p-2 bg-gradient-to-br from-purple-500/20 to-cyan-500/20 rounded-xl border border-black/10 dark:border-white/10">
          <User className="w-6 h-6 text-cyan-400" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight">Mi Perfil</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Left Column - Form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="md:col-span-2 glass p-6 shadow-2xl relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none" />

          <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
            <div className="flex flex-col sm:flex-row items-center gap-6 mb-8">
              <div className="relative group">
                <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-black/10 dark:border-white/10 shadow-xl"
                  style={{ background: 'var(--avatar-inner)' }}>
                  {previewAvatar ? (
                    <img src={previewAvatar} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <User className="w-12 h-12 text-surface-400" />
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-full"
                >
                  <Camera className="w-8 h-8 text-white" />
                </button>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/*"
                  className="hidden"
                />
              </div>
              <div className="text-center sm:text-left">
                <h2 className="text-xl font-semibold">{user.name}</h2>
                <p className="text-sm text-surface-400">{user.email}</p>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="mt-3 text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
                >
                  Cambiar foto de perfil
                </button>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-surface-300 mb-1.5">
                  Nombre Completo
                </label>
                <input
                  type="text"
                  value={user.name}
                  onChange={(e) => setUser({ ...user, name: e.target.value })}
                  className="input-field"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-surface-300 mb-1.5">
                  Correo Electrónico (Solo lectura)
                </label>
                <input
                  type="email"
                  value={user.email}
                  disabled
                  className="input-field opacity-60 cursor-not-allowed"
                />
              </div>
            </div>

            <div className="pt-4 flex items-center justify-between">
              <span className={`text-sm ${message.includes('Error') ? 'text-red-400' : 'text-emerald-400'}`}>
                {message}
              </span>
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-purple-500 to-cyan-500 hover:from-purple-400 hover:to-cyan-400 text-white rounded-xl font-medium shadow-lg shadow-purple-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                Guardar Cambios
              </button>
            </div>
          </form>
        </motion.div>

        {/* Right Column - Stats */}
        <div className="space-y-6">
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="glass p-6 shadow-2xl relative overflow-hidden group"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full blur-2xl -mr-16 -mt-16 group-hover:bg-purple-500/20 transition-colors" />
            <div className="flex items-center gap-4 relative z-10">
              <div className="p-3 bg-purple-500/20 rounded-xl">
                <Briefcase className="w-6 h-6 text-purple-400" />
              </div>
              <div>
                <p className="text-sm text-surface-400">Proyectos</p>
                <p className="text-3xl font-bold">{stats.projectsCount}</p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="glass p-6 shadow-2xl relative overflow-hidden group"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/10 rounded-full blur-2xl -mr-16 -mt-16 group-hover:bg-cyan-500/20 transition-colors" />
            <div className="flex items-center gap-4 relative z-10">
              <div className="p-3 bg-cyan-500/20 rounded-xl">
                <CheckSquare className="w-6 h-6 text-cyan-400" />
              </div>
              <div>
                <p className="text-sm text-surface-400">Tareas Asignadas</p>
                <p className="text-3xl font-bold">{stats.tasksAssignedCount}</p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Password change section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="glass p-6 shadow-2xl relative overflow-hidden"
      >
        <div className="absolute top-0 left-0 w-64 h-64 bg-purple-500/5 rounded-full blur-3xl -ml-32 -mt-32 pointer-events-none" />
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-6">
            <div className="p-1.5 bg-purple-500/20 rounded-lg">
              <Lock className="w-4 h-4 text-purple-400" />
            </div>
            <h2 className="text-base font-semibold">Cambiar contraseña</h2>
          </div>

          <form onSubmit={handlePasswordChange} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-surface-300 mb-1.5">Contraseña actual</label>
              <div className="relative">
                <input
                  type={showCurrent ? 'text' : 'password'}
                  value={pwCurrent}
                  onChange={(e) => setPwCurrent(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="input-field pr-10"
                />
                <button type="button" onClick={() => setShowCurrent((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-500 hover:text-surface-300 transition-colors">
                  {showCurrent ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-surface-300 mb-1.5">Nueva contraseña</label>
              <div className="relative">
                <input
                  type={showNew ? 'text' : 'password'}
                  value={pwNew}
                  onChange={(e) => setPwNew(e.target.value)}
                  placeholder="Mín. 6 caracteres"
                  required
                  className="input-field pr-10"
                />
                <button type="button" onClick={() => setShowNew((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-500 hover:text-surface-300 transition-colors">
                  {showNew ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-surface-300 mb-1.5">Confirmar nueva contraseña</label>
              <div className="relative">
                <input
                  type={showConfirm ? 'text' : 'password'}
                  value={pwConfirm}
                  onChange={(e) => setPwConfirm(e.target.value)}
                  placeholder="Repite la contraseña"
                  required
                  className="input-field pr-10"
                />
                <button type="button" onClick={() => setShowConfirm((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-500 hover:text-surface-300 transition-colors">
                  {showConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <div className="sm:col-span-3 flex items-center justify-between pt-2">
              <span className={`text-sm ${pwMessage.ok ? 'text-emerald-400' : 'text-red-400'}`}>
                {pwMessage.text}
              </span>
              <button
                type="submit"
                disabled={pwSaving}
                className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-purple-500 to-cyan-500 hover:from-purple-400 hover:to-cyan-400 text-white rounded-xl font-medium shadow-lg shadow-purple-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {pwSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                Cambiar contraseña
              </button>
            </div>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
