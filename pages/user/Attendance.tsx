
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../App';
import { Button } from '../../components/UI';
import { addDoc, collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { CheckCircle, Camera, Clock, Timer, AlertTriangle, XCircle, RefreshCw } from 'lucide-react';
import { AttendanceRecord } from '../../types';

const UserAttendance: React.FC = () => {
  const { user } = useAuth();
  
  // Attendance State
  const [attendance, setAttendance] = useState<AttendanceRecord | null>(null);
  const [loadingAttendance, setLoadingAttendance] = useState(true);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date());

  const todayStr = new Date().toISOString().split('T')[0];

  // Clock
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Load Attendance
  useEffect(() => {
    const fetchAttendance = async () => {
      if (!user) return;
      try {
        const q = query(
          collection(db, 'attendance'), 
          where('userId', '==', user.userId),
          where('date', '==', todayStr)
        );
        const snap = await getDocs(q);
        if (!snap.empty) {
          setAttendance({ id: snap.docs[0].id, ...snap.docs[0].data() } as AttendanceRecord);
        }
      } catch (e) {
        console.error("Fetch attendance failed", e);
      } finally {
        setLoadingAttendance(false);
      }
    };
    fetchAttendance();
  }, [user, todayStr]);

  // Image Compression Helper
  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 600; 
          const scale = MAX_WIDTH / img.width;
          canvas.width = MAX_WIDTH;
          canvas.height = img.height * scale;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL('image/jpeg', 0.7));
        };
        img.onerror = reject;
      };
      reader.onerror = reject;
    });
  };

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLoadingAttendance(true);
      try {
        const compressed = await compressImage(file);
        setPhotoPreview(compressed);
        setCameraError('');
      } catch (e) {
        setCameraError('Failed to process image');
      } finally {
        setLoadingAttendance(false);
      }
    }
  };

  const submitAttendance = async () => {
    if (!user || !photoPreview) return;

    const currentHour = currentTime.getHours();
    const currentMin = currentTime.getMinutes();
    const totalMinutes = currentHour * 60 + currentMin;
    
    // Logic Checks
    // 10:00 AM = 600 minutes
    // 10:30 AM = 630 minutes
    
    let status: 'Present' | 'Absent' = 'Present';
    
    if (totalMinutes < 600) {
      alert("Attendance starts at 10:00 AM.");
      return;
    } else if (totalMinutes > 630) {
      status = 'Absent';
    }

    setLoadingAttendance(true);

    const inTimeFormatted = currentTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', hour12: true});
    
    const newRecord: AttendanceRecord = {
      userId: user.userId,
      userName: user.name,
      date: todayStr,
      inTime: inTimeFormatted,
      photoBase64: photoPreview,
      status: status,
      outTime: '', // Will be set to 06:00 PM automatically at end of day or lazily
    };

    try {
      const docRef = await addDoc(collection(db, 'attendance'), newRecord);
      setAttendance({ ...newRecord, id: docRef.id });
      setPhotoPreview(null);
    } catch (e) {
      console.error(e);
      alert('Failed to submit attendance');
    } finally {
      setLoadingAttendance(false);
    }
  };

  const handleOvertime = async (action: 'start' | 'stop') => {
    if (!attendance?.id) return;
    
    try {
      const ref = doc(db, 'attendance', attendance.id);
      const nowFormatted = new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', hour12: true});
      
      if (action === 'start') {
        await updateDoc(ref, {
          outTime: "06:00 PM",
          overtimeStartTime: nowFormatted
        });
        setAttendance(prev => prev ? { ...prev, outTime: "06:00 PM", overtimeStartTime: nowFormatted } : null);
      } else {
        const startStr = attendance.overtimeStartTime!;
        // Simple parse helper
        const parseTime = (t: string) => {
           const [time, modifier] = t.split(' ');
           let [hours, minutes] = time.split(':').map(Number);
           if (hours === 12) hours = 0;
           if (modifier === 'PM') hours += 12;
           const d = new Date();
           d.setHours(hours, minutes, 0, 0);
           return d;
        };

        const startDate = parseTime(startStr);
        const endDate = new Date();
        const diffMs = endDate.getTime() - startDate.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const hours = (diffMins / 60).toFixed(2);

        await updateDoc(ref, {
          overtimeEndTime: nowFormatted,
          overtimeHours: hours
        });
        setAttendance(prev => prev ? { ...prev, overtimeEndTime: nowFormatted, overtimeHours: hours } : null);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Time Rule Helpers
  const currentHour = currentTime.getHours();
  const currentMin = currentTime.getMinutes();
  const totalMinutes = currentHour * 60 + currentMin;
  
  const isBefore10AM = totalMinutes < 600; // Before 10:00
  const isAfter6PM = currentHour >= 18; // After 18:00 (6 PM)

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <div className="p-3 bg-brand-100 rounded-full text-brand-600">
          <Clock className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Attendance</h2>
          <p className="text-gray-500 text-sm">Mark your presence and overtime</p>
        </div>
      </div>

      {/* ATTENDANCE CARD */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden animate-in fade-in duration-500">
        <div className="bg-brand-600 px-6 py-6 flex justify-between items-center text-white">
          <div>
            <p className="text-brand-100 text-sm font-medium uppercase tracking-wider">{todayStr}</p>
            <h3 className="text-xl font-bold mt-1">Daily Check-in</h3>
          </div>
          <div className="text-right bg-brand-700 bg-opacity-50 px-4 py-2 rounded-lg backdrop-blur-sm">
             <div className="text-2xl font-mono font-bold tracking-wider">
               {currentTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', hour12: true})}
             </div>
          </div>
        </div>

        <div className="p-8">
          {loadingAttendance && (
             <div className="flex flex-col items-center py-8 text-gray-500">
                <RefreshCw className="w-8 h-8 animate-spin mb-2 text-brand-500" />
                <p>Loading status...</p>
             </div>
          )}

          {!loadingAttendance && !attendance && (
            <div className="flex flex-col items-center">
              {isBefore10AM ? (
                <div className="w-full bg-blue-50 text-blue-900 px-6 py-8 rounded-xl text-center border-2 border-blue-100">
                  <div className="w-16 h-16 bg-blue-200 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Clock className="w-8 h-8 text-blue-600" />
                  </div>
                  <h3 className="font-bold text-xl mb-2">Shift Has Not Started</h3>
                  <p className="text-blue-700">Attendance marking opens at <span className="font-bold">10:00 AM</span>.</p>
                </div>
              ) : (
                <>
                  {photoPreview ? (
                     <div className="w-full max-w-sm text-center animate-in zoom-in duration-300">
                       <div className="relative rounded-xl overflow-hidden border-4 border-white shadow-xl mb-6">
                          <img src={photoPreview} alt="Preview" className="w-full h-64 object-cover" />
                          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-4 text-white text-sm font-medium">
                            Preview
                          </div>
                       </div>
                       
                       <div className="grid grid-cols-2 gap-4">
                         <Button onClick={() => setPhotoPreview(null)} variant="secondary" className="w-full">Retake Photo</Button>
                         <Button onClick={submitAttendance} className="w-full bg-green-600 hover:bg-green-700 shadow-md">
                           Confirm & Submit
                         </Button>
                       </div>
                       
                       {totalMinutes > 630 && (
                         <div className="mt-4 p-3 bg-red-50 text-red-600 rounded-lg flex items-center justify-center gap-2 text-sm font-bold border border-red-100">
                           <AlertTriangle className="w-4 h-4"/> 
                           LATE: Will be marked ABSENT
                         </div>
                       )}
                     </div>
                  ) : (
                    <div className="w-full text-center">
                      <div className={`mb-8 ${totalMinutes <= 630 ? 'text-gray-600' : 'text-red-500'}`}>
                        {totalMinutes <= 630 
                          ? "Please take a selfie to mark your attendance." 
                          : "You are late. Marking attendance now will record as ABSENT."}
                      </div>
                      
                      <label className="group relative w-full max-w-xs mx-auto flex flex-col items-center justify-center p-10 border-2 border-dashed border-brand-300 rounded-2xl cursor-pointer bg-brand-50 hover:bg-brand-100 transition-all duration-300 transform hover:scale-105">
                        <div className="w-20 h-20 bg-white rounded-full shadow-sm flex items-center justify-center mb-4 group-hover:shadow-md transition-shadow">
                           <Camera className="w-10 h-10 text-brand-500" />
                        </div>
                        <span className="text-brand-800 font-bold text-lg">Tap to Camera</span>
                        <span className="text-brand-400 text-sm mt-1">Take a clear selfie</span>
                        <input type="file" accept="image/*" capture="user" className="hidden" onChange={handlePhotoSelect} />
                      </label>
                      
                      {cameraError && <p className="text-red-500 text-sm mt-4 font-medium">{cameraError}</p>}
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {!loadingAttendance && attendance && (
             <div className="text-center">
                <div className="mb-8 transform transition-all">
                   <div className={`inline-flex items-center gap-3 px-6 py-3 rounded-full text-xl font-bold shadow-sm ${attendance.status === 'Present' ? 'bg-green-100 text-green-800 border border-green-200' : 'bg-red-100 text-red-800 border border-red-200'}`}>
                     {attendance.status === 'Present' ? <CheckCircle className="w-6 h-6"/> : <XCircle className="w-6 h-6"/>}
                     Marked {attendance.status}
                   </div>
                   <p className="text-gray-500 mt-3 font-medium">Checked in at <span className="font-mono text-gray-800 font-bold">{attendance.inTime}</span></p>
                </div>

                {/* Shift Status / Overtime */}
                <div className="border-t border-gray-100 pt-8">
                  {!isAfter6PM ? (
                     <div className="bg-blue-50 p-6 rounded-xl border border-blue-100 inline-block max-w-sm w-full">
                       <Clock className="w-8 h-8 text-blue-500 mx-auto mb-3" />
                       <h4 className="text-blue-900 font-bold mb-1">Shift in Progress</h4>
                       <p className="text-blue-700 text-sm">Your shift ends at 06:00 PM</p>
                     </div>
                  ) : (
                     <div className="space-y-6 max-w-sm mx-auto">
                       <div className="bg-gray-100 p-4 rounded-xl text-gray-600 font-medium flex items-center justify-center gap-2">
                          <Clock className="w-5 h-5" /> Shift Ended (06:00 PM)
                       </div>

                       {/* Overtime Controls */}
                       <div className="animate-in slide-in-from-bottom-2">
                          {!attendance.overtimeStartTime ? (
                             <Button onClick={() => handleOvertime('start')} className="w-full py-4 text-lg bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-200" icon={Timer}>
                               Start Overtime
                             </Button>
                          ) : !attendance.overtimeEndTime ? (
                             <div className="bg-indigo-50 p-6 rounded-xl border-2 border-indigo-100 shadow-inner">
                               <div className="flex items-center justify-center gap-2 mb-2">
                                 <span className="relative flex h-3 w-3">
                                   <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                                   <span className="relative inline-flex rounded-full h-3 w-3 bg-indigo-500"></span>
                                 </span>
                                 <h4 className="text-indigo-900 font-bold text-lg">Overtime Active</h4>
                               </div>
                               <p className="text-indigo-700 mb-6 text-sm font-mono">Started: {attendance.overtimeStartTime}</p>
                               <Button onClick={() => handleOvertime('stop')} variant="danger" className="w-full shadow-lg shadow-red-100">
                                 Stop Overtime
                               </Button>
                             </div>
                          ) : (
                             <div className="p-6 bg-green-50 border border-green-100 rounded-xl">
                               <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                                 <CheckCircle className="w-6 h-6 text-green-600" />
                               </div>
                               <p className="text-green-800 font-bold text-lg">Overtime Submitted</p>
                               <p className="text-green-700 mt-1 font-mono text-xl">{attendance.overtimeHours} Hours</p>
                             </div>
                          )}
                       </div>
                     </div>
                  )}
                </div>
             </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserAttendance;
