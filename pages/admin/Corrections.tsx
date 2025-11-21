
import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, orderBy, updateDoc, doc } from 'firebase/firestore';
import { db } from '../../firebase';
import { Button, Card, Badge } from '../../components/UI';
import { CorrectionRequest } from '../../types';
import { Check, X, Clock } from 'lucide-react';

const AdminCorrections: React.FC = () => {
  const [requests, setRequests] = useState<CorrectionRequest[]>([]);

  const fetchRequests = async () => {
    const q = query(collection(db, 'corrections'), orderBy('requestDate', 'desc'));
    const snap = await getDocs(q);
    setRequests(snap.docs.map(d => ({ id: d.id, ...d.data() } as CorrectionRequest)));
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleRequest = async (req: CorrectionRequest, status: 'approved' | 'rejected') => {
    if (!req.id) return;
    try {
      const reqRef = doc(db, 'corrections', req.id);
      
      if (status === 'approved') {
        // Approve: Set status AND timestamp to start the user's 5-minute timer
        await updateDoc(reqRef, { 
          status: 'approved',
          approvedAt: new Date().toISOString() 
        });
      } else {
        // Reject
        await updateDoc(reqRef, { status: 'rejected' });
      }
      
      fetchRequests();
    } catch (e) {
      console.error(e);
      alert("Error updating request");
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">Correction Requests</h2>
      <p className="text-sm text-gray-500">Approve requests to give users a 5-minute window to edit their profile.</p>
      
      <div className="grid gap-4">
        {requests.map(req => (
          <Card key={req.id} className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                 <h3 className="font-bold text-gray-900">{req.userName}</h3>
                 <span className="text-xs text-gray-400 font-mono">{req.userId}</span>
              </div>
              <p className="text-sm">Request to change <span className="font-bold text-brand-600">{req.field}</span></p>
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mt-2 text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 uppercase">Current:</span>
                  <span className="line-through text-red-400">{req.oldValue}</span>
                </div>
                <div className="hidden sm:block text-gray-400">→</div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 uppercase">Proposed:</span>
                  <span className="font-bold text-green-600 break-all">{req.field === 'Photo' ? '(New Photo)' : req.newValue}</span>
                </div>
              </div>
              <p className="text-xs text-gray-400 mt-2">{new Date(req.requestDate).toLocaleString()}</p>
            </div>
            
            <div className="flex flex-col items-end gap-2 w-full md:w-auto">
              <Badge status={req.status} />
              
              {req.status === 'pending' && (
                <div className="flex gap-2 mt-2 w-full md:w-auto">
                  <Button size="sm" className="bg-green-600 flex-1 md:flex-none justify-center" onClick={() => handleRequest(req, 'approved')}>
                    <Check className="w-4 h-4 mr-1" /> Approve
                  </Button>
                  <Button size="sm" variant="danger" className="flex-1 md:flex-none justify-center" onClick={() => handleRequest(req, 'rejected')}>
                    <X className="w-4 h-4 mr-1" /> Reject
                  </Button>
                </div>
              )}

              {req.status === 'approved' && (
                <div className="text-xs text-green-600 flex items-center mt-1">
                  <Clock className="w-3 h-3 mr-1" /> User has 5 mins to edit
                </div>
              )}
            </div>
          </Card>
        ))}
        {requests.length === 0 && <p className="text-gray-500 text-center py-8">No correction requests found.</p>}
      </div>
    </div>
  );
};

export default AdminCorrections;
