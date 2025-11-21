
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../App';
import { Card, Button, Input } from '../../components/UI';
import { addDoc, collection, doc, updateDoc, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase';
import { User, MapPin, Phone, Camera, Lock, Clock, AlertTriangle, CheckCircle } from 'lucide-react';
import { CorrectionRequest } from '../../types';

const UserProfile: React.FC = () => {
  const { user, updateUser } = useAuth();
  
  // Request State
  const [isRequesting, setIsRequesting] = useState(false);
  const [reqField, setReqField] = useState<'Name' | 'Number' | 'Address' | 'Photo'>('Name');
  const [reqValue, setReqValue] = useState('');
  
  // Active Correction State (The one approved)
  const [activeCorrection, setActiveCorrection] = useState<CorrectionRequest | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(0); // Seconds
  const [editValue, setEditValue] = useState('');
  const [editPhoto, setEditPhoto] = useState<string | null>(null);
  const [pendingRequest, setPendingRequest] = useState<CorrectionRequest | null>(null);

  // Load Corrections
  useEffect(() => {
    if (!user?.userId) return;

    const q = query(
      collection(db, 'corrections'), 
      where('userId', '==', user.userId)
    );

    const unsub = onSnapshot(q, (snap) => {
      const reqs = snap.docs.map(d => ({ id: d.id, ...d.data() } as CorrectionRequest));
      
      // Check for Pending
      const pending = reqs.find(r => r.status === 'pending');
      setPendingRequest(pending || null);

      // Check for Approved (Active Window)
      const approved = reqs.find(r => r.status === 'approved');
      if (approved && approved.approvedAt) {
        const approvedTime = new Date(approved.approvedAt).getTime();
        const now = new Date().getTime();
        const diffSeconds = Math.floor((now - approvedTime) / 1000);
        const windowSeconds = 300; // 5 minutes

        if (diffSeconds < windowSeconds) {
          setActiveCorrection(approved);
          setTimeLeft(windowSeconds - diffSeconds);
          // Pre-fill edit value if text
          if (!editValue && approved.field !== 'Photo') {
            setEditValue(approved.newValue); 
          }
        } else {
          // Expired
          setActiveCorrection(null);
          // Optionally update status to expired in DB, but UI hiding is enough for safety
        }
      } else {
        setActiveCorrection(null);
      }
    });

    return () => unsub();
  }, [user?.userId]);

  // Timer Countdown
  useEffect(() => {
    if (!activeCorrection || timeLeft <= 0) return;

    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          setActiveCorrection(null); // Close window locally
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [activeCorrection, timeLeft]);

  // Handle Sending Request
  const submitRequest = async () => {
    if (!user) return;
    try {
      await addDoc(collection(db, 'corrections'), {
        userId: user.userId,
        userName: user.name,
        field: reqField,
        oldValue: reqField === 'Name' ? user.name : reqField === 'Number' ? user.phone : reqField === 'Address' ? user.address : 'Current Photo',
        newValue: reqField === 'Photo' ? 'New Photo Request' : reqValue,
        status: 'pending',
        requestDate: new Date().toISOString()
      });
      setIsRequesting(false);
      setReqValue('');
    } catch (e) {
      console.error(e);
      alert('Failed to send request');
    }
  };

  // Handle Final Update (During 5 min window)
  const submitUpdate = async () => {
    if (!user || !activeCorrection?.id) return;
    
    try {
      const userRef = doc(db, 'users', user.id!);
      const reqRef = doc(db, 'corrections', activeCorrection.id);

      // 1. Update User Profile
      if (activeCorrection.field === 'Photo') {
        if (!editPhoto) return alert("Please take a photo first");
        await updateDoc(userRef, { photoBase64: editPhoto });
        updateUser({ photoBase64: editPhoto });
      } else {
        const fieldMap = {
          'Name': 'name',
          'Number': 'phone',
          'Address': 'address'
        };
        // @ts-ignore
        await updateDoc(userRef, { [fieldMap[activeCorrection.field]]: editValue });
        // @ts-ignore
        updateUser({ [fieldMap[activeCorrection.field]]: editValue });
      }

      // 2. Mark Request as Completed (Close window)
      await updateDoc(reqRef, { status: 'completed' });
      setActiveCorrection(null);

    } catch (e) {
      console.error(e);
      alert('Update failed');
    }
  };

  // Helper for Camera
  const handleCameraCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setEditPhoto(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec < 10 ? '0' : ''}${sec}`;
  };

  if (!user) return null;

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      
      {/* PROFILE HEADER */}
      <Card className="text-center py-8 relative overflow-visible">
        <div className="w-32 h-32 mx-auto bg-gray-200 rounded-full mb-4 overflow-hidden border-4 border-white shadow-lg relative">
           {user.photoBase64 
             ? <img src={user.photoBase64} className="w-full h-full object-cover" alt="Profile" />
             : <User className="w-12 h-12 text-gray-400 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
           }
        </div>
        <h2 className="text-3xl font-bold text-gray-800">{user.name}</h2>
        <p className="text-brand-600 font-mono text-lg">{user.userId}</p>
        
        <div className="mt-6 flex flex-col gap-3 items-center text-gray-600">
          <div className="flex items-center gap-2 bg-gray-50 px-4 py-2 rounded-full">
            <Phone className="w-4 h-4" /> {user.phone}
          </div>
          <div className="flex items-center gap-2 bg-gray-50 px-4 py-2 rounded-full">
            <MapPin className="w-4 h-4" /> {user.address}
          </div>
        </div>
      </Card>

      {/* EDIT WINDOW (ACTIVE) */}
      {activeCorrection && (
        <div className="animate-in zoom-in duration-300">
          <div className="bg-green-600 text-white p-4 rounded-t-xl flex justify-between items-center shadow-lg">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-white/20 rounded-full"><Lock className="w-5 h-5" /></div>
              <div>
                <h3 className="font-bold">Edit Access Granted</h3>
                <p className="text-xs text-green-100">Update your {activeCorrection.field} now</p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-mono font-bold">{formatTime(timeLeft)}</div>
              <div className="text-xs text-green-100">Time Remaining</div>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-b-xl shadow-lg border-x border-b border-gray-100">
            {activeCorrection.field === 'Photo' ? (
              <div className="text-center">
                {editPhoto ? (
                  <div className="mb-4 relative rounded-lg overflow-hidden">
                    <img src={editPhoto} className="w-full h-64 object-cover" />
                    <button onClick={() => setEditPhoto(null)} className="absolute top-2 right-2 bg-black/50 text-white p-1 rounded-full"><AlertTriangle className="w-4 h-4"/></button>
                  </div>
                ) : (
                  <label className="block w-full p-8 border-2 border-dashed border-green-300 rounded-xl bg-green-50 cursor-pointer hover:bg-green-100 transition-colors mb-4">
                    <Camera className="w-12 h-12 text-green-600 mx-auto mb-2" />
                    <span className="block text-green-800 font-bold">Click to Take Photo</span>
                    <input type="file" accept="image/*" capture="user" className="hidden" onChange={handleCameraCapture} />
                  </label>
                )}
                <Button onClick={submitUpdate} className="w-full bg-green-600 hover:bg-green-700" disabled={!editPhoto}>
                  Save New Photo
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <Input 
                  label={`New ${activeCorrection.field}`} 
                  value={editValue} 
                  onChange={e => setEditValue(e.target.value)} 
                  className="text-lg"
                />
                <Button onClick={submitUpdate} className="w-full bg-green-600 hover:bg-green-700" icon={CheckCircle}>
                  Save Changes
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* REQUEST STATUS */}
      {pendingRequest && !activeCorrection && (
        <Card className="bg-yellow-50 border-yellow-100 flex items-center gap-4">
          <div className="p-3 bg-yellow-200 rounded-full text-yellow-800">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <h4 className="font-bold text-yellow-900">Correction Pending</h4>
            <p className="text-sm text-yellow-800">Admin is reviewing your request to change <span className="font-bold">{pendingRequest.field}</span>.</p>
          </div>
        </Card>
      )}

      {/* REQUEST FORM (Default) */}
      {!activeCorrection && !pendingRequest && (
        <Card title="Request Correction">
          {!isRequesting ? (
            <div className="text-center py-4">
              <p className="text-gray-500 mb-4">Need to update your profile details? Request a 5-minute edit window.</p>
              <Button onClick={() => setIsRequesting(true)} variant="outline">Request Profile Update</Button>
            </div>
          ) : (
            <div className="space-y-4 animate-fade-in">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">What do you want to change?</label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {['Name', 'Number', 'Address', 'Photo'].map((f) => (
                    <button
                      key={f}
                      onClick={() => { setReqField(f as any); setReqValue(''); }}
                      className={`py-2 px-3 rounded-lg text-sm font-medium border transition-all ${
                        reqField === f 
                          ? 'bg-brand-600 text-white border-brand-600' 
                          : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>

              {reqField !== 'Photo' && (
                <Input 
                  label="Proposed New Value" 
                  placeholder={`Enter correct ${reqField}`}
                  value={reqValue}
                  onChange={e => setReqValue(e.target.value)}
                />
              )}
              
              {reqField === 'Photo' && (
                <div className="p-4 bg-gray-50 rounded-lg text-sm text-gray-600 flex items-center gap-2">
                  <Camera className="w-4 h-4" />
                  You will be asked to take a live photo once approved.
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <Button variant="secondary" onClick={() => setIsRequesting(false)} className="flex-1">Cancel</Button>
                <Button onClick={submitRequest} className="flex-1">Send Request</Button>
              </div>
            </div>
          )}
        </Card>
      )}

    </div>
  );
};

export default UserProfile;
