import React, { useState, useEffect } from 'react';
import { collection, addDoc, getDocs, query, orderBy, updateDoc, doc } from 'firebase/firestore';
import { db } from '../../firebase';
import { Button, Input, Card, ConfirmModal, TextArea } from '../../components/UI';
import { UserData } from '../../types';
import { Copy, UserPlus, MessageCircle, Ban, CheckCircle, AlertTriangle } from 'lucide-react';

const AdminUsers: React.FC = () => {
  const [users, setUsers] = useState<UserData[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [newUser, setNewUser] = useState({ name: '', phone: '', address: '' });
  const [createdCreds, setCreatedCreds] = useState<{id: string, pass: string} | null>(null);
  
  // Suspension State
  const [suspendModal, setSuspendModal] = useState<{isOpen: boolean, userId: string | null, name: string}>({isOpen: false, userId: null, name: ''});
  const [suspendReason, setSuspendReason] = useState('');

  const fetchUsers = async () => {
    const q = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as UserData));
    setUsers(list);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const generateCredentials = () => {
    const randomId = Math.floor(1000 + Math.random() * 9000);
    const userId = `NIOSA-AP-${randomId}`;
    const password = Math.random().toString(36).slice(-8);
    return { userId, password };
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    const { userId, password } = generateCredentials();
    
    const userData: UserData = {
      userId,
      password,
      name: newUser.name || 'Unknown User',
      phone: newUser.phone,
      address: newUser.address,
      profileCompleted: false,
      createdAt: new Date().toISOString(),
      isActive: true,
      status: 'active'
    };

    try {
      await addDoc(collection(db, 'users'), userData);
      setCreatedCreds({ id: userId, pass: password });
      setNewUser({ name: '', phone: '', address: '' });
      setIsCreating(false);
      fetchUsers();
    } catch (err) {
      console.error("Error creating user", err);
    }
  };

  const sendWhatsApp = (phone: string, userId: string, pass: string) => {
    const msg = `Welcome to NIOS Axis Academy!\n\nHere are your login details:\nUser ID: ${userId}\nPassword: ${pass}\n\nPlease login and complete your profile.`;
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  // --- SUSPENSION LOGIC ---
  const toggleUserStatus = async (user: UserData) => {
    if (!user.id) return;

    // If currently suspended, activate immediately
    if (user.status === 'suspended') {
       if (window.confirm(`Reactivate ${user.name}? They will be able to login immediately.`)) {
         await updateDoc(doc(db, 'users', user.id), {
           status: 'active',
           isActive: true,
           suspendReason: ''
         });
         fetchUsers();
       }
    } else {
      // If active, open modal to ask for reason
      setSuspendModal({ isOpen: true, userId: user.id, name: user.name });
    }
  };

  const confirmSuspend = async () => {
    if (!suspendModal.userId) return;
    
    try {
      await updateDoc(doc(db, 'users', suspendModal.userId), {
        status: 'suspended',
        isActive: false,
        suspendReason: suspendReason || 'Admin Decision'
      });
      setSuspendModal({ isOpen: false, userId: null, name: '' });
      setSuspendReason('');
      fetchUsers();
    } catch (e) {
      console.error(e);
      alert("Failed to suspend user.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">User Management</h2>
        <Button onClick={() => setIsCreating(!isCreating)} icon={UserPlus}>
          {isCreating ? 'Cancel' : 'Add User'}
        </Button>
      </div>

      {/* Success/Copy Modal */}
      {createdCreds && (
        <Card className="bg-green-50 border-green-200 mb-6">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-lg font-bold text-green-900">User Created Successfully!</h3>
              <p className="text-green-800 mt-2">
                User ID: <span className="font-mono font-bold">{createdCreds.id}</span><br/>
                Password: <span className="font-mono font-bold">{createdCreds.pass}</span>
              </p>
            </div>
            <div className="space-x-2">
               <Button variant="secondary" className="text-sm" onClick={() => {
                 navigator.clipboard.writeText(`ID: ${createdCreds.id}\nPass: ${createdCreds.pass}`);
                 alert('Copied!');
               }}>
                 <Copy className="w-4 h-4" /> Copy
               </Button>
               <Button className="bg-green-600 hover:bg-green-700 text-white text-sm" onClick={() => sendWhatsApp(users[0]?.phone || '', createdCreds.id, createdCreds.pass)}>
                 <MessageCircle className="w-4 h-4" /> Send WA
               </Button>
            </div>
          </div>
        </Card>
      )}

      {isCreating && (
        <Card title="Create New User" className="mb-6 animate-fade-in">
          <form onSubmit={handleCreateUser} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input 
              label="Full Name" 
              value={newUser.name} 
              onChange={e => setNewUser({...newUser, name: e.target.value})} 
              required 
            />
            <Input 
              label="Phone Number (with country code)" 
              placeholder="919876543210"
              value={newUser.phone} 
              onChange={e => setNewUser({...newUser, phone: e.target.value})} 
              required 
            />
            <Input 
              label="Address" 
              value={newUser.address} 
              onChange={e => setNewUser({...newUser, address: e.target.value})} 
              required 
              className="md:col-span-2"
            />
            <div className="md:col-span-2">
              <Button type="submit">Generate ID & Create</Button>
            </div>
          </form>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {users.map(user => {
          const displayName = user.name || "Unknown";
          const initial = displayName.charAt(0) || "?";
          const isSuspended = user.status === 'suspended';
          
          return (
            <Card key={user.userId || Math.random()} className={`flex flex-col justify-between relative overflow-hidden ${isSuspended ? 'bg-red-50 border-red-200' : ''}`}>
              {isSuspended && (
                 <div className="absolute top-0 right-0 bg-red-600 text-white text-xs px-3 py-1 rounded-bl-lg font-bold flex items-center gap-1">
                   <Ban className="w-3 h-3" /> SUSPENDED
                 </div>
              )}
              
              <div className="flex items-start justify-between mb-4 pt-2">
                <div className="flex items-center">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold overflow-hidden ${isSuspended ? 'bg-red-200 text-red-700' : 'bg-gray-200 text-gray-500'}`}>
                    {user.photoBase64 ? <img src={user.photoBase64} alt={displayName} className="w-full h-full object-cover" /> : initial}
                  </div>
                  <div className="ml-3">
                    <h4 className="font-bold text-gray-900">{displayName}</h4>
                    <p className="text-sm text-brand-600 font-mono">{user.userId}</p>
                  </div>
                </div>
              </div>
              
              <div className="text-sm text-gray-600 space-y-1 mb-4">
                <p>📞 {user.phone}</p>
                <p>📍 {user.address}</p>
                <p className="font-mono text-xs bg-gray-100 inline-block px-2 py-1 rounded mt-1">Pass: {user.password}</p>
                {isSuspended && user.suspendReason && (
                   <p className="text-red-600 text-xs mt-2 italic border-l-2 border-red-300 pl-2">"{user.suspendReason}"</p>
                )}
              </div>

              <div className="flex gap-2">
                <Button variant="secondary" className="flex-1 text-sm" icon={MessageCircle} onClick={() => sendWhatsApp(user.phone, user.userId, user.password || '')}>
                  Login Info
                </Button>
                <Button 
                  variant={isSuspended ? 'primary' : 'danger'} 
                  className={`flex-1 text-sm ${isSuspended ? 'bg-green-600 hover:bg-green-700' : ''}`}
                  icon={isSuspended ? CheckCircle : Ban} 
                  onClick={() => toggleUserStatus(user)}
                >
                  {isSuspended ? 'Activate' : 'Suspend'}
                </Button>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Suspend Reason Modal */}
      <ConfirmModal 
        isOpen={suspendModal.isOpen}
        title={`Suspend ${suspendModal.name}?`}
        message="This user will be blocked from logging in immediately."
        confirmText="Suspend User"
        isDestructive={true}
        onCancel={() => setSuspendModal({isOpen: false, userId: null, name: ''})}
        onConfirm={confirmSuspend}
      />
      {/* Inject Input into Modal hack (since ConfirmModal doesn't support children in this simple version, I'll overlay a div or just assume simplistic usage. 
         Actually, let's make a custom simple modal for this right here to capture input) */}
      
      {suspendModal.isOpen && (
         <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm p-4">
           <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full p-6">
              <h3 className="text-lg font-bold text-red-900 flex items-center gap-2">
                 <AlertTriangle className="w-5 h-5" /> Suspend User
              </h3>
              <p className="text-sm text-gray-500 mt-1">Why are you suspending {suspendModal.name}?</p>
              
              <TextArea 
                className="mt-4"
                placeholder="Reason (e.g. Not submitting work)"
                value={suspendReason}
                onChange={e => setSuspendReason(e.target.value)}
              />
              
              <div className="flex justify-end gap-3 mt-4">
                 <Button variant="secondary" onClick={() => setSuspendModal({isOpen: false, userId: null, name: ''})}>Cancel</Button>
                 <Button variant="danger" onClick={confirmSuspend}>Confirm Suspension</Button>
              </div>
           </div>
         </div>
      )}

    </div>
  );
};

export default AdminUsers;