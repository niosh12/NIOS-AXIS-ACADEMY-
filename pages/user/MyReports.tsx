import React, { useEffect, useState } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../App';
import { WorkReport } from '../../types';
import { Card, Badge } from '../../components/UI';
import { Star } from 'lucide-react';

const UserReports: React.FC = () => {
  const { user } = useAuth();
  const [reports, setReports] = useState<WorkReport[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (!user) return;
      
      try {
        // We query by userId only. 
        // Combining where('userId') + orderBy('date') requires a composite index in Firestore.
        // To avoid index creation errors for now, we fetch by userId and sort client-side.
        const q = query(
          collection(db, 'reports'), 
          where('userId', '==', user.userId)
        );
        
        const snap = await getDocs(q);
        const fetchedReports = snap.docs.map(d => ({ id: d.id, ...d.data() } as WorkReport));
        
        // Client-side sort: Newest date first
        fetchedReports.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        
        setReports(fetchedReports);
      } catch (e) {
        console.error("Error loading reports:", e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user]);

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-gray-800 mb-4">My Report History</h2>
      
      {loading && <div className="text-center py-8 text-gray-500">Loading reports...</div>}

      {!loading && reports.map(r => (
        <Card key={r.id} className="border-l-4 border-l-brand-500">
          <div className="flex justify-between items-start mb-2">
            <span className="font-bold text-gray-700">{new Date(r.date).toLocaleDateString()}</span>
            <Badge status={r.status} />
          </div>
          
          <div className="text-sm text-gray-600 space-y-1 mb-3">
            <p className="truncate">✅ {r.completeWork}</p>
            {r.pendingWork && <p className="truncate">⏳ {r.pendingWork}</p>}
          </div>

          {r.adminRating && (
             <div className="bg-yellow-50 p-2 rounded flex justify-between items-center">
               <div className="flex text-yellow-500">
                 {Array.from({ length: r.adminRating }).map((_, i) => <Star key={i} className="w-4 h-4 fill-current" />)}
               </div>
               {r.adminRemark && <span className="text-xs text-gray-600 italic">"{r.adminRemark}"</span>}
             </div>
          )}
        </Card>
      ))}
      
      {!loading && reports.length === 0 && <p className="text-center text-gray-400 mt-10">No reports submitted yet.</p>}
    </div>
  );
};

export default UserReports;