
import React, { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../App';
import { Home, User, FolderOpen, LogOut, FileEdit, Camera } from 'lucide-react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase';
import { ToastContainer, ToastProps } from '../../components/UI';

const UserLayout: React.FC = () => {
  const { logout, user } = useAuth();
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
    if (!user?.userId) return;

    // Listen for My Report Updates (Approvals/Rejections)
    const qReports = query(collection(db, 'reports'), where('userId', '==', user.userId));
    
    let initReports = true;

    const unsubReports = onSnapshot(qReports, (snapshot) => {
      const isInitial = initReports;
      initReports = false;

      snapshot.docChanges().forEach((change) => {
        const data = change.doc.data();
        
        if (change.type === 'modified') {
           if (data.status === 'approved') {
             addToast(`Your report for ${new Date(data.date).toLocaleDateString()} was Approved!`, 'success');
           } else if (data.status === 'rejected') {
             addToast(`Your report for ${new Date(data.date).toLocaleDateString()} was Rejected.`, 'error');
           }
        }

        if (change.type === 'added' && !isInitial) {
           addToast(`New task/report assigned for ${new Date(data.date).toLocaleDateString()}`, 'info');
        }
      });
    });

    const qCorrections = query(collection(db, 'corrections'), where('userId', '==', user.userId));
    const unsubCorrections = onSnapshot(qCorrections, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'modified') {
          const data = change.doc.data();
          if (data.status === 'approved') {
            addToast(`Correction for ${data.field} Approved`, 'success');
          } else if (data.status === 'rejected') {
            addToast(`Correction for ${data.field} Rejected`, 'error');
          }
        }
      });
    });

    return () => {
      unsubReports();
      unsubCorrections();
    };
  }, [user?.userId]);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const navItems = [
    { to: "/user", icon: FileEdit, label: "Report", end: true },
    { to: "/user/attendance", icon: Camera, label: "Attendance" },
    { to: "/user/reports", icon: FolderOpen, label: "History" },
    { to: "/user/profile", icon: User, label: "Profile" },
  ];
  
  const displayName = user?.name || "User";
  const displayInitial = displayName.charAt(0);

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-20">
        <div className="max-w-4xl mx-auto px-4 h-16 flex justify-between items-center">
          <div className="flex items-center gap-3">
             <div className="w-8 h-8 rounded-full bg-brand-600 text-white flex items-center justify-center font-bold overflow-hidden shadow-sm border border-white">
                {user?.photoBase64 ? (
                  <img src={user.photoBase64} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  displayInitial
                )}
             </div>
             <div className="hidden sm:block">
               <h1 className="font-bold text-gray-800 leading-tight truncate max-w-[150px]">{displayName}</h1>
               <p className="text-xs text-gray-500">{user?.userId}</p>
             </div>
          </div>

          <div className="flex items-center gap-2">
            <img 
              src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcT-gDN6R3LZ6UIW9f7VISLRzm9u_CvVlSRh2A&s" 
              alt="Logo" 
              className="w-8 h-8 rounded-full object-cover border border-gray-200" 
            />
            <span className="font-bold text-brand-700 text-sm sm:text-base">NIOS Axis Academy</span>
          </div>

          <button onClick={handleLogout} className="text-gray-500 hover:text-red-600 transition-colors ml-2">
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 w-full max-w-4xl mx-auto p-4 mb-20 relative">
        <Outlet />
        <ToastContainer toasts={toasts} removeToast={removeToast} />
      </main>

      {/* Mobile Bottom Nav */}
      <nav className="fixed bottom-0 w-full bg-white border-t border-gray-200 flex justify-around py-2 pb-safe z-20 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
        {navItems.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) => `flex flex-col items-center p-2 rounded-lg transition-colors min-w-[64px] ${isActive ? 'text-brand-600' : 'text-gray-400'}`}
          >
            <item.icon className="w-6 h-6 mb-1" />
            <span className="text-[10px] font-medium">{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
};

export default UserLayout;
