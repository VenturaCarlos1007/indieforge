import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Loader2, X, FolderKanban, CheckSquare, Image as ImageIcon, User, ArrowRight } from 'lucide-react';
import api from '../../services/api';

export default function GlobalSearchModal({ isOpen, onClose }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      setQuery('');
      setResults([]);
    }
  }, [isOpen]);

  useEffect(() => {
    if (query.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const { data } = await api.get(`/search?q=${encodeURIComponent(query)}`);
        setResults(data.results);
      } catch (error) {
        console.error('Search error:', error);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  const handleResultClick = (item) => {
    onClose();
    if (item.type === 'project') navigate(`/project/${item.id}`);
    else if (item.type === 'task') navigate(`/project/${item.project_id}/kanban`);
    else if (item.type === 'asset') navigate(`/project/${item.project_id}/assets`);
    // member has no specific page yet, could be profile view
  };

  const getIcon = (type) => {
    switch(type) {
      case 'project': return <FolderKanban className="w-5 h-5 text-purple-400" />;
      case 'task': return <CheckSquare className="w-5 h-5 text-cyan-400" />;
      case 'asset': return <ImageIcon className="w-5 h-5 text-amber-400" />;
      case 'member': return <User className="w-5 h-5 text-emerald-400" />;
      default: return <Search className="w-5 h-5" />;
    }
  };

  const getBadgeColor = (type) => {
    switch(type) {
      case 'project': return 'bg-purple-400/10 text-purple-400 border-purple-400/20';
      case 'task': return 'bg-cyan-400/10 text-cyan-400 border-cyan-400/20';
      case 'asset': return 'bg-amber-400/10 text-amber-400 border-amber-400/20';
      case 'member': return 'bg-emerald-400/10 text-emerald-400 border-emerald-400/20';
      default: return 'bg-gray-400/10 text-gray-400 border-gray-400/20';
    }
  };

  const getLabel = (type) => {
    switch(type) {
      case 'project': return 'Proyecto';
      case 'task': return 'Tarea';
      case 'asset': return 'Asset';
      case 'member': return 'Miembro';
      default: return 'Recurso';
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[10vh] px-4">
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        />
        
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: -20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -20 }}
          className="relative w-full max-w-2xl bg-gray-900/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
        >
          {/* Input Header */}
          <div className="flex items-center gap-3 px-4 py-4 border-b border-white/10 bg-white/5 relative z-10">
            <Search className="w-6 h-6 text-cyan-400 flex-shrink-0" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar en IndieForge..."
              className="flex-1 bg-transparent text-xl text-white placeholder-white/30 outline-none"
            />
            {loading && <Loader2 className="w-5 h-5 text-cyan-400 animate-spin flex-shrink-0" />}
            <button
              onClick={onClose}
              className="p-1 rounded-lg hover:bg-white/10 text-white/50 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Results Area */}
          <div className="flex-1 overflow-y-auto p-2 scrollbar-thin scrollbar-thumb-white/10">
            {query.length > 0 && query.length < 2 ? (
              <div className="p-6 text-center text-white/40">Ingresa al menos 2 caracteres...</div>
            ) : query.length >= 2 && results.length === 0 && !loading ? (
              <div className="p-10 text-center text-white/40">
                <Search className="w-12 h-12 mx-auto mb-3 opacity-20" />
                No se encontraron resultados para "{query}"
              </div>
            ) : (
              <div className="space-y-1">
                {results.map((item, idx) => (
                  <button
                    key={`${item.type}-${item.id}-${idx}`}
                    onClick={() => handleResultClick(item)}
                    className="w-full text-left flex items-center gap-4 p-3 rounded-xl hover:bg-white/5 transition-colors group"
                  >
                    <div className="p-2.5 rounded-lg bg-white/5 group-hover:bg-white/10 transition-colors">
                      {getIcon(item.type)}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-sm font-medium text-white truncate">{item.title}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded border ${getBadgeColor(item.type)}`}>
                          {getLabel(item.type)}
                        </span>
                      </div>
                      <p className="text-xs text-white/40 truncate">{item.subtitle || 'Sin descripción'}</p>
                    </div>

                    <ArrowRight className="w-4 h-4 text-white/20 group-hover:text-cyan-400 group-hover:translate-x-1 transition-all" />
                  </button>
                ))}
              </div>
            )}
            
            {!query && (
              <div className="p-6 text-center text-white/30 text-sm">
                Empieza a escribir para buscar proyectos, tareas, assets o miembros...
              </div>
            )}
          </div>
          
          <div className="p-3 border-t border-white/5 bg-black/40 text-[10px] text-white/30 flex justify-end">
            Presiona <kbd className="mx-1 px-1.5 rounded bg-white/10 border border-white/20">ESC</kbd> para cerrar
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
