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
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
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
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
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
            <Icons.Database className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Synergiq CRM</h1>
          <p className="text-slate-300">Multi-Tenant Enterprise Platform</p>
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
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Company Name
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.companyName}
                    onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                    className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Acme Technologies"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      First Name
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.firstName}
                      onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                      className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Last Name
                    </label>
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
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Tenant Key
                </label>
                <input
                  type="text"
                  required
                  value={formData.tenantKey}
                  onChange={(e) => setFormData({ ...formData, tenantKey: e.target.value })}
                  className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="demo"
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
                placeholder="you@company.com"
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
                placeholder="••••••••"
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

          {mode === 'login' && (
            <div className="mt-6 text-center text-sm text-slate-600">
              <p>Demo: Tenant: demo | Email: demo@example.com</p>
            </div>
          )}
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
    { id: 'captures', name: 'Captures', icon: Icons.Briefcase, path: '/captures' },
    { id: 'contacts', name: 'Contacts', icon: Icons.Users, path: '/contacts' },
    { id: 'companies', name: 'Companies', icon: Icons.Building, path: '/companies' },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white shadow-2xl border-b border-slate-700 sticky top-0 z-50">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 hover:bg-slate-700 rounded-lg"
            >
              {sidebarOpen ? <Icons.X className="w-5 h-5" /> : <Icons.Menu className="w-5 h-5" />}
            </button>
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center">
                <Icons.Database className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold">Synergiq CRM</h1>
                <p className="text-xs text-slate-400">{user?.tenantKey}</p>
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
                return (
                  <button
                    key={item.id}
                    onClick={() => navigate(item.path)}
                    className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                      location.pathname === item.path
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
// OPPORTUNITIES PAGE
// ============================================================================

function OpportunitiesPage() {
  const [opportunities, setOpportunities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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
        <button className="px-5 py-2.5 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-xl font-semibold hover:shadow-lg flex items-center space-x-2">
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
            <p className="text-sm text-slate-600 mb-4">{opp.company_name}</p>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-600">Value</span>
                <span className="font-bold">${((opp.amount || 0) / 1000000).toFixed(2)}M</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Stage</span>
                <span className="font-semibold text-blue-600">{opp.stage}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Owner</span>
                <span>{opp.owner_name}</span>
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
    </div>
  );
}

// Placeholder pages
function CapturesPage() {
  return (
    <div>
      <h1 className="text-3xl font-bold text-slate-900 mb-2">Captures</h1>
      <p className="text-slate-600">Manage your capture process</p>
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
        element={
          user ? (
            <DashboardLayout>
              <DashboardPage />
            </DashboardLayout>
          ) : (
            <Navigate to="/login" />
          )
        }
      />
      <Route
        path="/opportunities"
        element={
          user ? (
            <DashboardLayout>
              <OpportunitiesPage />
            </DashboardLayout>
          ) : (
            <Navigate to="/login" />
          )
        }
      />
      <Route
        path="/captures"
        element={
          user ? (
            <DashboardLayout>
              <CapturesPage />
            </DashboardLayout>
          ) : (
            <Navigate to="/login" />
          )
        }
      />
      <Route
        path="/contacts"
        element={
          user ? (
            <DashboardLayout>
              <ContactsPage />
            </DashboardLayout>
          ) : (
            <Navigate to="/login" />
          )
        }
      />
      <Route
        path="/companies"
        element={
          user ? (
            <DashboardLayout>
              <CompaniesPage />
            </DashboardLayout>
          ) : (
            <Navigate to="/login" />
          )
        }
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
