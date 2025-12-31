import React, { useState, useEffect, createContext, useContext } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import axios from 'axios';
import * as Icons from 'lucide-react';

// ============================================================================
// API CLIENT
// ============================================================================

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8787';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// ============================================================================
// AUTH CONTEXT
// ============================================================================

interface User {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  tenantKey: string;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string, tenantKey: string) => Promise<void>;
  register: (data: any) => Promise<any>;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};

function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('user');
    return saved ? JSON.parse(saved) : null;
  });
  const [loading, setLoading] = useState(false);

  const login = async (email: string, password: string, tenantKey: string) => {
    setLoading(true);
    try {
      const response = await api.post('/api/auth/login', { email, password, tenantKey });
      const { token, user } = response.data;
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      setUser(user);
    } finally {
      setLoading(false);
    }
  };

  const register = async (data: any) => {
    setLoading(true);
    try {
      const response = await api.post('/api/auth/register', data);
      return response.data;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

// ============================================================================
// LOGIN PAGE
// ============================================================================

function LoginPage() {
  const { login, register, loading } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    tenantKey: '',
    companyName: '',
    firstName: '',
    lastName: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      if (mode === 'login') {
        await login(formData.email, formData.password, formData.tenantKey);
        navigate('/dashboard');
      } else {
        const response = await register({
          companyName: formData.companyName,
          email: formData.email,
          password: formData.password,
          firstName: formData.firstName,
          lastName: formData.lastName,
        });
        setSuccess(`Registration successful! Your tenant key is: ${response.tenantKey}`);
        setMode('login');
        setFormData({ ...formData, tenantKey: response.tenantKey });
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Authentication failed');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl mb-4 shadow-2xl">
            <Icons.Sparkles className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Synergiq CRM</h1>
          <p className="text-slate-300">AI-Powered Proposal Platform</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <div className="flex space-x-2 mb-6">
            <button
              onClick={() => setMode('login')}
              className={`flex-1 py-2 rounded-xl font-semibold transition-all ${
                mode === 'login'
                  ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Login
            </button>
            <button
              onClick={() => setMode('register')}
              className={`flex-1 py-2 rounded-xl font-semibold transition-all ${
                mode === 'register'
                  ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Register
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-xl text-green-700 text-sm">
              {success}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Company Name</label>
                  <input
                    type="text"
                    required
                    value={formData.companyName}
                    onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                    className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">First Name</label>
                    <input
                      type="text"
                      required
                      value={formData.firstName}
                      onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                      className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Last Name</label>
                    <input
                      type="text"
                      required
                      value={formData.lastName}
                      onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                      className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </>
            )}

            {mode === 'login' && (
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Tenant Key</label>
                <input
                  type="text"
                  required
                  value={formData.tenantKey}
                  onChange={(e) => setFormData({ ...formData, tenantKey: e.target.value })}
                  className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Email</label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Password</label>
              <input
                type="password"
                required
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-semibold rounded-xl hover:shadow-lg transition-all disabled:opacity-50"
            >
              {loading ? 'Processing...' : mode === 'login' ? 'Sign In' : 'Create Account'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// DASHBOARD LAYOUT
// ============================================================================

function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const navigation = [
    { id: 'dashboard', name: 'Dashboard', icon: Icons.Home, path: '/dashboard' },
    { id: 'opportunities', name: 'Opportunities', icon: Icons.Target, path: '/opportunities' },
    { id: 'samgov', name: 'SAM.gov', icon: Icons.Globe, path: '/samgov' },
    { id: 'proposals', name: 'Proposals', icon: Icons.FileText, path: '/proposals' },
    { id: 'boilerplates', name: 'Boilerplates', icon: Icons.BookTemplate, path: '/boilerplates' },
    { id: 'captures', name: 'Captures', icon: Icons.Briefcase, path: '/captures' },
    { id: 'contacts', name: 'Contacts', icon: Icons.Users, path: '/contacts' },
    { id: 'companies', name: 'Companies', icon: Icons.Building, path: '/companies' },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white shadow-2xl border-b border-slate-700 sticky top-0 z-50">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center space-x-4">
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 hover:bg-slate-700 rounded-lg">
              {sidebarOpen ? <Icons.X className="w-5 h-5" /> : <Icons.Menu className="w-5 h-5" />}
            </button>
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center">
                <Icons.Sparkles className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold">Synergiq CRM</h1>
                <p className="text-xs text-slate-400">AI-Powered Proposals</p>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-3 px-3 py-2 bg-slate-800 rounded-lg">
              <div className="w-8 h-8 bg-gradient-to-br from-violet-500 to-purple-500 rounded-full flex items-center justify-center text-sm font-bold">
                {user?.firstName?.[0] || 'U'}
              </div>
              <div className="text-sm">
                <div className="font-medium">
                  {user?.firstName} {user?.lastName}
                </div>
                <div className="text-xs text-slate-400">{user?.role}</div>
              </div>
              <button onClick={logout} className="p-1 hover:bg-slate-700 rounded" title="Logout">
                <Icons.LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {sidebarOpen && (
          <aside className="w-72 bg-white border-r border-slate-200 min-h-[calc(100vh-73px)] shadow-sm">
            <nav className="p-4 space-y-1">
              {navigation.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <button
                    key={item.id}
                    onClick={() => navigate(item.path)}
                    className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                      isActive
                        ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg'
                        : 'text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span>{item.name}</span>
                  </button>
                );
              })}
            </nav>
          </aside>
        )}

        <main className="flex-1 p-8 overflow-auto max-h-[calc(100vh-73px)]">{children}</main>
      </div>
    </div>
  );
}

// ============================================================================
// DASHBOARD PAGE
// ============================================================================

function DashboardPage() {
  const [kpis, setKpis] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      const response = await api.get('/api/dashboard/kpis');
      setKpis(response.data);
    } catch (error) {
      console.error('Failed to load dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64">Loading...</div>;
  }

  const kpiCards = [
    {
      title: 'Total Revenue',
      value: `$${((kpis?.totalRevenue || 0) / 1000000).toFixed(1)}M`,
      icon: Icons.DollarSign,
      color: 'blue',
    },
    {
      title: 'Open Opportunities',
      value: kpis?.openOpportunities || 0,
      icon: Icons.Target,
      color: 'green',
    },
    {
      title: 'Win Rate',
      value: `${(kpis?.winRate || 0).toFixed(1)}%`,
      icon: Icons.Award,
      color: 'purple',
    },
    {
      title: 'Pipeline Value',
      value: `$${((kpis?.pipelineValue || 0) / 1000000).toFixed(1)}M`,
      icon: Icons.TrendingUp,
      color: 'orange',
    },
  ];

  const colors: any = {
    blue: 'from-blue-500 to-cyan-500',
    green: 'from-green-500 to-emerald-500',
    purple: 'from-purple-500 to-pink-500',
    orange: 'from-orange-500 to-red-500',
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Dashboard</h1>
        <p className="text-slate-600">Welcome back! Here's your business overview.</p>
      </div>

      <div className="grid grid-cols-4 gap-6">
        {kpiCards.map((kpi, idx) => {
          const Icon = kpi.icon;
          return (
            <div
              key={idx}
              className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 hover:shadow-xl transition-all"
            >
              <div
                className={`w-14 h-14 bg-gradient-to-br ${colors[kpi.color]} rounded-xl flex items-center justify-center shadow-lg mb-4`}
              >
                <Icon className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-3xl font-bold text-slate-900 mb-1">{kpi.value}</h3>
              <p className="text-sm text-slate-600 font-medium">{kpi.title}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================================
// OPPORTUNITIES PAGE (WITH CREATE MODAL!)
// ============================================================================

function OpportunitiesPage() {
  const [opportunities, setOpportunities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    amount: '',
    probability: '50',
    closeDate: '',
    stage: 'prospecting',
    type: 'new_business',
  });

  useEffect(() => {
    loadOpportunities();
  }, []);

  const loadOpportunities = async () => {
    try {
      const response = await api.get('/api/opportunities');
      setOpportunities(response.data);
    } catch (error) {
      console.error('Failed to load opportunities:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/api/opportunities', {
        name: formData.name,
        amount: parseFloat(formData.amount),
        probability: parseFloat(formData.probability),
        closeDate: formData.closeDate,
        stage: formData.stage,
        type: formData.type,
      });
      setShowCreateModal(false);
      setFormData({ name: '', amount: '', probability: '50', closeDate: '', stage: 'prospecting', type: 'new_business' });
      loadOpportunities();
    } catch (error) {
      console.error('Failed to create opportunity:', error);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Opportunities</h1>
          <p className="text-slate-600">Manage your sales pipeline</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-5 py-2.5 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-xl font-semibold hover:shadow-lg flex items-center space-x-2"
        >
          <Icons.Plus className="w-5 h-5" />
          <span>New Opportunity</span>
        </button>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {opportunities.map((opp) => (
          <div
            key={opp.id}
            className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 hover:shadow-lg transition-all"
          >
            <h3 className="font-bold text-slate-900 mb-2">{opp.name}</h3>
            <p className="text-sm text-slate-600 mb-4">{opp.company_name || 'No company'}</p>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-600">Value</span>
                <span className="font-bold">${((opp.amount || 0) / 1000000).toFixed(2)}M</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Stage</span>
                <span className="font-semibold text-blue-600 capitalize">{opp.stage}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Probability</span>
                <span>{opp.probability}%</span>
              </div>
            </div>
          </div>
        ))}

        {opportunities.length === 0 && (
          <div className="col-span-3 text-center py-12 text-slate-500">
            No opportunities yet. Create your first one!
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">New Opportunity</h2>
              <button onClick={() => setShowCreateModal(false)} className="p-1 hover:bg-slate-100 rounded">
                <Icons.X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Federal Cloud Migration"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Amount ($)</label>
                  <input
                    type="number"
                    required
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="2500000"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Probability (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    required
                    value={formData.probability}
                    onChange={(e) => setFormData({ ...formData, probability: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Stage</label>
                <select
                  value={formData.stage}
                  onChange={(e) => setFormData({ ...formData, stage: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="prospecting">Prospecting</option>
                  <option value="qualification">Qualification</option>
                  <option value="proposal">Proposal</option>
                  <option value="negotiation">Negotiation</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Close Date</label>
                <input
                  type="date"
                  value={formData.closeDate}
                  onChange={(e) => setFormData({ ...formData, closeDate: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-semibold rounded-xl hover:shadow-lg transition-all"
              >
                Create Opportunity
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// SAM.GOV PAGE
// ============================================================================

function SAMGovPage() {
  const [config, setConfig] = useState<any>(null);
  const [opportunities, setOpportunities] = useState<any[]>([]);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [formData, setFormData] = useState({
    apiKey: '',
    naicsCodes: '',
    agencies: '',
    setAsides: '',
  });
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    loadConfig();
    loadOpportunities();
  }, []);

  const loadConfig = async () => {
    try {
      const response = await api.get('/api/samgov/config');
      setConfig(response.data);
    } catch (error) {
      console.error('Failed to load SAM.gov config:', error);
    }
  };

  const loadOpportunities = async () => {
    try {
      const response = await api.get('/api/samgov/opportunities');
      setOpportunities(response.data);
    } catch (error) {
      console.error('Failed to load SAM.gov opportunities:', error);
    }
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/api/samgov/config', {
        apiKey: formData.apiKey,
        searchFilters: {
          naics: formData.naicsCodes.split(',').map((s) => s.trim()),
          agencies: formData.agencies.split(',').map((s) => s.trim()),
          setAsides: formData.setAsides.split(',').map((s) => s.trim()),
        },
      });
      setShowConfigModal(false);
      loadConfig();
      alert('SAM.gov configured successfully!');
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to save configuration');
    }
  };

  const handleImport = async () => {
    setImporting(true);
    try {
      await api.post('/api/samgov/import');
      alert('Import started! This may take a few minutes.');
      setTimeout(loadOpportunities, 5000);
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to import');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">SAM.gov Integration</h1>
          <p className="text-slate-600">Import federal opportunities automatically</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => setShowConfigModal(true)}
            className="px-5 py-2.5 bg-white border-2 border-slate-300 text-slate-700 rounded-xl font-semibold hover:bg-slate-50 flex items-center space-x-2"
          >
            <Icons.Settings className="w-5 h-5" />
            <span>Configure</span>
          </button>
          <button
            onClick={handleImport}
            disabled={!config?.is_configured || importing}
            className="px-5 py-2.5 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-xl font-semibold hover:shadow-lg flex items-center space-x-2 disabled:opacity-50"
          >
            <Icons.Download className="w-5 h-5" />
            <span>{importing ? 'Importing...' : 'Import Opportunities'}</span>
          </button>
        </div>
      </div>

      {!config?.is_configured && (
        <div className="bg-yellow-50 border-2 border-yellow-200 rounded-2xl p-6">
          <div className="flex items-start space-x-4">
            <Icons.AlertCircle className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-1" />
            <div>
              <h3 className="font-bold text-yellow-900 mb-2">SAM.gov Not Configured</h3>
              <p className="text-yellow-800 mb-4">
                Configure your SAM.gov API key and search filters to start importing federal opportunities.
              </p>
              <button
                onClick={() => setShowConfigModal(true)}
                className="px-4 py-2 bg-yellow-600 text-white rounded-lg font-semibold hover:bg-yellow-700"
              >
                Configure Now
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
        <h2 className="text-xl font-bold text-slate-900 mb-4">Imported Opportunities</h2>
        
        {opportunities.length === 0 ? (
          <div className="text-center py-12 text-slate-500">
            No opportunities imported yet. Click "Import Opportunities" to get started.
          </div>
        ) : (
          <div className="space-y-4">
            {opportunities.map((opp) => (
              <div key={opp.id} className="border border-slate-200 rounded-xl p-4 hover:shadow-md transition-all">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-bold text-slate-900 mb-1">{opp.title}</h3>
                    <p className="text-sm text-slate-600 mb-2">{opp.solicitation_number}</p>
                    <div className="flex items-center space-x-4 text-sm">
                      <span className="text-slate-600">
                        <strong>Agency:</strong> {opp.agency}
                      </span>
                      <span className="text-slate-600">
                        <strong>Type:</strong> {opp.type}
                      </span>
                      <span className="text-slate-600">
                        <strong>Deadline:</strong> {opp.response_deadline}
                      </span>
                    </div>
                  </div>
                  <button className="px-4 py-2 bg-blue-500 text-white rounded-lg font-semibold hover:bg-blue-600">
                    Create Proposal
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Configuration Modal */}
      {showConfigModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">Configure SAM.gov</h2>
              <button onClick={() => setShowConfigModal(false)} className="p-1 hover:bg-slate-100 rounded">
                <Icons.X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveConfig} className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  SAM.gov API Key
                </label>
                <input
                  type="password"
                  required
                  value={formData.apiKey}
                  onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter your SAM.gov API key"
                />
                <p className="text-xs text-slate-500 mt-1">
                  Get your API key from{' '}
                  <a href="https://sam.gov" target="_blank" className="text-blue-600 hover:underline">
                    sam.gov
                  </a>
                </p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  NAICS Codes (comma-separated)
                </label>
                <input
                  type="text"
                  value={formData.naicsCodes}
                  onChange={(e) => setFormData({ ...formData, naicsCodes: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="541512, 541519, 541611"
                />
                <p className="text-xs text-slate-500 mt-1">
                  Example: 541512 (Computer Systems Design), 541519 (Other Computer Services)
                </p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Agencies (comma-separated)
                </label>
                <input
                  type="text"
                  value={formData.agencies}
                  onChange={(e) => setFormData({ ...formData, agencies: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="DoD, DHS, GSA"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Set-Asides (comma-separated)
                </label>
                <input
                  type="text"
                  value={formData.setAsides}
                  onChange={(e) => setFormData({ ...formData, setAsides: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="SBA, 8(a), WOSB"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-semibold rounded-xl hover:shadow-lg transition-all"
              >
                Save Configuration
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// PROPOSALS PAGE
// ============================================================================

function ProposalsPage() {
  const navigate = useNavigate();
  const [proposals, setProposals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    opportunityId: '',
  });

  useEffect(() => {
    loadProposals();
  }, []);

  const loadProposals = async () => {
    try {
      const response = await api.get('/api/proposals');
      setProposals(response.data);
    } catch (error) {
      console.error('Failed to load proposals:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await api.post('/api/proposals', {
        title: formData.title,
        opportunityId: formData.opportunityId || null,
      });
      setShowCreateModal(false);
      alert(`Proposal created! ID: ${response.data.id}`);
      loadProposals();
    } catch (error) {
      console.error('Failed to create proposal:', error);
    }
  };

  const getStatusColor = (status: string) => {
    const colors: any = {
      draft: 'bg-slate-100 text-slate-700',
      in_progress: 'bg-blue-100 text-blue-700',
      review: 'bg-yellow-100 text-yellow-700',
      submitted: 'bg-green-100 text-green-700',
      won: 'bg-emerald-100 text-emerald-700',
      lost: 'bg-red-100 text-red-700',
    };
    return colors[status] || colors.draft;
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Proposal Packages</h1>
          <p className="text-slate-600">AI-powered proposal creation and management</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-5 py-2.5 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-xl font-semibold hover:shadow-lg flex items-center space-x-2"
        >
          <Icons.Plus className="w-5 h-5" />
          <span>New Proposal</span>
        </button>
      </div>

      {proposals.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-12 text-center">
          <Icons.FileText className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-slate-900 mb-2">No Proposals Yet</h3>
          <p className="text-slate-600 mb-6">Create your first AI-powered proposal package</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-xl font-semibold hover:shadow-lg"
          >
            Create Proposal
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-6">
          {proposals.map((proposal) => (
            <div
              key={proposal.id}
              className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 hover:shadow-lg transition-all cursor-pointer"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center">
                    <Icons.FileText className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900">{proposal.title}</h3>
                    <p className="text-xs text-slate-500">
                      {proposal.solicitation_number || 'No solicitation #'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600">Status</span>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(proposal.status)}`}>
                    {proposal.status}
                  </span>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600">Progress</span>
                  <span className="font-semibold">{proposal.completion_percentage || 0}%</span>
                </div>

                {proposal.due_date && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-600">Due Date</span>
                    <span className="font-semibold">{new Date(proposal.due_date).toLocaleDateString()}</span>
                  </div>
                )}
              </div>

              <div className="mt-4 pt-4 border-t border-slate-200">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>Created {new Date(proposal.created_at).toLocaleDateString()}</span>
                  <Icons.ChevronRight className="w-4 h-4" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">New Proposal Package</h2>
              <button onClick={() => setShowCreateModal(false)} className="p-1 hover:bg-slate-100 rounded">
                <Icons.X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Proposal Title</label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="DoD Cybersecurity Proposal"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Link to Opportunity (Optional)
                </label>
                <input
                  type="text"
                  value={formData.opportunityId}
                  onChange={(e) => setFormData({ ...formData, opportunityId: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Opportunity ID"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-semibold rounded-xl hover:shadow-lg transition-all"
              >
                Create Proposal
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// BOILERPLATES PAGE
// ============================================================================

function BoilerplatesPage() {
  const [boilerplates, setBoilerplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingBoilerplate, setEditingBoilerplate] = useState<any>(null);
  const [formData, setFormData] = useState({
    title: '',
    category: 'company_overview',
    content: '',
  });

  useEffect(() => {
    loadBoilerplates();
  }, []);

  const loadBoilerplates = async () => {
    try {
      const response = await api.get('/api/boilerplates');
      setBoilerplates(response.data);
    } catch (error) {
      console.error('Failed to load boilerplates:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingBoilerplate) {
        await api.put(`/api/boilerplates/${editingBoilerplate.id}`, formData);
      } else {
        await api.post('/api/boilerplates', formData);
      }
      setShowCreateModal(false);
      setEditingBoilerplate(null);
      setFormData({ title: '', category: 'company_overview', content: '' });
      loadBoilerplates();
    } catch (error) {
      console.error('Failed to save boilerplate:', error);
    }
  };

  const handleEdit = (boilerplate: any) => {
    setEditingBoilerplate(boilerplate);
    setFormData({
      title: boilerplate.title,
      category: boilerplate.category,
      content: boilerplate.content,
    });
    setShowCreateModal(true);
  };

  const categories = [
    { value: 'company_overview', label: 'Company Overview' },
    { value: 'past_performance', label: 'Past Performance' },
    { value: 'technical_approach', label: 'Technical Approach' },
    { value: 'management_plan', label: 'Management Plan' },
    { value: 'quality_assurance', label: 'Quality Assurance' },
    { value: 'security', label: 'Security' },
    { value: 'pricing', label: 'Pricing' },
    { value: 'other', label: 'Other' },
  ];

  const groupedBoilerplates = boilerplates.reduce((acc: any, bp) => {
    if (!acc[bp.category]) acc[bp.category] = [];
    acc[bp.category].push(bp);
    return acc;
  }, {});

  if (loading) {
    return <div className="flex items-center justify-center h-64">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Boilerplate Library</h1>
          <p className="text-slate-600">Reusable content sections for faster proposal creation</p>
        </div>
        <button
          onClick={() => {
            setEditingBoilerplate(null);
            setFormData({ title: '', category: 'company_overview', content: '' });
            setShowCreateModal(true);
          }}
          className="px-5 py-2.5 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-xl font-semibold hover:shadow-lg flex items-center space-x-2"
        >
          <Icons.Plus className="w-5 h-5" />
          <span>New Boilerplate</span>
        </button>
      </div>

      {boilerplates.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-12 text-center">
          <Icons.BookTemplate className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-slate-900 mb-2">No Boilerplates Yet</h3>
          <p className="text-slate-600 mb-6">Create reusable content sections to speed up proposal writing</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-xl font-semibold hover:shadow-lg"
          >
            Create First Boilerplate
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {categories.map((cat) => {
            const items = groupedBoilerplates[cat.value] || [];
            if (items.length === 0) return null;

            return (
              <div key={cat.value} className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                <h2 className="text-xl font-bold text-slate-900 mb-4">{cat.label}</h2>
                <div className="grid grid-cols-2 gap-4">
                  {items.map((bp: any) => (
                    <div key={bp.id} className="border border-slate-200 rounded-xl p-4 hover:shadow-md transition-all">
                      <div className="flex items-start justify-between mb-3">
                        <h3 className="font-bold text-slate-900">{bp.title}</h3>
                        <button
                          onClick={() => handleEdit(bp)}
                          className="p-1 hover:bg-slate-100 rounded"
                        >
                          <Icons.Edit2 className="w-4 h-4 text-slate-600" />
                        </button>
                      </div>
                      <p className="text-sm text-slate-600 line-clamp-3">{bp.content}</p>
                      <div className="mt-3 text-xs text-slate-500">
                        Updated {new Date(bp.updated_at).toLocaleDateString()}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create/Edit Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 max-w-3xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">
                {editingBoilerplate ? 'Edit Boilerplate' : 'New Boilerplate'}
              </h2>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setEditingBoilerplate(null);
                }}
                className="p-1 hover:bg-slate-100 rounded"
              >
                <Icons.X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Title</label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Company Capabilities Overview"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Category</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {categories.map((cat) => (
                    <option key={cat.value} value={cat.value}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Content</label>
                <textarea
                  required
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  rows={12}
                  className="w-full px-4 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                  placeholder="Enter your boilerplate content here. Use variables like {{company_name}}, {{year}}, {{contract_value}} for dynamic content."
                />
                <p className="text-xs text-slate-500 mt-2">
                  Tip: Use double curly braces for variables: {`{{company_name}}`}, {`{{year}}`}, {`{{contract_value}}`}
                </p>
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-semibold rounded-xl hover:shadow-lg transition-all"
              >
                {editingBoilerplate ? 'Update Boilerplate' : 'Create Boilerplate'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// PLACEHOLDER PAGES
// ============================================================================

function CapturesPage() {
  return (
    <div>
      <h1 className="text-3xl font-bold text-slate-900 mb-2">Captures</h1>
      <p className="text-slate-600">Manage your capture process (Shipley 6-phase)</p>
    </div>
  );
}

function ContactsPage() {
  return (
    <div>
      <h1 className="text-3xl font-bold text-slate-900 mb-2">Contacts</h1>
      <p className="text-slate-600">Manage your contacts</p>
    </div>
  );
}

function CompaniesPage() {
  return (
    <div>
      <h1 className="text-3xl font-bold text-slate-900 mb-2">Companies</h1>
      <p className="text-slate-600">Manage your companies</p>
    </div>
  );
}

// ============================================================================
// APP ROUTES
// ============================================================================

function AppRoutes() {
  const { user } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={!user ? <LoginPage /> : <Navigate to="/dashboard" />} />
      <Route
        path="/dashboard"
        element={user ? <DashboardLayout><DashboardPage /></DashboardLayout> : <Navigate to="/login" />}
      />
      <Route
        path="/opportunities"
        element={user ? <DashboardLayout><OpportunitiesPage /></DashboardLayout> : <Navigate to="/login" />}
      />
      <Route
        path="/samgov"
        element={user ? <DashboardLayout><SAMGovPage /></DashboardLayout> : <Navigate to="/login" />}
      />
      <Route
        path="/proposals"
        element={user ? <DashboardLayout><ProposalsPage /></DashboardLayout> : <Navigate to="/login" />}
      />
      <Route
        path="/boilerplates"
        element={user ? <DashboardLayout><BoilerplatesPage /></DashboardLayout> : <Navigate to="/login" />}
      />
      <Route
        path="/captures"
        element={user ? <DashboardLayout><CapturesPage /></DashboardLayout> : <Navigate to="/login" />}
      />
      <Route
        path="/contacts"
        element={user ? <DashboardLayout><ContactsPage /></DashboardLayout> : <Navigate to="/login" />}
      />
      <Route
        path="/companies"
        element={user ? <DashboardLayout><CompaniesPage /></DashboardLayout> : <Navigate to="/login" />}
      />
      <Route path="/" element={<Navigate to="/dashboard" />} />
    </Routes>
  );
}

// ============================================================================
// MAIN APP
// ============================================================================

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
