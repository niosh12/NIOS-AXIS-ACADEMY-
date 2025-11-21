

import React, { useEffect, useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../App';
import { LayoutDashboard, Users, FileText, ClipboardEdit, Settings, LogOut, CalendarCheck, Ban } from 'lucide-react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase';
import { ToastContainer, ToastProps } from '../../components/UI';

const AdminLayout: React.FC = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [toasts, setToasts] = useState<ToastProps[]>([]);

  const addToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = Date.now().toString() + Math.random();
    setToasts(prev => [...prev, { id, message, type }]);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  // Real-time Listeners
  useEffect(() => {
    // Listen for New Reports
    const qReports = query(collection(db, 'reports'), where('status', '==', 'submitted'));
    let initReports = true;
    const unsubReports = onSnapshot(qReports, (snapshot) => {
      if (initReports) { initReports = false; return; }
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          addToast(`New Report submitted by ${change.doc.data().userName}`, 'info');
        }
      });
    });

    // Listen for New Corrections
    const qCorrections = query(collection(db, 'corrections'), where('status', '==', 'pending'));
    let initCorrections = true;
    const unsubCorrections = onSnapshot(qCorrections, (snapshot) => {
      if (initCorrections) { initCorrections = false; return; }
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          addToast(`Correction Request from ${change.doc.data().userName}`, 'info');
        }
      });
    });

    // Listen for New Suspension Requests
    const qSuspensions = query(collection(db, 'suspension_requests'), where('status', '==', 'pending'));
    let initSuspensions = true;
    const unsubSuspensions = onSnapshot(qSuspensions, (snapshot) => {
      if (initSuspensions) { initSuspensions = false; return; }
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          addToast(`REACTIVATION REQUEST: ${change.doc.data().userName}`, 'error');
        }
      });
    });

    return () => {
      unsubReports();
      unsubCorrections();
      unsubSuspensions();
    };
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const navItems = [
    { to: "/admin", icon: LayoutDashboard, label: "Dashboard", end: true },
    { to: "/admin/users", icon: Users, label: "Users" },
    { to: "/admin/attendance", icon: CalendarCheck, label: "Attendance" },
    { to: "/admin/reports", icon: FileText, label: "Reports" },
    { to: "/admin/corrections", icon: ClipboardEdit, label: "Corrections" },
    { to: "/admin/suspensions", icon: Ban, label: "Suspensions" },
    { to: "/admin/settings", icon: Settings, label: "Settings" },
  ];

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden">
      {/* Sidebar */}
      <div className="w-64 bg-white border-r border-gray-200 flex flex-col hidden md:flex">
        <div className="p-6 border-b border-gray-100">
          <h1 className="text-2xl font-bold text-brand-700">NIOS Axis</h1>
          <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mt-1">Admin Panel</p>
        </div>
        
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                  isActive 
                    ? 'bg-brand-50 text-brand-700' 
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`
              }
            >
              <item.icon className="w-5 h-5 mr-3" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-gray-200">
          <button 
            onClick={handleLogout}
            className="flex items-center w-full px-4 py-2 text-sm font-medium text-red-600 rounded-lg hover:bg-red-50 transition-colors"
          >
            <LogOut className="w-5 h-5 mr-3" />
            Logout
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile Header */}
        <header className="md:hidden bg-white border-b border-gray-200 p-4 flex justify-between items-center">
          <span className="font-bold text-brand-700">NIOS Axis Admin</span>
          <button onClick={handleLogout} className="text-gray-500"><LogOut className="w-5 h-5" /></button>
        </header>
        
        <main className="flex-1 overflow-y-auto p-4 md:p-8 relative">
          <Outlet />
          <ToastContainer toasts={toasts} removeToast={removeToast} />
          
          <footer className="mt-12 pt-6 border-t border-gray-200 text-center text-gray-400 text-xs">
            THIS APP MADE BY DRAP-S-COMPANYS
          </footer>
        </main>
      </div>
      
      {/* Mobile Bottom Nav */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex justify-around p-2 z-10 overflow-x-auto">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              `flex flex-col items-center p-2 min-w-[60px] rounded-md ${isActive ? 'text-brand-600' : 'text-gray-400'}`
            }
          >
            <item.icon className="w-5 h-5" />
            <span className="text-[10px] mt-1 truncate">{item.label}</span>
          </NavLink>
        ))}
      </div>
    </div>
  );
};

export default AdminLayout;