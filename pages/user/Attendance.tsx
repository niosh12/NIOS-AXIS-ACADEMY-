

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../App';
import { Button, Card } from '../../components/UI';
import { addDoc, collection, query, where, getDocs, doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { CheckCircle, Clock, Timer, AlertTriangle, XCircle, RefreshCw, Calendar, MapPin, ScanFace, Camera, Navigation, Eye, Smile, Trophy, Zap, Star } from 'lucide-react';
import { AttendanceRecord, SystemSettings } from '../../types';

// Fun Data Arrays
const DAILY_CHALLENGES = [
  "Smile and take attendance 😁",
  "Say 'Good Morning' loudly ☀️",
  "Drink water before starting work 💧",
  "Take a deep breath & relax 🧘",
  "High-five yourself (mentally) ✋",
  "Do a quick stretch! 🤸",
  "Make a funny face 🤪",
  "Look sharp! Adjust your collar 👔"
];

const REACTIONS_ON_TIME = [
  "😎 Boss Level Entry",
  "🔥 Rocket Start!",
  "✨ Shining bright today!",
  "🚀 Let's crush it!",
  "🦁 Roar mode: ON",
  "⚡ You are speed!",
  "💎 Crystal clear focus today"
];

const REACTIONS_LATE = [
  "😂 Aaj bhi late ho gaya bhai!",
  "😴 Lagta hai kal raat late soye the.",
  "🐢 Slow and steady wins the race?",
  "👀 Alarm didn't ring?",
  "☕ Need more coffee?",
  "🏃‍♂️ A little cardio running late?"
];

const UserAttendance: React.FC = () => {
  const { user } = useAuth();
  
  // Attendance State
  const [attendance, setAttendance] = useState<AttendanceRecord | null>(null);
  const [loadingAttendance, setLoadingAttendance] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());
  
  // Settings State (Geofence)
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  
  // Fun Features State
  const [todaysChallenge, setTodaysChallenge] = useState("");
  const [challengeChecked, setChallengeChecked] = useState(false);

  // Liveness / Camera State
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [cameraStatus, setCameraStatus] = useState<'initializing' | 'ready' | 'detecting' | 'captured'>('initializing');
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [motionScore, setMotionScore] = useState(0);
  const [instruction, setInstruction] = useState("Initialize Camera...");
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Location State
  const [currentLoc, setCurrentLoc] = useState<{lat: number, lng: number} | null>(null);
  const [locError, setLocError] = useState<string | null>(null);
  const [distanceToOffice, setDistanceToOffice] = useState<number | null>(null);
  const [isInsideGeofence, setIsInsideGeofence] = useState(false);

  // History State
  const [history, setHistory] = useState<AttendanceRecord[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  const todayStr = new Date().toISOString().split('T')[0];

  // Clock
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Load Settings & Attendance & Challenge
  useEffect(() => {
    const init = async () => {
      // Set Random Challenge
      const randomChallenge = DAILY_CHALLENGES[Math.floor(Math.random() * DAILY_CHALLENGES.length)];
      setTodaysChallenge(randomChallenge);

      if (!user) return;
      
      // 1. Load Settings
      try {
        const settingsSnap = await getDoc(doc(db, 'settings', 'attendance_config'));
        if (settingsSnap.exists()) {
          setSettings(settingsSnap.data() as SystemSettings);
        }
      } catch (e) {
        console.error("Settings load error", e);
      }

      // 2. Load Today's Attendance
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

      // 3. Load History
      try {
        const qHistory = query(collection(db, 'attendance'), where('userId', '==', user.userId));
        const snapHist = await getDocs(qHistory);
        const list = snapHist.docs.map(d => ({ id: d.id, ...d.data() } as AttendanceRecord));
        list.sort((a, b) => b.date.localeCompare(a.date));
        setHistory(list);
      } catch (e) {
        console.error("Fetch history failed", e);
      } finally {
        setLoadingHistory(false);
      }
    };
    init();
  }, [user, todayStr]);

  // --- GEOFENCING HELPER ---
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371e3; // metres
    const φ1 = lat1 * Math.PI/180; // φ, λ in radians
    const φ2 = lat2 * Math.PI/180;
    const Δφ = (lat2-lat1) * Math.PI/180;
    const Δλ = (lon2-lon1) * Math.PI/180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c; // in metres
  };

  const checkLocation = () => {
    setLocError(null);
    if (!navigator.geolocation) {
      setLocError("Geolocation is not supported by this browser.");
      return;
    }
    
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setCurrentLoc({ lat: latitude, lng: longitude });

        if (settings && settings.enableGeofencing && settings.officeLat) {
          const dist = calculateDistance(latitude, longitude, settings.officeLat, settings.officeLng);
          setDistanceToOffice(dist);
          
          if (dist <= settings.allowedRadius) {
            setIsInsideGeofence(true);
          } else {
            setIsInsideGeofence(false);
            setLocError(`You are ${(dist - settings.allowedRadius).toFixed(0)}m outside the allowed office zone.`);
          }
        } else {
          // If geofencing disabled or not set, always allow
          setIsInsideGeofence(true);
          setDistanceToOffice(0);
        }
      },
      (err) => {
        console.error(err);
        setLocError("Location permission denied. Required for attendance.");
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // --- LIVENESS CAMERA LOGIC ---
  const startCamera = async () => {
    setCapturedImage(null);
    setCameraStatus('initializing');
    setIsCameraOpen(true);
    
    // Ensure location is checked first
    checkLocation();

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } } 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        
        setInstruction("Hold steady...");
        setTimeout(() => {
          setCameraStatus('detecting');
          setInstruction("Now BLINK or Nod to capture!");
          startMotionDetection();
        }, 2000);
      }
    } catch (err) {
      console.error(err);
      setLocError("Camera access denied. Please allow camera access.");
      setIsCameraOpen(false);
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
    }
    setIsCameraOpen(false);
  };

  const startMotionDetection = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = 320; // Internal processing res
    canvas.height = 240;

    let prevFrame: Uint8ClampedArray | null = null;
    let frameId: number;

    const processFrame = () => {
      if (cameraStatus === 'captured' || !isCameraOpen) return;

      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const currentFrame = ctx.getImageData(0, 0, canvas.width, canvas.height).data;

      if (prevFrame) {
        let diff = 0;
        // Simple pixel diff
        for (let i = 0; i < currentFrame.length; i += 4) {
           // Compare Luminance approx
           const r = Math.abs(currentFrame[i] - prevFrame[i]);
           const g = Math.abs(currentFrame[i+1] - prevFrame[i+1]);
           const b = Math.abs(currentFrame[i+2] - prevFrame[i+2]);
           if (r+g+b > 100) diff++; 
        }

        const totalPixels = canvas.width * canvas.height;
        const motionPercent = (diff / totalPixels) * 100;
        setMotionScore(motionPercent);

        // Threshold: e.g. between 2% and 20% is likely a face movement/blink
        // Too low = static photo/still
        // Too high = whole phone moving
        if (motionPercent > 2 && motionPercent < 30) {
           capturePhoto();
           return; // Stop loop
        }
      }

      prevFrame = currentFrame;
      frameId = requestAnimationFrame(processFrame);
    };

    frameId = requestAnimationFrame(processFrame);
    
    // Cleanup closure
    return () => cancelAnimationFrame(frameId);
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;
    
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx?.drawImage(videoRef.current, 0, 0);
    
    const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
    setCapturedImage(dataUrl);
    setCameraStatus('captured');
    setInstruction("Verified & Captured!");
    stopCamera(); // Close stream
  };

  // --- SUBMIT ---
  const submitAttendance = async () => {
    if (!user || !capturedImage) return;

    // Re-check geo before final submit
    if (settings?.enableGeofencing && !isInsideGeofence) {
       alert("You are outside the allowed office location!");
       return;
    }
    if (!currentLoc) {
      alert("Location data missing. Please try again.");
      return;
    }

    setLoadingAttendance(true);
    const currentHour = currentTime.getHours();
    const currentMin = currentTime.getMinutes();
    const totalMinutes = currentHour * 60 + currentMin;
    
    let status: 'Present' | 'Absent' = 'Present';
    let isLate = false;
    
    // 10:30 AM cutoff = 10*60 + 30 = 630 minutes
    if (totalMinutes > 630) {
      status = 'Absent'; 
      isLate = true;
    }

    // GENERATE FUN REACTION
    let reaction = "";
    if (isLate) {
      reaction = REACTIONS_LATE[Math.floor(Math.random() * REACTIONS_LATE.length)];
    } else {
      reaction = REACTIONS_ON_TIME[Math.floor(Math.random() * REACTIONS_ON_TIME.length)];
    }

    const inTimeFormatted = currentTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', hour12: true});
    
    const newRecord: AttendanceRecord = {
      userId: user.userId,
      userName: user.name,
      date: todayStr,
      inTime: inTimeFormatted,
      photoBase64: capturedImage,
      status: status,
      latitude: currentLoc.lat,
      longitude: currentLoc.lng,
      // Fun Fields
      funReaction: reaction,
      challengeText: todaysChallenge,
      challengeCompleted: challengeChecked
    };

    try {
      const docRef = await addDoc(collection(db, 'attendance'), newRecord);
      setAttendance({ ...newRecord, id: docRef.id });
      setHistory(prev => [ { ...newRecord, id: docRef.id }, ...prev ]);
      setCapturedImage(null);
    } catch (e) {
      console.error(e);
      alert("Failed to submit attendance.");
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
        await updateDoc(ref, { outTime: "06:00 PM", overtimeStartTime: nowFormatted });
        setAttendance(prev => prev ? { ...prev, outTime: "06:00 PM", overtimeStartTime: nowFormatted } : null);
      } else {
        await updateDoc(ref, { overtimeEndTime: nowFormatted, overtimeHours: "2.0" }); // Mock calc
        setAttendance(prev => prev ? { ...prev, overtimeEndTime: nowFormatted, overtimeHours: "2.0" } : null);
      }
    } catch (e) { console.error(e); }
  };

  // Time Rules
  const currentHour = currentTime.getHours();
  const currentMin = currentTime.getMinutes();
  const totalMinutes = currentHour * 60 + currentMin;
  const isBefore10AM = totalMinutes < 600;
  const isAfter6PM = currentHour >= 18;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <div className="p-3 bg-brand-100 rounded-full text-brand-600">
          <Clock className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Attendance</h2>
          <p className="text-gray-500 text-sm">Geo-Fence & Live Eye-Blink Check</p>
        </div>
      </div>

      {/* ATTENDANCE CARD */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
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
          {loadingAttendance ? (
             <div className="text-center py-8"><RefreshCw className="w-8 h-8 animate-spin mx-auto text-brand-500" /></div>
          ) : !attendance ? (
            <div className="flex flex-col items-center">
              {isBefore10AM ? (
                <div className="bg-blue-50 p-6 rounded-lg text-blue-800 text-center">
                  <Clock className="w-10 h-10 mx-auto mb-2" />
                  <p className="font-bold">Shift starts at 10:00 AM</p>
                </div>
              ) : (
                <div className="w-full max-w-sm">
                   {/* LOCATION STATUS */}
                   <div className={`mb-4 p-3 rounded-lg text-sm flex items-center justify-between border ${isInsideGeofence ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4" />
                        {isInsideGeofence ? "Inside Office Location" : "Outside Office Zone"}
                      </div>
                      <Button size="sm" variant="outline" onClick={checkLocation} className="h-7 text-xs px-2 bg-white">
                        Refresh GPS
                      </Button>
                   </div>
                   {locError && <p className="text-xs text-red-600 mb-4 text-center">{locError}</p>}

                   {/* DAILY CHALLENGE CARD (Before Capture) */}
                   {!isCameraOpen && !capturedImage && (
                     <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-xl shadow-sm animate-in slide-in-from-bottom-4">
                        <div className="flex items-center gap-2 mb-2 text-yellow-700 font-bold uppercase text-xs tracking-wider">
                           <Zap className="w-4 h-4 fill-yellow-500 text-yellow-600" /> Daily Challenge
                        </div>
                        <p className="text-lg font-bold text-gray-800 text-center mb-3">"{todaysChallenge}"</p>
                        <label className="flex items-center justify-center gap-2 cursor-pointer p-2 bg-white rounded-lg border border-yellow-200 hover:bg-yellow-100 transition-colors">
                           <input 
                             type="checkbox" 
                             className="w-5 h-5 text-yellow-600 rounded focus:ring-yellow-500"
                             checked={challengeChecked}
                             onChange={e => setChallengeChecked(e.target.checked)}
                           />
                           <span className="text-sm font-medium text-gray-700">I completed this!</span>
                        </label>
                     </div>
                   )}

                   {/* CAPTURE AREA */}
                   {!capturedImage ? (
                     !isCameraOpen ? (
                       <div className="text-center">
                         <div className={`mb-6 text-center ${totalMinutes <= 630 ? 'text-gray-600' : 'text-red-500'}`}>
                           {totalMinutes > 630 && "You are late (Marked Absent). "} 
                           Ready to check in?
                         </div>
                         <Button 
                           onClick={startCamera} 
                           className="w-full py-4 text-lg shadow-lg" 
                           disabled={settings?.enableGeofencing && !isInsideGeofence}
                           icon={Camera}
                         >
                           Start Liveness Check
                         </Button>
                         <p className="text-xs text-gray-400 mt-2">Requires Camera & Location Permissions</p>
                       </div>
                     ) : (
                       <div className="relative bg-black rounded-xl overflow-hidden shadow-2xl">
                         <video ref={videoRef} className="w-full h-64 object-cover transform scale-x-[-1]" playsInline muted autoPlay />
                         <canvas ref={canvasRef} className="hidden" />
                         
                         {/* Overlay UI */}
                         <div className="absolute inset-0 flex flex-col items-center justify-between p-4">
                           <div className="bg-black/50 text-white px-3 py-1 rounded-full text-sm font-bold backdrop-blur-md">
                              {instruction}
                           </div>
                           
                           <div className="w-full">
                              {cameraStatus === 'detecting' && (
                                 <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                                    <div 
                                      className="h-full bg-green-500 transition-all duration-200" 
                                      style={{ width: `${Math.min(motionScore * 5, 100)}%` }} 
                                    />
                                 </div>
                              )}
                           </div>
                           
                           <Button size="sm" variant="danger" onClick={stopCamera} className="mt-2">Cancel</Button>
                         </div>
                       </div>
                     )
                   ) : (
                     <div className="animate-in zoom-in duration-300">
                       <div className="relative rounded-xl overflow-hidden border-4 border-white shadow-xl mb-6">
                         <img src={capturedImage} className="w-full h-64 object-cover" alt="Capture" />
                         <div className="absolute bottom-0 left-0 right-0 bg-green-600 text-white text-center py-1 text-sm font-bold">
                           Liveness Verified <CheckCircle className="w-4 h-4 inline ml-1"/>
                         </div>
                       </div>
                       <div className="grid grid-cols-2 gap-3">
                         <Button variant="secondary" onClick={() => setCapturedImage(null)}>Retake</Button>
                         <Button onClick={submitAttendance} className="bg-green-600 hover:bg-green-700">Submit Attendance</Button>
                       </div>
                     </div>
                   )}
                </div>
              )}
            </div>
          ) : (
            // SUCCESS / STATUS VIEW
            <div className="text-center animate-in fade-in duration-500">
               
               {/* FUN REACTION CARD */}
               {attendance.funReaction && (
                 <div className="mb-6 p-6 bg-gradient-to-r from-brand-500 to-blue-600 rounded-xl text-white shadow-lg transform hover:scale-105 transition-transform">
                    <Smile className="w-12 h-12 mx-auto mb-3 text-yellow-300" />
                    <h2 className="text-2xl font-extrabold leading-tight">
                      "{attendance.funReaction}"
                    </h2>
                 </div>
               )}

               {/* CHALLENGE BADGE */}
               {attendance.challengeCompleted && (
                 <div className="mb-6 inline-flex items-center gap-2 px-4 py-2 bg-yellow-100 text-yellow-800 rounded-full text-sm font-bold border border-yellow-200 shadow-sm">
                    <Trophy className="w-5 h-5 text-yellow-600" />
                    Daily Challenge Completed!
                 </div>
               )}

               <div className={`inline-flex items-center gap-3 px-6 py-3 rounded-full text-xl font-bold shadow-sm ${attendance.status === 'Present' ? 'bg-green-100 text-green-800 border border-green-200' : 'bg-red-100 text-red-800 border border-red-200'}`}>
                 {attendance.status === 'Present' ? <CheckCircle className="w-6 h-6"/> : <XCircle className="w-6 h-6"/>}
                 Marked {attendance.status}
               </div>
               <p className="text-gray-500 mt-3 font-medium">Checked in at <span className="font-mono text-gray-800 font-bold">{attendance.inTime}</span></p>
               
               {!isAfter6PM ? (
                 <div className="mt-6 bg-blue-50 p-4 rounded-lg text-blue-800">
                   <Clock className="w-6 h-6 mx-auto mb-1" />
                   <p>Shift Ends at 06:00 PM</p>
                 </div>
               ) : (
                 <div className="mt-6">
                    {!attendance.overtimeStartTime ? (
                      <Button onClick={() => handleOvertime('start')} className="w-full bg-indigo-600" icon={Timer}>Start Overtime</Button>
                    ) : !attendance.overtimeEndTime ? (
                      <Button onClick={() => handleOvertime('stop')} variant="danger" className="w-full">Stop Overtime</Button>
                    ) : (
                      <div className="text-green-600 font-bold">Overtime Completed</div>
                    )}
                 </div>
               )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserAttendance;