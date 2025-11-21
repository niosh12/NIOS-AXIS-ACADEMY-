

import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { db } from '../../firebase';
import { Card, Button } from '../../components/UI';
import { AttendanceRecord } from '../../types';
import { Calendar, Clock, X, MapPin } from 'lucide-react';

const AdminAttendance: React.FC = () => {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [selectedPhoto, setSelectedPhoto] = useState<{url: string, name: string} | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchAttendance = async () => {
      setLoading(true);
      try {
        // Query by date
        const q = query(
          collection(db, 'attendance'), 
          where('date', '==', date)
        );
        const snap = await getDocs(q);
        const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as AttendanceRecord));
        
        setRecords(data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchAttendance();
  }, [date]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <h2 className="text-2xl font-bold text-gray-800">Attendance Dashboard</h2>
        <div className="flex items-center gap-2 bg-white p-2 rounded-lg border shadow-sm">
          <Calendar className="w-5 h-5 text-gray-500" />
          <input 
            type="date" 
            value={date} 
            onChange={(e) => setDate(e.target.value)}
            className="outline-none text-gray-700 font-medium bg-transparent"
          />
        </div>
      </div>

      {/* Table View */}
      <Card className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left text-gray-600 whitespace-nowrap">
            <thead className="bg-gray-50 text-gray-700 font-bold uppercase text-xs">
              <tr>
                <th className="px-4 py-3">User ID</th>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">In-Time</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Location</th>
                <th className="px-4 py-3">Photo</th>
                <th className="px-4 py-3">Out-Time</th>
                <th className="px-4 py-3">OT Start</th>
                <th className="px-4 py-3">OT End</th>
                <th className="px-4 py-3">Total OT</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading && (
                <tr>
                  <td colSpan={11} className="px-6 py-8 text-center text-gray-400">Loading records...</td>
                </tr>
              )}
              
              {!loading && records.length === 0 && (
                 <tr>
                  <td colSpan={11} className="px-6 py-8 text-center text-gray-400">No attendance records found for this date.</td>
                </tr>
              )}

              {!loading && records.map(record => {
                const outTimeDisplay = record.outTime || (record.overtimeStartTime ? '06:00 PM' : '-');

                return (
                  <tr key={record.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs font-semibold">{record.userId}</td>
                    <td className="px-4 py-3 font-medium text-gray-900">{record.userName}</td>
                    <td className="px-4 py-3">{record.date}</td>
                    <td className="px-4 py-3 font-mono font-bold text-brand-700">{record.inTime}</td>
                    <td className="px-4 py-3">
                       <span className={`px-2 py-1 rounded-full text-xs font-bold ${record.status === 'Present' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                         {record.status}
                       </span>
                    </td>
                    <td className="px-4 py-3">
                      {record.latitude && record.longitude ? (
                        <a 
                          href={`https://www.google.com/maps/search/?api=1&query=${record.latitude},${record.longitude}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-blue-600 hover:underline"
                        >
                          <MapPin className="w-3 h-3" /> View Map
                        </a>
                      ) : (
                        <span className="text-gray-400 text-xs">Not Available</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div 
                        className="w-8 h-8 rounded bg-gray-200 overflow-hidden cursor-pointer hover:ring-2 ring-brand-400"
                        onClick={() => setSelectedPhoto({ url: record.photoBase64, name: record.userName })}
                      >
                        <img src={record.photoBase64} alt="Proof" className="w-full h-full object-cover" />
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono">{outTimeDisplay}</td>
                    <td className="px-4 py-3 font-mono">{record.overtimeStartTime || '-'}</td>
                    <td className="px-4 py-3 font-mono">{record.overtimeEndTime || '-'}</td>
                    <td className="px-4 py-3 font-bold text-indigo-600">{record.overtimeHours ? `${record.overtimeHours}h` : '-'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Photo Modal */}
      {selectedPhoto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-90 p-4 animate-fade-in" onClick={() => setSelectedPhoto(null)}>
          <div className="relative max-w-lg w-full bg-white rounded-lg overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="p-3 bg-white flex justify-between items-center border-b">
              <h3 className="font-bold">{selectedPhoto.name} - Attendance Proof</h3>
              <button onClick={() => setSelectedPhoto(null)}><X className="w-6 h-6 text-gray-500" /></button>
            </div>
            <img src={selectedPhoto.url} alt="Full size" className="w-full h-auto max-h-[80vh] object-contain bg-black" />
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminAttendance;