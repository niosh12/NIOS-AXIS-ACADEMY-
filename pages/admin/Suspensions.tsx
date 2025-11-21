
import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, orderBy, updateDoc, doc, where, getDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { Button, Card, Badge } from '../../components/UI';
import { SuspensionRequest } from '../../types';
import { Check, X, MessageCircle, UserCheck } from 'lucide-react';

const AdminSuspensions: React.FC = () => {
  const [requests, setRequests] = useState<SuspensionRequest[]>([]);

  const fetchRequests = async () => {
    const q = query(collection(db, 'suspension_requests'), orderBy('requestDate', 'desc'));
    const snap = await getDocs(q);
    setRequests(snap.docs.map(d => ({ id: d.id, ...d.data() } as SuspensionRequest)));
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleAppeal = async (req: SuspensionRequest, action: 'approve' | 'reject') => {
    if (!req.id) return;

    try {
      const reqRef = doc(db, 'suspension_requests', req.id);

      if (action === 'reject') {
        await updateDoc(reqRef, { status: 'rejected' });
      } else {
        // 1. Approve the Request
        await updateDoc(reqRef, { status: 'approved' });
        
        // 2. Find the User and Reactivate
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('userId', '==', req.userId));
        const snap = await getDocs(q);
        
        if (!snap.empty) {
           const userDoc = snap.docs[0];
           await updateDoc(doc(db, 'users', userDoc.id), {
             status: 'active',
             isActive: true,
             suspendReason: '' // Clear the bad mark
           });
        }
      }
      fetchRequests();
    } catch (e) {
      console.error(e);
      alert("Action failed");
    }
  };

  const openWhatsApp = (phone: string) => {
    window.open(`https://wa.me/${phone}`, '_blank');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
         <div className="p-3 bg-red-100 rounded-full text-red-600">
           <UserCheck className="w-6 h-6" />
         </div>
         <div>
           <h2 className="text-2xl font-bold text-gray-800">Reactivation Requests</h2>
           <p className="text-sm text-gray-500">Review appeals from suspended users.</p>
         </div>
      </div>
      
      <div className="grid gap-4">
        {requests.length === 0 && <p className="text-gray-400 text-center py-8">No requests pending.</p>}

        {requests.map(req => (
          <Card key={req.id} className={`flex flex-col md:flex-row justify-between gap-4 ${req.status === 'pending' ? 'border-l-4 border-l-yellow-400' : 'opacity-75'}`}>
            <div className="flex-1">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-bold text-lg text-gray-900">{req.userName} <span className="text-sm font-normal text-gray-500">({req.userId})</span></h3>
                  <p className="text-sm text-gray-500">{req.phone}</p>
                </div>
                <Badge status={req.status} />
              </div>
              
              <div className="mt-3 bg-gray-50 p-3 rounded-lg border border-gray-100">
                <p className="text-xs text-gray-400 uppercase font-bold mb-1">Appeal Message:</p>
                <p className="text-gray-800 italic">"{req.reason}"</p>
              </div>
              <p className="text-xs text-gray-400 mt-2">{new Date(req.requestDate).toLocaleString()}</p>
            </div>

            <div className="flex flex-col justify-center gap-2 md:w-48 border-l border-gray-100 pl-0 md:pl-4">
               {req.status === 'pending' ? (
                 <>
                   <Button size="sm" className="bg-green-600 justify-center" onClick={() => handleAppeal(req, 'approve')}>
                     <Check className="w-4 h-4 mr-2" /> Reactivate
                   </Button>
                   <Button size="sm" variant="danger" className="justify-center" onClick={() => handleAppeal(req, 'reject')}>
                     <X className="w-4 h-4 mr-2" /> Reject
                   </Button>
                   <Button size="sm" variant="secondary" className="justify-center" onClick={() => openWhatsApp(req.phone)}>
                     <MessageCircle className="w-4 h-4 mr-2" /> Chat
                   </Button>
                 </>
               ) : (
                 <div className="text-center text-sm text-gray-500 italic">
                   Processed
                 </div>
               )}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default AdminSuspensions;
