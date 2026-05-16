import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { useProject } from '../../components/layout/ProjectLayout';
import { Activity, CheckCircle, Target, TrendingUp } from 'lucide-react';
import api from '../../services/api';
import { SkeletonStats } from '../../components/common/Skeleton';

const stagger = { show: { transition: { staggerChildren: 0.1 } } };
const item = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } };

const COLORS = ['#06b6d4', '#f59e0b', '#1E90FF', '#FF6B00', '#f43f5e'];

export default function ProjectStatsPage() {
  const { projectId, project } = useProject();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const { data } = await api.get(`/projects/${projectId}/stats`);
        setStats(data);
      } catch (error) {
        console.error('Error fetching stats:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, [projectId]);

  if (loading) return <SkeletonStats />;

  if (!stats) return null;

  return (
    <motion.div className="max-w-6xl mx-auto" variants={stagger} initial="hidden" animate="show">
      <motion.div variants={item} className="mb-8">
        <h1 className="text-2xl font-bold text-white mb-2">Estadísticas del Proyecto</h1>
        <p className="text-surface-400">Analiza el progreso y la actividad de {project.name}</p>
      </motion.div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
        <motion.div variants={item} className="glass p-5 rounded-2xl relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 to-transparent" />
          <div className="relative z-10 flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400 group-hover:scale-110 transition-transform">
              <Activity size={20} />
            </div>
            <div>
              <p className="text-xs text-surface-400 mb-1">Asset más activo</p>
              <p className="text-lg font-semibold text-white">{stats.metrics.mostActiveAsset || 'N/A'}</p>
            </div>
          </div>
        </motion.div>

        <motion.div variants={item} className="glass p-5 rounded-2xl relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent" />
          <div className="relative z-10 flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform">
              <CheckCircle size={20} />
            </div>
            <div>
              <p className="text-xs text-surface-400 mb-1">Miembro productivo</p>
              <p className="text-lg font-semibold text-white">{stats.metrics.mostProductiveMember || 'N/A'}</p>
            </div>
          </div>
        </motion.div>

        <motion.div variants={item} className="glass p-5 rounded-2xl relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-rose-500/5 to-transparent" />
          <div className="relative z-10 flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 group-hover:scale-110 transition-transform">
              <Target size={20} />
            </div>
            <div>
              <p className="text-xs text-surface-400 mb-1">Tarea pendiente antigua</p>
              <p className="text-sm font-medium text-white truncate max-w-[150px]">
                {stats.metrics.oldestPendingTask?.title || 'N/A'}
              </p>
              {stats.metrics.oldestPendingTask && (
                <p className="text-[10px] text-rose-400 mt-0.5">Hace {stats.metrics.oldestPendingTask.days} días</p>
              )}
            </div>
          </div>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Activity Line Chart */}
        <motion.div variants={item} className="glass p-6 rounded-2xl lg:col-span-2">
          <div className="flex items-center gap-2 mb-6">
            <TrendingUp size={18} className="text-cyan-400" />
            <h2 className="text-sm font-semibold text-white">Actividad del proyecto (30 días)</h2>
          </div>
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={stats.activityByDay}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                <XAxis dataKey="name" stroke="#ffffff40" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#ffffff40" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#ffffff20', borderRadius: '12px' }}
                  itemStyle={{ color: '#22d3ee' }}
                />
                <Line type="monotone" dataKey="Actividad" stroke="#22d3ee" strokeWidth={3} dot={{ r: 4, fill: '#0f172a', strokeWidth: 2 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Tasks Completed Bar Chart */}
        <motion.div variants={item} className="glass p-6 rounded-2xl">
          <h2 className="text-sm font-semibold text-white mb-6">Tareas completadas (6 semanas)</h2>
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.tasksCompletedByWeek}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                <XAxis dataKey="name" stroke="#ffffff40" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#ffffff40" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip 
                  cursor={{ fill: '#ffffff05' }}
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#ffffff20', borderRadius: '12px' }}
                  itemStyle={{ color: '#FF6B00' }}
                />
                <Bar dataKey="Completadas" fill="url(#colorPurple)" radius={[4, 4, 0, 0]} />
                <defs>
                  <linearGradient id="colorPurple" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#FF6B00" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#FF6B00" stopOpacity={0.2}/>
                  </linearGradient>
                </defs>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Tasks by Status Pie Chart */}
        <motion.div variants={item} className="glass p-6 rounded-2xl">
          <h2 className="text-sm font-semibold text-white mb-6">Distribución de Tareas</h2>
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={stats.tasksByStatus}
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {stats.tasksByStatus.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#ffffff20', borderRadius: '12px', color: '#fff' }}
                  itemStyle={{ color: '#fff' }}
                />
                <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '12px', color: '#ffffff80' }}/>
              </PieChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
