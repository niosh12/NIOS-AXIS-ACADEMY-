import React, { useEffect, useState } from 'react';
import { Card } from '../../components/UI';
import { collection, getCountFromServer, query, where } from 'firebase/firestore';
import { db } from '../../firebase';
import { Users, FileText, Clock, AlertTriangle } from 'lucide-react';

const AdminDashboard: React.FC = () => {
  const [stats, setStats] = useState({
    users: 0,
    reportsToday: 0,
    pendingCorrections: 0,
    rejectedReports: 0
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const usersColl = collection(db, 'users');
        const reportsColl = collection(db, 'reports');
        const correctionsColl = collection(db, 'corrections');

        // Helper to get start of today
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayIso = today.toISOString();

        const [userSnap, correctionSnap] = await Promise.all([
          getCountFromServer(usersColl),
          getCountFromServer(query(correctionsColl, where('status', '==', 'pending'))),
        ]);
        
        // Note: complex date queries might need indexes in Firestore, keeping it simple for now or mocked slightly if index fails
        // For simplicity in this demo, we might assume these work or just show totals if indexes aren't built
        
        setStats({
          users: userSnap.data().count,
          reportsToday: 0, // Requires complex query or client side filtering, placeholder
          pendingCorrections: correctionSnap.data().count,
          rejectedReports: 0
        });
      } catch (e) {
        console.error("Error fetching stats", e);
      }
    };
    fetchStats();
  }, []);

  const StatCard = ({ title, value, icon: Icon, color }: any) => (
    <Card className="flex items-center p-6">
      <div className={`p-4 rounded-full ${color} bg-opacity-10 mr-4`}>
        <Icon className={`w-8 h-8 ${color.replace('bg-', 'text-')}`} />
      </div>
      <div>
        <p className="text-sm font-medium text-gray-500">{title}</p>
        <h3 className="text-2xl font-bold text-gray-800">{value}</h3>
      </div>
    </Card>
  );

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">Dashboard Overview</h2>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Total Users" value={stats.users} icon={Users} color="bg-blue-600" />
        <StatCard title="Pending Corrections" value={stats.pendingCorrections} icon={AlertTriangle} color="bg-yellow-500" />
        <StatCard title="Reports Today" value="--" icon={Clock} color="bg-green-500" />
        <StatCard title="Rejected Reports" value="--" icon={FileText} color="bg-red-500" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <Card title="Recent Activity">
          <div className="text-gray-500 text-center py-8">
            Activity logs will appear here.
          </div>
        </Card>
        <Card title="System Status">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Server Status</span>
              <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">Operational</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Database Connection</span>
              <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">Connected</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Last Backup</span>
              <span className="text-sm text-gray-500">Auto-scheduled</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default AdminDashboard;