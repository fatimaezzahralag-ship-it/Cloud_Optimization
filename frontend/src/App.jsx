import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, BrainCircuit, HardDrive, BarChart3,
  TrendingDown, Settings, Bell, Zap, Cpu, Activity, MessageSquare, ShieldCheck
} from 'lucide-react';
import { AreaChart, Area, XAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

// --- CONFIGURATION ---
const API_BASE = "http://127.0.0.1:8000/api";
const PROVIDER_COLORS = ['#39FF14', '#7DD3FC', '#F9A8D4', '#FACC15', '#FB7185'];

const SystemHealthRadar = () => (
  <div className="flex items-center space-x-6 px-4 py-2 bg-white/5 rounded-2xl border border-white/10 backdrop-blur-md">
    <div className="relative w-10 h-10 flex items-center justify-center">
      <div className="absolute inset-0 border-2 border-neon-green/10 rounded-full" />
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
        className="absolute inset-0 border-t-2 border-neon-green rounded-full shadow-[0_0_15px_rgba(57,255,20,0.4)]"
      />
      <Activity size={14} className="text-neon-green animate-pulse" />
    </div>
    <div className="flex space-x-4">
      <div className="flex flex-col">
        <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Latency</span>
        <span className="text-xs font-mono text-neon-green">24ms</span>
      </div>
      <div className="w-px h-8 bg-white/10" />
      <div className="flex flex-col">
        <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Uptime</span>
        <span className="text-xs font-mono text-white">99.9%</span>
      </div>
    </div>
  </div>
);

const SidebarItem = ({ icon: Icon, label, active, onClick }) => (
  <motion.div
    whileHover={{ x: 5 }}
    onClick={onClick}
    className={`flex items-center space-x-4 p-3 rounded-xl cursor-pointer transition-all ${
      active ? 'bg-neon-green/10 text-neon-green shadow-[0_0_15px_rgba(57,255,20,0.1)]' : 'text-gray-400 hover:text-white'
    }`}
  >
    <Icon size={20} />
    <span className="font-medium">{label}</span>
  </motion.div>
);

const StatCard = ({ title, value, change, icon: Icon }) => (
  <motion.div whileHover={{ y: -5 }} className="bg-card border border-white/5 p-5 rounded-2xl">
    <div className="flex justify-between mb-4">
      <div className="p-2 bg-white/5 rounded-lg"><Icon className="text-neon-green" size={20} /></div>
      <span className="text-xs text-neon-green font-mono">{change}</span>
    </div>
    <h3 className="text-gray-400 text-sm">{title}</h3>
    <p className="text-2xl font-bold text-white">{value}</p>
  </motion.div>
);

const ResourcesPage = ({ resources, agentDecisions, onExecute }) => (
  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
    {resources.map(res => {
      const decision = agentDecisions.find(d => d.resource_id === res.id);
      return (
        <div key={res.id} className={`p-6 rounded-2xl border transition-all ${decision ? 'border-neon-green/40 bg-neon-green/5 shadow-[0_0_20px_rgba(57,255,20,0.05)]' : 'border-white/5 bg-card'}`}>
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <div className={`p-3 rounded-xl ${res.status === 'running' ? 'bg-neon-green/10' : 'bg-gray-800'}`}>
                <Cpu className={res.status === 'running' ? 'text-neon-green' : 'text-gray-500'} size={24} />
              </div>
              <div>
                <h3 className="text-white font-bold text-lg flex items-center gap-2">
                  {res.name}
                  <span className="text-[10px] text-gray-500 border border-gray-700 px-1.5 rounded uppercase font-mono">{res.provider}</span>
                </h3>
                <div className="flex gap-4 mt-1 text-xs font-mono text-gray-400">
                  <span>CPU: <b className={res.cpu_usage_percent < 5 ? 'text-orange-400' : 'text-white'}>{res.cpu_usage_percent}%</b></span>
                  <span>IDLE: {res.idle_hours}h</span>
                  <span>COST: ${res.cost_per_hour}/h</span>
                </div>
              </div>
            </div>
            {decision ? (
              <div className="flex items-center gap-6">
                <div className="text-right">
                  <span className="text-[9px] bg-neon-green text-black px-1.5 py-0.5 rounded font-black uppercase tracking-tighter">AI Suggestion</span>
                  <p className="text-neon-green font-bold text-sm uppercase">{decision.action}</p>
                </div>
                <button
                  onClick={() => onExecute(res.id, decision.action)}
                  className="bg-neon-green hover:bg-white text-black p-3 rounded-xl transition-all hover:scale-110 active:scale-95 shadow-[0_0_15px_rgba(57,255,20,0.3)]"
                >
                  <Zap size={20} fill="currentColor" />
                </button>
              </div>
            ) : (
              <div className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${res.status === 'running' ? 'bg-neon-green/10 text-neon-green' : 'bg-white/5 text-gray-600'}`}>
                {res.status}
              </div>
            )}
          </div>
        </div>
      );
    })}
  </motion.div>
);

const AnalyticsPage = ({ analytics, loading, hasAuditRun }) => {
  const savingsProjection = analytics?.savings_projection ?? [];
  const cloudDistribution = (analytics?.cloud_distribution ?? []).map((item, index) => ({
    ...item,
    color: PROVIDER_COLORS[index % PROVIDER_COLORS.length],
  }));

  return (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
    <div className="bg-card p-6 rounded-3xl border border-white/5">
      <h3 className="text-neon-green mb-4 font-bold uppercase text-xs">7-Day Savings Projection</h3>
      <div className="text-4xl font-bold text-white mb-2">
        ${hasAuditRun ? Number(analytics?.summary?.projected_monthly_savings ?? 0).toFixed(2) : '0.00'}
      </div>
      <p className="text-gray-500 text-sm italic mb-6">
        {hasAuditRun
          ? "Estimation calculee apres lancement de l'audit IQ."
          : "Lance RUN IQ AUDIT pour generer les recommandations et la projection."}
      </p>
      <div className="h-40 w-full">
        {!hasAuditRun ? (
          <div className="h-full flex items-center justify-center text-sm text-gray-500">Aucun audit lance pour le moment.</div>
        ) : loading ? (
          <div className="h-full flex items-center justify-center text-sm text-gray-500">Chargement analytics...</div>
        ) : savingsProjection.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={savingsProjection}>
              <defs>
                <linearGradient id="analyticsSavings" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#39FF14" stopOpacity={0.25}/>
                  <stop offset="95%" stopColor="#39FF14" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <XAxis dataKey="label" stroke="#4B5563" fontSize={11} tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{ backgroundColor: '#050505', border: 'none', borderRadius: '12px' }}
                formatter={(value) => [`$${Number(value).toFixed(2)}`, 'Savings']}
              />
              <Area type="monotone" dataKey="value" stroke="#39FF14" strokeWidth={2} fill="url(#analyticsSavings)" />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full flex items-center justify-center text-sm text-gray-500">Aucune opportunite detectee pour le moment.</div>
        )}
      </div>
    </div>

    <div className="bg-card p-6 rounded-3xl border border-white/5">
      <h3 className="text-neon-green mb-4 font-bold uppercase text-xs">Cloud Cost Distribution</h3>
      <div className="flex items-center justify-between gap-6">
        <div className="h-40 w-40 shrink-0">
          {loading ? (
            <div className="h-full flex items-center justify-center text-sm text-gray-500">...</div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={cloudDistribution}
                  dataKey="value"
                  innerRadius={42}
                  outerRadius={62}
                  paddingAngle={4}
                  stroke="none"
                >
                  {cloudDistribution.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
        <div className="space-y-3 flex-1">
          {cloudDistribution.map((provider) => (
            <div key={provider.name} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-3">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: provider.color }} />
                <span className="text-gray-300">{provider.name}</span>
              </div>
              <div className="text-right">
                <div className="text-white font-semibold">{provider.value}%</div>
                <div className="text-[11px] text-gray-500">${Number(provider.monthly_cost ?? 0).toFixed(2)}/mo</div>
              </div>
            </div>
          ))}
          {!loading && cloudDistribution.length === 0 && (
            <div className="text-sm text-gray-500">Aucune ressource active pour calculer la repartition.</div>
          )}
        </div>
      </div>
    </div>
  </div>
  );
};

const SettingsPage = () => (
  <div className="max-w-2xl space-y-6">
    <div className="p-6 bg-card rounded-3xl border border-white/5 flex justify-between items-center gap-4">
      <div className="flex items-start gap-4">
        <div className="p-3 rounded-2xl bg-neon-green/10 border border-neon-green/20">
          <ShieldCheck className="text-neon-green" size={20} />
        </div>
        <div>
          <h3 className="text-white font-bold">Auto-Pilot Mode</h3>
          <p className="text-gray-500 text-sm">L'IA execute les actions sans confirmation manuelle.</p>
        </div>
      </div>
      <div className="w-12 h-6 bg-neon-green/20 rounded-full relative shrink-0">
        <div className="absolute right-1 top-1 w-4 h-4 bg-neon-green rounded-full shadow-[0_0_8px_#39FF14]" />
      </div>
    </div>

    <div className="p-6 bg-card rounded-3xl border border-white/5">
      <div className="flex items-start gap-4">
        <div className="p-3 rounded-2xl bg-white/5 border border-white/10">
          <MessageSquare className="text-neon-green" size={20} />
        </div>
        <div>
          <h3 className="text-white font-bold mb-2">WhatsApp Notifications</h3>
          <p className="text-neon-green font-mono text-xs mb-2">+212 6XX-XXXXXX (Connecte via n8n)</p>
          <p className="text-gray-500 text-sm">Resume des alertes FinOps, audits IQ et suggestions d'optimisation.</p>
        </div>
      </div>
    </div>
  </div>
);

export default function App() {
  const [activePage, setActivePage] = useState('Overview');
  const [resources, setResources] = useState([]);
  const [agentDecisions, setAgentDecisions] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);
  const [hasAuditRun, setHasAuditRun] = useState(false);
  const [status, setStatus] = useState('idle');

  const fetchResources = async () => {
    try {
      const res = await fetch(`${API_BASE}/resources`);
      const data = await res.json();
      setResources(data);
    } catch (e) { console.error("Backend offline"); }
  };

  const fetchAnalytics = async () => {
    try {
      setAnalyticsLoading(true);
      const res = await fetch(`${API_BASE}/analytics/overview`);
      const data = await res.json();
      setAnalytics(data);
    } catch (e) {
      console.error("Analytics unavailable");
    } finally {
      setAnalyticsLoading(false);
    }
  };

  useEffect(() => {
    fetchResources();
    const interval = setInterval(() => {
      fetchResources();
      if (hasAuditRun) {
        fetchAnalytics();
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [hasAuditRun]);

  const handleIQOptimization = async () => {
    setStatus('optimizing');
    try {
      const res = await fetch(`${API_BASE}/agent/analyze`, { method: 'POST' });
      const data = await res.json();
      if (data.status === 'success') {
        setAgentDecisions(data.agent_decisions);
        setHasAuditRun(true);
        fetchAnalytics();
        setStatus('success');
        setTimeout(() => setStatus('idle'), 4000);
      }
    } catch (e) { setStatus('idle'); }
  };

  const onExecute = async (id, action) => {
    try {
      await fetch(`${API_BASE}/agent/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resource_id: id, action: action })
      });
      fetchResources();
      if (hasAuditRun) {
        fetchAnalytics();
      }
      setAgentDecisions(prev => prev.filter(d => d.resource_id !== id));
    } catch (e) { console.error("Action failed"); }
  };

  const totalWaste = agentDecisions.reduce((acc, curr) => acc + (curr.estimated_savings_monthly || 0), 0);
  const runningResources = resources.filter((resource) => resource.status === 'running');
  const projectedMonthlyCost = runningResources.reduce((sum, resource) => sum + (Number(resource.cost_per_hour) * 24 * 30), 0);
  const averageCpuUsage = runningResources.length
    ? runningResources.reduce((sum, resource) => sum + Number(resource.cpu_usage_percent), 0) / runningResources.length
    : 0;
  const projectedMonthlySavings = hasAuditRun ? totalWaste : 0;
  const optimizationCandidates = hasAuditRun ? agentDecisions.length : 0;
  const generatedAt = analytics?.summary?.generated_at
    ? new Date(analytics.summary.generated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : null;

  return (
    <div className="relative min-h-screen bg-background text-gray-200 flex font-sans overflow-hidden">
      <div
        className="absolute inset-0 z-0 bg-cover bg-center"
        style={{ backgroundImage: "url('/image_90b294.jpe.jpeg')" }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-black/95 via-black/60 to-black/90" />
      </div>

      <aside className="relative z-10 w-64 border-r border-white/5 flex flex-col p-6 space-y-8 bg-black/50 backdrop-blur-xl shrink-0">
        <div className="flex items-center space-x-2 px-2">
          <div className="w-8 h-8 bg-neon-green rounded-lg flex items-center justify-center">
            <Zap className="text-black" size={20} fill="black" />
          </div>
          <span className="text-xl font-bold tracking-tighter text-white uppercase italic">CloudIQ</span>
        </div>
        <nav className="flex-1 space-y-2">
          <SidebarItem icon={LayoutDashboard} label="Overview" active={activePage === 'Overview'} onClick={() => setActivePage('Overview')} />
          <SidebarItem icon={HardDrive} label="Resources" active={activePage === 'Resources'} onClick={() => setActivePage('Resources')} />
          <SidebarItem icon={BrainCircuit} label="Analytics" active={activePage === 'Analytics'} onClick={() => setActivePage('Analytics')} />
          <SidebarItem icon={Settings} label="Settings" active={activePage === 'Settings'} onClick={() => setActivePage('Settings')} />
        </nav>
      </aside>

      <main className="relative z-10 flex-1 overflow-y-auto p-8 space-y-8">
        <header className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-white tracking-tight">{activePage}</h1>
          <div className="flex items-center space-x-6">
            <SystemHealthRadar />
            <div className="relative cursor-pointer group">
              <Bell className="text-gray-400 group-hover:text-white transition-colors" size={22} />
              {agentDecisions.length > 0 && <span className="absolute -top-1 -right-1 w-2 h-2 bg-neon-green rounded-full shadow-[0_0_8px_#39FF14]" />}
            </div>
          </div>
        </header>

        <AnimatePresence mode="wait">
          <motion.div key={activePage} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.2 }}>
            {activePage === 'Overview' ? (
              <div className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <StatCard title="Monthly Cost" value={`$${projectedMonthlyCost.toFixed(2)}`} change="Live backend" icon={BarChart3} />
                  <StatCard title="Savings Potential" value={`$${projectedMonthlySavings.toFixed(2)}`} change={`${optimizationCandidates} audit targets`} icon={TrendingDown} />
                  <StatCard title="Average CPU" value={`${averageCpuUsage.toFixed(1)}%`} change="Running fleet" icon={BrainCircuit} />
                  <StatCard title="Active Agents" value="FinOps IQ" change={status === 'optimizing' ? 'Scanning' : 'Ready'} icon={Zap} />
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2 bg-card border border-white/5 p-6 rounded-3xl min-h-100">
                    <div className="flex items-start justify-between mb-6 gap-4">
                      <div>
                        <h2 className="text-lg font-semibold text-white">Savings Projection</h2>
                        <p className="text-xs text-gray-500 mt-1">Calcul backend en direct, independant du bouton d'audit IA.</p>
                      </div>
                      {hasAuditRun && generatedAt && (
                        <span className="text-[10px] uppercase tracking-widest text-gray-500 font-mono">
                          Updated {generatedAt}
                        </span>
                      )}
                    </div>
                    <div className="h-64 w-full">
                      {hasAuditRun ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={analytics?.savings_projection ?? []}>
                            <defs>
                              <linearGradient id="colorCost" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#39FF14" stopOpacity={0.2}/>
                                <stop offset="95%" stopColor="#39FF14" stopOpacity={0}/>
                              </linearGradient>
                            </defs>
                            <XAxis dataKey="label" stroke="#333" fontSize={11} tickLine={false} axisLine={false} />
                            <Tooltip
                              contentStyle={{ backgroundColor: '#050505', border: 'none', borderRadius: '12px' }}
                              formatter={(value) => [`$${Number(value).toFixed(2)}`, 'Savings']}
                            />
                            <Area type="monotone" dataKey="value" stroke="#39FF14" strokeWidth={2} fill="url(#colorCost)" />
                          </AreaChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="h-full flex items-center justify-center text-sm text-gray-500">
                          Lance RUN IQ AUDIT pour afficher la projection.
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="bg-card border-2 border-neon-green/10 p-6 rounded-3xl flex flex-col justify-between relative overflow-hidden">
                    <motion.div animate={{ y: [0, 400, 0] }} transition={{ duration: 4, repeat: Infinity, ease: "linear" }} className="absolute inset-x-0 h-px bg-gradient-to-r from-transparent via-neon-green/50 to-transparent" />
                    <div>
                      <div className="flex items-center space-x-2 mb-6">
                        <div className="w-2 h-2 bg-neon-green rounded-full animate-pulse shadow-[0_0_8px_#39FF14]" />
                        <span className="text-[10px] font-mono text-neon-green uppercase tracking-widest">AgenticFlow AI Active</span>
                      </div>
                      <h2 className="text-2xl font-bold text-white mb-2 italic">FinOps Optimizer</h2>
                      <p className="text-gray-400 text-sm mb-6">Prêt pour l'audit d'infrastructure.</p>

                      <p className="text-xs text-gray-500 mb-6">
                        Ce bouton lance l'analyse IA detaillee et alimente les cartes d'audit et la projection.
                      </p>

                      {agentDecisions.length > 0 && (
                        <div className="space-y-3">
                          {agentDecisions.slice(0, 3).map((d, i) => (
                            <div key={i} className="flex items-center text-xs text-gray-300">
                              <div className="w-1 h-1 bg-neon-green rounded-full mr-3" /> {d.reasoning?.substring(0, 40)}...
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={handleIQOptimization}
                      disabled={status === 'optimizing'}
                      className={`w-full mt-8 py-4 font-black rounded-2xl transition-all flex items-center justify-center space-x-2 ${status === 'optimizing' ? 'bg-white/5 text-gray-500' : 'bg-neon-green text-black hover:shadow-[0_0_30px_rgba(57,255,20,0.4)] hover:scale-[1.02]'}`}
                    >
                      {status === 'optimizing' ? <Cpu className="animate-spin" /> : 'RUN IQ AUDIT'}
                    </button>
                  </div>
                </div>
              </div>
            ) : activePage === 'Resources' ? (
              <ResourcesPage resources={resources} agentDecisions={agentDecisions} onExecute={onExecute} />
            ) : activePage === 'Analytics' ? (
              <AnalyticsPage analytics={analytics} loading={analyticsLoading} hasAuditRun={hasAuditRun} />
            ) : (
              <SettingsPage />
            )}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}
