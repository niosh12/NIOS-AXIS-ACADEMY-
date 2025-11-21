import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, orderBy, updateDoc, doc } from 'firebase/firestore';
import { db } from '../../firebase';
import { Button, Card, Badge, TextArea, ConfirmModal } from '../../components/UI';
import { WorkReport } from '../../types';
import { Check, X, MessageCircle, Star } from 'lucide-react';

const AdminReports: React.FC = () => {
  const [reports, setReports] = useState<WorkReport[]>([]);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [adminInput, setAdminInput] = useState<{remark: string, rating: number}>({ remark: '', rating: 5 });
  
  // Confirmation State
  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean;
    reportId: string | null;
    status: 'approved' | 'rejected' | null;
  }>({ isOpen: false, reportId: null, status: null });

  const fetchReports = async () => {
    const q = query(collection(db, 'reports'), orderBy('date', 'desc'));
    const snap = await getDocs(q);
    setReports(snap.docs.map(d => ({ id: d.id, ...d.data() } as WorkReport)));
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const initiateAction = (reportId: string, status: 'approved' | 'rejected') => {
    setConfirmState({ isOpen: true, reportId, status });
  };

  const handleConfirmAction = async () => {
    const { reportId, status } = confirmState;
    if (!reportId || !status) return;

    setConfirmState({ ...confirmState, isOpen: false }); // Close modal immediately

    try {
      const ref = doc(db, 'reports', reportId);
      await updateDoc(ref, {
        status,
        adminRemark: adminInput.remark,
        adminRating: adminInput.rating
      });
      
      // Reset and refresh
      setProcessingId(null);
      setAdminInput({ remark: '', rating: 5 });
      fetchReports();
      
      // Find report to send WA (optional)
      const report = reports.find(r => r.id === reportId);
      if (report && status === 'approved') {
         // Optional: Auto open WA
      }
    } catch (e) {
      console.error(e);
    }
  };

  const openWhatsApp = (status: string) => {
    // In a real app, retrieve user phone. Assuming generic link for demo.
    window.open(`https://wa.me/?text=Your+Report+Status+${status}`, '_blank');
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">Daily Work Reports</h2>
      
      <div className="space-y-4">
        {reports.map(report => (
          <Card key={report.id} className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 space-y-2">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-bold text-lg text-gray-900">{report.userName} <span className="text-sm font-normal text-gray-500">({report.userId})</span></h3>
                  <p className="text-sm text-gray-500">{new Date(report.date).toDateString()}</p>
                </div>
                <Badge status={report.status} />
              </div>
              
              <div className="bg-gray-50 p-3 rounded-lg text-sm space-y-2">
                <p><span className="font-semibold">Completed:</span> {report.completeWork}</p>
                <p><span className="font-semibold">Pending:</span> {report.pendingWork}</p>
                <p><span className="font-semibold">Plan:</span> {report.nextDayPlan}</p>
                {report.userRemark && <p className="italic text-gray-500">" {report.userRemark} "</p>}
              </div>

              {report.status !== 'submitted' && (
                <div className="mt-2 text-sm border-t pt-2">
                  <p><span className="font-semibold text-brand-600">Admin Remark:</span> {report.adminRemark || 'None'}</p>
                  <div className="flex items-center text-yellow-500">
                    <span className="text-gray-600 font-semibold mr-2">Rating:</span>
                    {Array.from({ length: report.adminRating || 0 }).map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-current" />
                    ))}
                  </div>
                </div>
              )}
            </div>

            {report.status === 'submitted' && (
               <div className="md:w-64 flex flex-col space-y-3 border-l pl-4 border-gray-100">
                 {processingId === report.id ? (
                   <div className="space-y-2 animate-fade-in">
                     <label className="text-xs font-semibold text-gray-600">Rating (1-5)</label>
                     <input 
                       type="range" min="1" max="5" 
                       value={adminInput.rating} 
                       onChange={e => setAdminInput({...adminInput, rating: parseInt(e.target.value)})}
                       className="w-full"
                     />
                     <div className="flex text-yellow-500 justify-center mb-1">
                        {Array.from({ length: adminInput.rating }).map((_, i) => <Star key={i} className="w-4 h-4 fill-current" />)}
                     </div>
                     <TextArea 
                       placeholder="Remark..." 
                       value={adminInput.remark} 
                       onChange={e => setAdminInput({...adminInput, remark: e.target.value})}
                       rows={2}
                     />
                     <div className="flex gap-2">
                        <Button size="sm" variant="primary" className="flex-1 bg-green-600" onClick={() => initiateAction(report.id!, 'approved')}>Approve</Button>
                        <Button size="sm" variant="danger" className="flex-1" onClick={() => initiateAction(report.id!, 'rejected')}>Reject</Button>
                     </div>
                     <Button size="sm" variant="secondary" className="w-full" onClick={() => setProcessingId(null)}>Cancel</Button>
                   </div>
                 ) : (
                   <Button onClick={() => setProcessingId(report.id!)}>Review Report</Button>
                 )}
               </div>
            )}

            {report.status !== 'submitted' && (
              <div className="md:w-32 flex items-center justify-center border-l border-gray-100 pl-4">
                 <Button variant="secondary" icon={MessageCircle} onClick={() => openWhatsApp(report.status)}>
                   Notify
                 </Button>
              </div>
            )}
          </Card>
        ))}
        
        {reports.length === 0 && <p className="text-center text-gray-500">No reports found.</p>}
      </div>

      <ConfirmModal 
        isOpen={confirmState.isOpen}
        title={confirmState.status === 'approved' ? "Approve Report?" : "Reject Report?"}
        message={`Are you sure you want to ${confirmState.status} this report? This action cannot be easily undone.`}
        onConfirm={handleConfirmAction}
        onCancel={() => setConfirmState({ ...confirmState, isOpen: false })}
        confirmText={confirmState.status === 'approved' ? "Approve" : "Reject"}
        isDestructive={confirmState.status === 'rejected'}
      />
    </div>
  );
};

export default AdminReports;