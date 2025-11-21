

import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, updateDoc, doc, addDoc, deleteDoc, onSnapshot, orderBy, setDoc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { Card, Button, Input, ConfirmModal } from '../../components/UI';
import { Download, Save, RefreshCw, Copy, Search, Plus, Trash2, Shield, MapPin, Navigation } from 'lucide-react';
import { AdminData, SystemSettings } from '../../types';

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

  // Geofencing State
  const [geoSettings, setGeoSettings] = useState<SystemSettings>({
    officeLat: 0,
    officeLng: 0,
    allowedRadius: 50,
    enableGeofencing: false
  });
  const [savingGeo, setSavingGeo] = useState(false);

  // Fetch Data
  useEffect(() => {
    // 1. Fetch Admins
    const qAdmin = query(collection(db, 'admins'), orderBy('createdAt', 'desc'));
    const unsubAdmin = onSnapshot(qAdmin, (snap) => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as AdminData))
        .filter(a => a.createdAt && !isNaN(new Date(a.createdAt).getTime()));
      setAdmins(list);
    });

    // 2. Fetch System Settings
    const fetchSettings = async () => {
      try {
        const docRef = doc(db, 'settings', 'attendance_config');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setGeoSettings(docSnap.data() as SystemSettings);
        }
      } catch (e) {
        console.error("Error fetching settings", e);
      }
    };
    fetchSettings();

    return () => unsubAdmin();
  }, []);

  // --- Geofencing Logic ---
  const saveGeoSettings = async () => {
    setSavingGeo(true);
    try {
      await setDoc(doc(db, 'settings', 'attendance_config'), geoSettings);
      alert("Geofencing settings saved successfully.");
    } catch (e) {
      console.error(e);
      alert("Failed to save settings.");
    } finally {
      setSavingGeo(false);
    }
  };

  const setCurrentLocationAsOffice = () => {
    if (!navigator.geolocation) return alert("Geolocation not supported");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGeoSettings(prev => ({
          ...prev,
          officeLat: pos.coords.latitude,
          officeLng: pos.coords.longitude
        }));
      },
      (err) => alert("Could not get location: " + err.message),
      { enableHighAccuracy: true }
    );
  };

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
      
      {/* GEOFENCING CONFIG */}
      <Card title="Attendance Geofencing" className="border-l-4 border-l-brand-500">
        <div className="flex items-start gap-4 mb-6">
          <div className="p-3 bg-blue-100 rounded-full text-blue-600 hidden md:block">
            <MapPin className="w-6 h-6" />
          </div>
          <div className="flex-1">
             <p className="text-sm text-gray-600 mb-4">
               Restrict attendance marking to a specific office location. Users must be within the allowed radius to check in.
             </p>
             
             <div className="flex items-center mb-4">
               <input 
                 type="checkbox" 
                 id="enableGeo"
                 className="w-4 h-4 text-brand-600 rounded"
                 checked={geoSettings.enableGeofencing}
                 onChange={e => setGeoSettings({...geoSettings, enableGeofencing: e.target.checked})}
               />
               <label htmlFor="enableGeo" className="ml-2 text-gray-800 font-medium">Enable Geofencing Restriction</label>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
               <Input 
                 label="Office Latitude" 
                 type="number" 
                 step="any"
                 value={geoSettings.officeLat} 
                 onChange={e => setGeoSettings({...geoSettings, officeLat: parseFloat(e.target.value)})}
               />
               <Input 
                 label="Office Longitude" 
                 type="number" 
                 step="any"
                 value={geoSettings.officeLng} 
                 onChange={e => setGeoSettings({...geoSettings, officeLng: parseFloat(e.target.value)})}
               />
               <Input 
                 label="Radius (Meters)" 
                 type="number" 
                 value={geoSettings.allowedRadius} 
                 onChange={e => setGeoSettings({...geoSettings, allowedRadius: parseFloat(e.target.value)})}
               />
             </div>
             
             <div className="flex flex-col sm:flex-row gap-3 mt-2">
               <Button 
                 variant="secondary" 
                 onClick={setCurrentLocationAsOffice}
                 icon={Navigation}
                 className="text-xs sm:text-sm"
               >
                 Set Current Location
               </Button>
               <Button 
                 onClick={saveGeoSettings} 
                 isLoading={savingGeo}
                 icon={Save}
                 className="text-xs sm:text-sm bg-blue-600 hover:bg-blue-700"
               >
                 Save Geo Settings
               </Button>
             </div>
             
             {geoSettings.officeLat !== 0 && (
               <div className="mt-4 text-xs text-gray-500">
                 Current Config: <a href={`https://www.google.com/maps/search/?api=1&query=${geoSettings.officeLat},${geoSettings.officeLng}`} target="_blank" className="text-blue-600 underline">View on Map</a>
               </div>
             )}
          </div>
        </div>
      </Card>

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