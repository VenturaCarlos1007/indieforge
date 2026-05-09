import { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useProject } from '../../components/layout/ProjectLayout';
import api from '../../services/api';
import Modal from '../../components/common/Modal';
import { SkeletonCard } from '../../components/common/Skeleton';
import AssetDetail from '../../components/assets/AssetDetail';
import {
  FolderPlus, Upload, Search, Folder, Image, Music, FileText, File, Film, Code2,
  ChevronRight, Home, X, CloudUpload
} from 'lucide-react';

const TYPE_CONFIG = {
  image:    { icon: Image,    color: '#f472b6', bg: '#f472b615', border: '#f472b620', label: 'Imagen' },
  audio:    { icon: Music,    color: '#34d399', bg: '#34d39915', border: '#34d39920', label: 'Audio' },
  document: { icon: FileText, color: '#60a5fa', bg: '#60a5fa15', border: '#60a5fa20', label: 'Doc' },
  video:    { icon: Film,     color: '#c084fc', bg: '#c084fc15', border: '#c084fc20', label: 'Video' },
  model:    { icon: Code2,    color: '#fb923c', bg: '#fb923c15', border: '#fb923c20', label: '3D' },
  other:    { icon: File,     color: '#94a3b8', bg: '#94a3b815', border: '#94a3b820', label: 'Otro' },
};

function fileTypeFromName(name) {
  const ext = name.split('.').pop().toLowerCase();
  if (['png','jpg','jpeg','gif','svg','webp','bmp'].includes(ext)) return 'image';
  if (['mp3','wav','ogg','flac','aac'].includes(ext)) return 'audio';
  if (['mp4','mov','avi','mkv','webm'].includes(ext)) return 'video';
  if (['pdf','doc','docx','txt','md'].includes(ext)) return 'document';
  if (['fbx','obj','gltf','glb','blend'].includes(ext)) return 'model';
  return 'other';
}

export default function AssetsPage() {
  const { projectId, role } = useProject();
  const isViewer = role === 'viewer';
  const location = useLocation();
  const navigate = useNavigate();
  const [folders, setFolders] = useState([]);
  const [assets, setAssets] = useState([]);
  const [path, setPath] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [folderNameError, setFolderNameError] = useState('');
  const [conflictQueue, setConflictQueue] = useState([]);
  const [uploadingVersion, setUploadingVersion] = useState(false);

  const currentFolderId = path.length > 0 ? path[path.length - 1].id : null;

  const loadContent = useCallback(async () => {
    setLoading(true);
    try {
      const q = encodeURIComponent(search);
      let folderPromise, assetPromise;

      if (search) {
        if (currentFolderId) {
          // Searching inside a folder: assets within this folder only, no folders
          folderPromise = Promise.resolve({ data: { folders: [] } });
          assetPromise = api.get(`/assets?project_id=${projectId}&folder_id=${currentFolderId}&search=${q}`);
        } else {
          // Searching from root: project-wide assets + all matching folders
          folderPromise = api.get(`/folders?project_id=${projectId}&search=${q}`);
          assetPromise = api.get(`/assets?project_id=${projectId}&search=${q}`);
        }
      } else {
        // Normal browsing: show current directory contents
        folderPromise = api.get(`/folders?project_id=${projectId}${currentFolderId ? `&parent_id=${currentFolderId}` : ''}`);
        assetPromise = api.get(`/assets?project_id=${projectId}&folder_id=${currentFolderId || 'root'}`);
      }

      const [fRes, aRes] = await Promise.all([folderPromise, assetPromise]);
      setFolders(fRes.data.folders);
      setAssets(aRes.data.assets);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [projectId, currentFolderId, search]);

  useEffect(() => { loadContent(); }, [loadContent]);

  // Open a specific asset when navigating here from a notification
  useEffect(() => {
    const assetId = location.state?.openAssetId;
    if (!assetId) return;
    api.get(`/assets/${assetId}`)
      .then(({ data }) => setSelectedAsset(data.asset))
      .catch(console.error);
    // Clear state so navigating back here later doesn't re-open the modal
    navigate(location.pathname, { replace: true, state: null });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const createFolder = async (e) => {
    e.preventDefault();
    if (!newFolderName.trim() || creatingFolder) return;
    const trimmedName = newFolderName.trim();
    if (folders.some(f => f.name.toLowerCase() === trimmedName.toLowerCase())) {
      setFolderNameError('Ya existe una carpeta con ese nombre aquí');
      return;
    }
    setCreatingFolder(true);
    try {
      await api.post('/folders', { project_id: projectId, parent_id: currentFolderId, name: trimmedName });
      setNewFolderName('');
      setFolderNameError('');
      setShowNewFolder(false);
      loadContent();
    } finally {
      setCreatingFolder(false);
    }
  };

  const openFolder = (folder) => { setPath([...path, folder]); setSearch(''); };
  const goToPath = (index) => { setPath(path.slice(0, index + 1)); setSearch(''); };
  const goHome = () => { setPath([]); setSearch(''); };

  const uploadFile = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        await api.post('/assets', {
          project_id: projectId, folder_id: currentFolderId,
          name: file.name, type: fileTypeFromName(file.name), storage_url: reader.result,
        });
        resolve();
      } catch (err) { reject(err); }
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  const handleVersionConfirm = async () => {
    if (uploadingVersion) return;
    setUploadingVersion(true);
    const [file, ...rest] = conflictQueue;
    try {
      await uploadFile(file);
      loadContent();
      setConflictQueue(rest);
    } finally {
      setUploadingVersion(false);
    }
  };

  const handleVersionCancel = () => setConflictQueue(prev => prev.slice(1));

  const handleDrop = async (e) => {
    e.preventDefault();
    setDragging(false);
    const files = Array.from(e.dataTransfer.files);
    const conflicts = [];
    const direct = [];
    for (const file of files) {
      if (assets.some(a => a.name.toLowerCase() === file.name.toLowerCase())) {
        conflicts.push(file);
      } else {
        direct.push(file);
      }
    }
    for (const file of direct) {
      await uploadFile(file);
    }
    if (direct.length > 0) loadContent();
    if (conflicts.length > 0) setConflictQueue(conflicts);
  };

  const handleUploadClick = () => {
    const input = document.createElement('input');
    input.type = 'file'; input.multiple = true;
    input.onchange = (e) => {
      const dt = new DataTransfer();
      Array.from(e.target.files).forEach((f) => dt.items.add(f));
      handleDrop({ preventDefault: () => {}, dataTransfer: dt });
    };
    input.click();
  };

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-xl font-bold">Assets</h1>
        <div className="flex gap-2">
          <div className="relative flex-1 sm:w-64">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar assets…" className="input-sm pl-9" />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-surface-400 hover:text-white"><X size={14} /></button>
            )}
          </div>
          {!isViewer && (
            <>
              <button onClick={() => setShowNewFolder(true)} className="btn-secondary flex items-center gap-1.5">
                <FolderPlus size={15} /> Carpeta
              </button>
              <button onClick={handleUploadClick} className="btn-primary flex items-center gap-1.5">
                <Upload size={15} /> Subir
              </button>
            </>
          )}
        </div>
      </div>

      {/* Breadcrumb */}
      {!search && (
        <div className="flex items-center gap-1.5 text-sm">
          <button onClick={goHome} className="text-surface-400 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/[0.04]"><Home size={14} /></button>
          {path.map((f, i) => (
            <span key={f.id} className="flex items-center gap-1.5">
              <ChevronRight size={13} className="text-surface-500" />
              <button onClick={() => goToPath(i)} className="text-surface-300 hover:text-white transition-colors truncate max-w-[120px] text-sm">{f.name}</button>
            </span>
          ))}
        </div>
      )}

      {/* Drop zone */}
      <div
        className={`relative min-h-[350px] rounded-2xl transition-all duration-400 ${dragging ? 'dash-border-animated' : ''}`}
        style={{
          border: dragging ? undefined : '2px dashed transparent',
          background: dragging ? 'rgba(124,58,237,0.03)' : 'transparent',
        }}
        onDragOver={isViewer ? undefined : (e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={isViewer ? undefined : () => setDragging(false)}
        onDrop={isViewer ? undefined : handleDrop}
      >
        {/* Drag overlay */}
        <AnimatePresence>
          {dragging && (
            <motion.div className="absolute inset-0 flex flex-col items-center justify-center z-10 pointer-events-none rounded-2xl"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              style={{ background: 'rgba(124,58,237,0.06)', backdropFilter: 'blur(4px)' }}>
              <motion.div animate={{ y: [0, -8, 0] }} transition={{ repeat: Infinity, duration: 1.5, ease: 'easeInOut' }}>
                <CloudUpload size={48} style={{ color: '#7C3AED' }} />
              </motion.div>
              <p className="text-brand-400 font-semibold mt-3">Suelta los archivos aquí</p>
            </motion.div>
          )}
        </AnimatePresence>

        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {[...Array(8)].map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : (
          <>
            {folders.length === 0 && assets.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 text-surface-400">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
                  style={{ background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.12)' }}>
                  <CloudUpload size={28} className="text-brand-500" />
                </div>
                <p className="text-sm font-medium text-surface-300">Esta carpeta está vacía</p>
                <p className="text-xs mt-1">Arrastra archivos aquí o usa el botón Subir</p>
              </div>
            )}

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              <AnimatePresence>
                {/* Folders */}
                {folders.map((f) => (
                  <motion.button key={`f-${f.id}`} onClick={() => openFolder(f)}
                    className="glass-sm p-4 text-left group" whileHover={{ y: -3, boxShadow: '0 8px 30px rgba(251,191,36,0.08)' }}
                    initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}>
                    <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform"
                      style={{ background: 'rgba(251,191,36,0.1)', boxShadow: '0 0 15px rgba(251,191,36,0.06)' }}>
                      <Folder size={22} style={{ color: '#fbbf24' }} />
                    </div>
                    <p className="text-sm font-medium truncate group-hover:text-amber-300 transition-colors">{f.name}</p>
                    <p className="text-[10px] text-surface-500 mt-0.5">Carpeta</p>
                  </motion.button>
                ))}

                {/* Assets */}
                {assets.map((a) => {
                  const cfg = TYPE_CONFIG[a.type] || TYPE_CONFIG.other;
                  const AssetIcon = cfg.icon;
                  const isImage = a.type === 'image';
                  return (
                    <motion.button key={`a-${a.id}`} onClick={() => setSelectedAsset(a)}
                      className="glass-sm p-4 text-left group overflow-hidden"
                      whileHover={{ y: -3, boxShadow: `0 8px 30px ${cfg.color}10` }}
                      initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}>
                      {/* Image preview or icon */}
                      {isImage ? (
                        <div className="w-full h-28 rounded-xl mb-3 overflow-hidden relative"
                          style={{ background: `linear-gradient(135deg, ${cfg.bg}, rgba(0,0,0,0.3))`, border: `1px solid ${cfg.border}` }}>
                          {a.active_storage_url ? (
                            <img src={a.active_storage_url} alt={a.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <AssetIcon size={32} style={{ color: cfg.color, opacity: 0.4 }} />
                            </div>
                          )}
                          <div className="absolute top-2 right-2">
                            <span className="badge" style={{ background: cfg.bg, color: cfg.color, fontSize: '9px' }}>{cfg.label}</span>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-11 h-11 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform"
                            style={{ background: cfg.bg, boxShadow: `0 0 15px ${cfg.color}08` }}>
                            <AssetIcon size={20} style={{ color: cfg.color }} />
                          </div>
                          <span className="badge" style={{ background: cfg.bg, color: cfg.color, fontSize: '9px' }}>{cfg.label}</span>
                        </div>
                      )}
                      <p className="text-sm font-medium truncate">{a.name}</p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded"
                          style={{ background: 'rgba(124,58,237,0.1)', color: '#c084fc' }}>v{a.current_version}</span>
                        <span className="text-[10px] text-surface-500 truncate">{a.uploader_name}</span>
                      </div>
                    </motion.button>
                  );
                })}
              </AnimatePresence>
            </div>
          </>
        )}
      </div>

      <Modal open={showNewFolder} onClose={() => { setShowNewFolder(false); setFolderNameError(''); }} title="Nueva carpeta">
        <form onSubmit={createFolder} className="space-y-4">
          <div>
            <input
              value={newFolderName}
              onChange={(e) => { setNewFolderName(e.target.value); setFolderNameError(''); }}
              placeholder="Nombre de la carpeta"
              className="input-field"
              autoFocus required
            />
            {folderNameError && <p className="text-xs text-red-400 mt-1">{folderNameError}</p>}
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => { setShowNewFolder(false); setFolderNameError(''); }} className="btn-secondary">Cancelar</button>
            <button type="submit" className="btn-primary" disabled={creatingFolder}>
              {creatingFolder ? 'Creando…' : 'Crear'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal open={!!selectedAsset} onClose={() => setSelectedAsset(null)} title={selectedAsset?.name} wide>
        {selectedAsset && <AssetDetail asset={selectedAsset} onUpdate={loadContent} />}
      </Modal>

      <Modal open={conflictQueue.length > 0} onClose={handleVersionCancel} title="Asset duplicado">
        <div className="space-y-4">
          <p className="text-sm text-surface-300">
            Ya existe un asset con el nombre{' '}
            <span className="font-semibold text-white">"{conflictQueue[0]?.name}"</span>.
            ¿Deseas subir una nueva versión?
          </p>
          {conflictQueue.length > 1 && (
            <p className="text-xs text-surface-500">
              {conflictQueue.length - 1} archivo{conflictQueue.length - 1 > 1 ? 's' : ''} más en cola.
            </p>
          )}
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={handleVersionCancel} className="btn-secondary">Cancelar</button>
            <button type="button" onClick={handleVersionConfirm} disabled={uploadingVersion} className="btn-primary disabled:opacity-50">
              {uploadingVersion ? 'Subiendo…' : 'Subir como nueva versión'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
