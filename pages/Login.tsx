import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../App';
import { loginUser as loginUserService } from '../services/authService';
import { Button, Input, Card, TextArea } from '../components/UI';
import { Lock, User, ShieldCheck, AlertOctagon, Send, XCircle } from 'lucide-react';
import { addDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { UserData } from '../types';

const Login: React.FC = () => {
  const [mode, setMode] = useState<'user' | 'admin'>('user');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Suspension State
  const [suspendedUser, setSuspendedUser] = useState<UserData | null>(null);
  const [appealReason, setAppealReason] = useState('');
  const [appealSent, setAppealSent] = useState(false);

  const { loginAdmin, loginUser } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (mode === 'admin') {
        if (identifier.includes('@') && password.length > 0) {
          loginAdmin();
          navigate('/admin');
        } else {
          setError('Please enter a valid email and password.');
        }
      } else {
        // User Login
        const user = await loginUserService(identifier, password);
        
        if (user) {
          // CHECK SUSPENSION STATUS
          if (user.status === 'suspended') {
            setSuspendedUser(user); // Show suspended screen
            setLoading(false);
            return;
          }

          loginUser(user);
          navigate('/user');
        } else {
          setError('Invalid User ID or Password.');
        }
      }
    } catch (err) {
      setError('An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const handleSuspensionAppeal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!suspendedUser) return;
    setLoading(true);

    try {
      // Check if pending request exists to prevent spam
      const q = query(collection(db, 'suspension_requests'), 
        where('userId', '==', suspendedUser.userId),
        where('status', '==', 'pending')
      );
      const snap = await getDocs(q);

      if (!snap.empty) {
        setAppealSent(true);
        setLoading(false);
        return;
      }

      await addDoc(collection(db, 'suspension_requests'), {
        userId: suspendedUser.userId,
        userName: suspendedUser.name,
        phone: suspendedUser.phone,
        reason: appealReason,
        status: 'pending',
        requestDate: new Date().toISOString()
      });

      setAppealSent(true);
    } catch (e) {
      console.error(e);
      alert("Failed to send request. Please contact admin directly.");
    } finally {
      setLoading(false);
    }
  };

  // --- SUSPENDED VIEW ---
  if (suspendedUser) {
    return (
      <div className="min-h-screen bg-red-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <Card className="border-t-4 border-red-600 shadow-2xl animate-in zoom-in duration-300">
            <div className="text-center mb-6">
              <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertOctagon className="w-10 h-10 text-red-600" />
              </div>
              <h2 className="text-2xl font-bold text-red-700">Account Suspended</h2>
              <p className="text-gray-600 mt-2">Access to the CRM Portal has been restricted.</p>
              {suspendedUser.suspendReason && (
                <div className="bg-red-50 p-3 rounded-lg mt-4 border border-red-100 text-sm text-red-800 font-medium">
                  Reason: "{suspendedUser.suspendReason}"
                </div>
              )}
            </div>

            {!appealSent ? (
              <form onSubmit={handleSuspensionAppeal} className="space-y-4">
                <div className="bg-gray-50 p-4 rounded-lg space-y-2 text-sm border border-gray-200">
                  <div className="flex justify-between">
                    <span className="text-gray-500">User ID:</span>
                    <span className="font-mono font-bold text-gray-800">{suspendedUser.userId}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Name:</span>
                    <span className="font-bold text-gray-800">{suspendedUser.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Phone:</span>
                    <span className="font-bold text-gray-800">{suspendedUser.phone}</span>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Request Reactivation</label>
                  <TextArea 
                    placeholder="Explain why your account should be reactivated (e.g., I was sick, I will submit work)..."
                    value={appealReason}
                    onChange={e => setAppealReason(e.target.value)}
                    required
                    rows={3}
                  />
                </div>

                <div className="flex gap-3">
                  <Button type="button" variant="secondary" className="flex-1" onClick={() => { setSuspendedUser(null); setIdentifier(''); setPassword(''); }}>
                    Back
                  </Button>
                  <Button type="submit" variant="danger" className="flex-1 bg-red-600 hover:bg-red-700" isLoading={loading} icon={Send}>
                    Submit Request
                  </Button>
                </div>
              </form>
            ) : (
              <div className="text-center py-6">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Send className="w-6 h-6 text-green-600" />
                </div>
                <h3 className="font-bold text-green-800 text-lg">Request Submitted</h3>
                <p className="text-sm text-gray-600 mt-2">Our admin team will review your request shortly. You will be able to login once approved.</p>
                <Button variant="outline" className="mt-6 w-full" onClick={() => { setSuspendedUser(null); setIdentifier(''); setPassword(''); }}>
                  Return to Login
                </Button>
              </div>
            )}
          </Card>
          <p className="text-center text-red-300 text-xs mt-6">Contact Admin: admin@niosa.com</p>
        </div>
      </div>
    );
  }

  // --- NORMAL LOGIN VIEW ---
  return (
    <div className="min-h-screen bg-brand-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-brand-900 mb-2">NIOS Axis Academy</h1>
          <p className="text-brand-700">CRM Portal Login</p>
        </div>

        <Card className="shadow-xl border-0">
          <div className="flex mb-6 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => { setMode('user'); setError(''); }}
              className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${mode === 'user' ? 'bg-white shadow text-brand-600' : 'text-gray-500 hover:text-gray-700'}`}
            >
              User Login
            </button>
            <button
              onClick={() => { setMode('admin'); setError(''); }}
              className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${mode === 'admin' ? 'bg-white shadow text-brand-600' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Admin Login
            </button>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="text-center mb-4">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-brand-100 mb-4">
                {mode === 'user' ? <User className="w-8 h-8 text-brand-600" /> : <ShieldCheck className="w-8 h-8 text-brand-600" />}
              </div>
              <h2 className="text-xl font-semibold text-gray-800">
                {mode === 'user' ? 'Staff Login' : 'Administrator Access'}
              </h2>
            </div>

            {error && <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg text-center flex items-center justify-center gap-2"><XCircle className="w-4 h-4"/> {error}</div>}

            <Input
              label={mode === 'user' ? "User ID" : "Email Address"}
              placeholder={mode === 'user' ? "NIOSA-AP-0001" : "admin@niosa.com"}
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              required
              icon={User}
            />

            <Input
              label="Password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              icon={Lock}
            />

            <Button type="submit" className="w-full py-3 text-lg" isLoading={loading}>
              {mode === 'user' ? 'Login to Portal' : 'Access Dashboard'}
            </Button>
          </form>
        </Card>
        
        <p className="text-center text-gray-400 text-xs mt-8">
          Protected System • DRAP-S-COMPANYS
        </p>
      </div>
    </div>
  );
};

export default Login;