

import React, { useState, createContext, useContext, useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthState, UserData } from './types';
import { endSession, startSession } from './services/authService';

// Pages
import LoginPage from './pages/Login';
import AdminLayout from './pages/admin/AdminLayout';
import AdminDashboard from './pages/admin/Dashboard';
import AdminUsers from './pages/admin/Users';
import AdminReports from './pages/admin/Reports';
import AdminCorrections from './pages/admin/Corrections';
import AdminSettings from './pages/admin/Settings';
import AdminAttendance from './pages/admin/Attendance';
import AdminSuspensions from './pages/admin/Suspensions';
import UserLayout from './pages/user/UserLayout';
import UserDashboard from './pages/user/Dashboard';
import UserProfile from './pages/user/Profile';
import UserReports from './pages/user/MyReports';
import UserAttendance from './pages/user/Attendance';

interface AuthContextType extends AuthState {
  loginAdmin: () => void;
  loginUser: (user: UserData) => void;
  logout: () => void;
  updateUser: (data: Partial<UserData>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};

const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AuthState>(() => {
    const stored = localStorage.getItem('niosa_auth');
    return stored ? JSON.parse(stored) : { role: null, user: null, loading: false };
  });
  const [sessionId, setSessionId] = useState<string | null>(localStorage.getItem('niosa_session'));

  useEffect(() => {
    localStorage.setItem('niosa_auth', JSON.stringify(state));
  }, [state]);

  const loginAdmin = () => {
    setState({ role: 'admin', user: null, loading: false });
  };

  const loginUser = async (user: UserData) => {
    const sid = await startSession(user.userId);
    setSessionId(sid);
    localStorage.setItem('niosa_session', sid);
    setState({ role: 'user', user, loading: false });
  };

  const logout = async () => {
    if (state.role === 'user' && sessionId) {
      await endSession(sessionId);
      localStorage.removeItem('niosa_session');
      setSessionId(null);
    }
    setState({ role: null, user: null, loading: false });
    localStorage.removeItem('niosa_auth');
  };

  const updateUser = (data: Partial<UserData>) => {
    setState(prev => {
      if (!prev.user) return prev;
      return {
        ...prev,
        user: { ...prev.user, ...data }
      };
    });
  };

  return (
    <AuthContext.Provider value={{ ...state, loginAdmin, loginUser, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};

const ProtectedRoute: React.FC<{ children: React.ReactNode; requiredRole: 'admin' | 'user' }> = ({ children, requiredRole }) => {
  const { role } = useAuth();
  const location = useLocation();

  if (!role) {
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  if (role !== requiredRole) {
    return <Navigate to={role === 'admin' ? '/admin' : '/user'} replace />;
  }

  return <>{children}</>;
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <HashRouter>
        <Routes>
          <Route path="/" element={<LoginPage />} />
          
          {/* Admin Routes */}
          <Route path="/admin" element={
            <ProtectedRoute requiredRole="admin">
              <AdminLayout />
            </ProtectedRoute>
          }>
            <Route index element={<AdminDashboard />} />
            <Route path="users" element={<AdminUsers />} />
            <Route path="attendance" element={<AdminAttendance />} />
            <Route path="reports" element={<AdminReports />} />
            <Route path="corrections" element={<AdminCorrections />} />
            <Route path="suspensions" element={<AdminSuspensions />} />
            <Route path="settings" element={<AdminSettings />} />
          </Route>

          {/* User Routes */}
          <Route path="/user" element={
            <ProtectedRoute requiredRole="user">
              <UserLayout />
            </ProtectedRoute>
          }>
            <Route index element={<UserDashboard />} />
            <Route path="attendance" element={<UserAttendance />} />
            <Route path="profile" element={<UserProfile />} />
            <Route path="reports" element={<UserReports />} />
          </Route>

          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </HashRouter>
    </AuthProvider>
  );
};

export default App;