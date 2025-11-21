import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAz_8DVSyrgTY849VRgaVA9CsLaP-5jHjc",
  authDomain: "nios-vision-point-hq.firebaseapp.com",
  projectId: "nios-vision-point-hq",
  storageBucket: "nios-vision-point-hq.firebasestorage.app",
  messagingSenderId: "129058791030",
  appId: "1:129058791030:web:10f9edb6bc501a2841c957",
  measurementId: "G-CRP0ZRCQL8"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);