import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';

// Safely load configuration with environment variables as primary,
// and gracefully fallback to bundled applet config if present.
let fallbackConfig: Record<string, string> = {};
try {
  // @ts-ignore
  import('../../firebase-applet-config.json').then((mod) => {
    fallbackConfig = mod.default || mod;
  }).catch(() => {});
} catch {
  // ignore
}

export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyCs0fPq8HoZIMTMQHjGQcYix6VPMKeJgjE",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "gen-lang-client-0235517941.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "gen-lang-client-0235517941",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "gen-lang-client-0235517941.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "59726964824",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:59726964824:web:047aae827e4a394eb4022d",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "",
};

export const app: FirebaseApp = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const auth: Auth = getAuth(app);
