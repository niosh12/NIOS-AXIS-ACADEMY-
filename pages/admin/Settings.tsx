
import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, updateDoc, doc, addDoc, deleteDoc, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '../../firebase';
import { Card, Button, Input, ConfirmModal } from '../../components/UI';
import { Download, Save, RefreshCw, Copy, Search, Plus, Trash2, Shield } from 'lucide-react';
import { AdminData } from '../../types';

const AdminSettings: React.FC = () => {
  // User Reset State
  const [resetUserId, setResetUserId] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetResult, setResetResult] = useState<{success: boolean, message: string, newPass?: string} | null>(null);
  const [showConfirmReset, setShowConfirmReset] = useState(false);

  // Admin Management State
  const [admins, setAdmins] = useState<AdminData[]>([]);
  const [newAdmin, setNewAdmin] = useState({ email: '', password: '' });
  const [isAdminLoading, setIsAdminLoading] = useState(false);

  // Fetch Admins
  useEffect(() => {
    const q = query(collection(db, 'admins'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as AdminData));
      setAdmins(list);
    });
    return () => unsub();
  }, []);

  // --- Password Reset Logic ---
  const handleResetSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetUserId) return;
    setShowConfirmReset(true);
  };

  const executeResetPassword = async () => {
    setShowConfirmReset(false);
    setLoading(true);
    setResetResult(null);

    try {
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('userId', '==', resetUserId.trim()));
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        setResetResult({ success: false, message: `User ID "${resetUserId}" not found.` });
      } else {
        const userDoc = snapshot.docs[0];
        const newPass = Math.random().toString(36).slice(-8); // Generate random 8-char password
        
        await updateDoc(doc(db, 'users', userDoc.id), {
          password: newPass
        });

        setResetResult({ 
          success: true, 
          message: `Password updated for ${userDoc.data().name || resetUserId}`,
          newPass: newPass
        });
        setResetUserId('');
      }
    } catch (error) {
      console.error(error);
      setResetResult({ success: false, message: 'An error occurred while resetting password.' });
    } finally {
      setLoading(false);
    }
  };

  // --- Admin Management Logic ---
  const handleAddAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAdmin.email || !newAdmin.password) return;
    
    setIsAdminLoading(true);
    try {
      // Check if email exists
      const q = query(collection(db, 'admins'), where('email', '==', newAdmin.email));
      const snap = await getDocs(q);
      
      if (!snap.empty) {
        alert('Admin with this email already exists.');
        setIsAdminLoading(false);
        return;
      }

      await addDoc(collection(db, 'admins'), {
        email: newAdmin.email,
        password: newAdmin.password,
        createdAt: new Date().toISOString(),
        role: 'admin'
      });
      
      setNewAdmin({ email: '', password: '' });
      alert('New admin added successfully.');
    } catch (e) {
      console.error("Error adding admin", e);
      alert("Failed to add admin.");
    } finally {
      setIsAdminLoading(false);
    }
  };

  const handleDeleteAdmin = async (id: string) => {
    if (window.confirm("Are you sure you want to remove this admin? They will lose access.")) {
      try {
        await deleteDoc(doc(db, 'admins', id));
      } catch (e) {
        console.error("Error removing admin", e);
      }
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">Settings</h2>
      
      {/* ADMIN MANAGEMENT SECTION */}
      <Card title="Admin Access Management">
        <p className="text-sm text-gray-600 mb-4">Manage who has administrative access to this portal.</p>
        
        <form onSubmit={handleAddAdmin} className="bg-gray-50 p-4 rounded-lg border border-gray-200 mb-6">
          <h4 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
            <Plus className="w-4 h-4" /> Add New Admin
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <Input 
              label="Email Address" 
              placeholder="admin@example.com"
              value={newAdmin.email}
              onChange={e => setNewAdmin({...newAdmin, email: e.target.value})}
              required
              type="email"
              className="bg-white"
            />
            <Input 
              label="Password" 
              placeholder="Set password"
              value={newAdmin.password}
              onChange={e => setNewAdmin({...newAdmin, password: e.target.value})}
              required
              type="text"
              className="bg-white"
            />
            <div className="mb-4">
              <Button type="submit" icon={Shield} isLoading={isAdminLoading} className="w-full md:w-auto">
                Create Admin
              </Button>
            </div>
          </div>
        </form>

        <div className="overflow-hidden border rounded-lg">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created At</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {admins.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-6 py-4 text-center text-sm text-gray-500">
                    No specific admin accounts created yet. Default login active.
                  </td>
                </tr>
              ) : (
                admins.map((admin) => (
                  <tr key={admin.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{admin.email}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(admin.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button 
                        onClick={() => admin.id && handleDeleteAdmin(admin.id)}
                        className="text-red-600 hover:text-red-900 flex items-center justify-end ml-auto gap-1"
                      >
                        <Trash2 className="w-4 h-4" /> Remove
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* USER PASSWORD RESET SECTION */}
      <Card title="User Password Reset">
        <p className="text-sm text-gray-600 mb-4">Enter a User ID to generate a new random password for that user.</p>
        
        <form onSubmit={handleResetSubmit} className="flex flex-col md:flex-row gap-4 items-start md:items-end max-w-2xl">
          <div className="flex-1 w-full">
            <Input 
              label="User ID" 
              placeholder="NIOSA-AP-XXXX" 
              value={resetUserId}
              onChange={(e) => setResetUserId(e.target.value)}
              required
              icon={Search}
            />
          </div>
          <div className="mb-4">
             <Button type="submit" variant="danger" icon={RefreshCw} isLoading={loading}>Reset Password</Button>
          </div>
        </form>

        {resetResult && (
          <div className={`mt-4 p-4 rounded-lg border ${resetResult.success ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
            <p className="font-bold">{resetResult.success ? 'Success' : 'Error'}</p>
            <p>{resetResult.message}</p>
            
            {resetResult.newPass && (
              <div className="mt-3 p-3 bg-white rounded border border-green-100 flex items-center justify-between shadow-sm">
                <div className="flex flex-col">
                  <span className="text-xs text-gray-500 uppercase tracking-wider">New Password</span>
                  <span className="font-mono font-bold text-xl tracking-widest">{resetResult.newPass}</span>
                </div>
                <Button 
                  type="button" // Prevent form submission
                  variant="secondary" 
                  onClick={() => {navigator.clipboard.writeText(resetResult.newPass || ''); alert('Password Copied!')}}
                  icon={Copy}
                >
                  Copy
                </Button>
              </div>
            )}
          </div>
        )}
      </Card>

      {/* DATA MANAGEMENT */}
      <Card title="Data Management">
        <p className="text-sm text-gray-600 mb-4">Download comprehensive reports of all system activity.</p>
        <div className="flex gap-4">
          <Button variant="secondary" icon={Download} onClick={() => alert("CSV Generation would happen here")}>Download All Reports (CSV)</Button>
          <Button variant="secondary" icon={Download} onClick={() => alert("PDF Generation would happen here")}>Download Attendance (PDF)</Button>
        </div>
      </Card>

      {/* BRANDING */}
      <Card title="App Branding">
         <div className="space-y-4">
            <Input label="App Name" defaultValue="NIOS Axis Academy CRM" />
            <Input label="Footer Text" defaultValue="THIS APP MADE BY DRAP-S-COMPANYS" />
            <Button icon={Save}>Save Changes</Button>
         </div>
      </Card>

      <ConfirmModal 
        isOpen={showConfirmReset}
        title="Reset Password?"
        message={`Are you sure you want to reset the password for user ID "${resetUserId}"? The old password will stop working immediately.`}
        onConfirm={executeResetPassword}
        onCancel={() => setShowConfirmReset(false)}
        confirmText="Reset Password"
        isDestructive={true}
      />
    </div>
  );
};

export default AdminSettings;
