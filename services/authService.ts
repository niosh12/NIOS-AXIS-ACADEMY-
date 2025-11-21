import { db } from '../firebase';
import { collection, query, where, getDocs, addDoc, updateDoc, doc, serverTimestamp, getDoc } from 'firebase/firestore';
import { UserData, SessionLog } from '../types';

export const loginUser = async (userId: string, password: string): Promise<UserData | null> => {
  try {
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where("userId", "==", userId), where("password", "==", password));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      return null;
    }

    const userDoc = querySnapshot.docs[0];
    return { id: userDoc.id, ...userDoc.data() } as UserData;
  } catch (error) {
    console.error("Login error:", error);
    return null;
  }
};

export const startSession = async (userId: string): Promise<string> => {
  try {
    let ipAddress = 'Unknown';
    let location = 'Unknown';

    // 1. Fetch IP Address
    try {
      // Using a public IP API (ipify)
      const response = await fetch('https://api.ipify.org?format=json');
      if (response.ok) {
        const data = await response.json();
        ipAddress = data.ip;
      }
    } catch (e) {
      console.warn("Failed to fetch IP:", e);
    }

    // 2. Fetch Live Location
    if ('geolocation' in navigator) {
      try {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 5000,
            maximumAge: 0
          });
        });
        location = `${pos.coords.latitude.toFixed(6)}, ${pos.coords.longitude.toFixed(6)}`;
      } catch (e) {
        console.warn("Geolocation failed:", e);
        location = 'Permission Denied/Unavailable';
      }
    } else {
      location = 'Not Supported';
    }

    const sessionData: Omit<SessionLog, 'id'> = {
      userId,
      loginAt: new Date().toISOString(),
      deviceInfo: navigator.userAgent,
      ipAddress,
      location
    };

    const docRef = await addDoc(collection(db, 'sessions'), sessionData);
    return docRef.id;
  } catch (e) {
    console.error("Session start error", e);
    return "";
  }
};

export const endSession = async (sessionId: string) => {
  if (!sessionId) return;
  try {
    const sessionRef = doc(db, 'sessions', sessionId);
    const sessionSnap = await getDoc(sessionRef);
    const logoutAt = new Date().toISOString();
    
    let duration = '0m';

    if (sessionSnap.exists()) {
      const data = sessionSnap.data();
      if (data.loginAt) {
        const start = new Date(data.loginAt).getTime();
        const end = new Date(logoutAt).getTime();
        const diffMs = end - start;
        const minutes = Math.floor(diffMs / 60000);
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        duration = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
      }
    }

    await updateDoc(sessionRef, {
      logoutAt,
      duration
    });
  } catch (e) {
    console.error("Session end error", e);
  }
};