// Firebase Configuration
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getFunctions } from 'firebase/functions';

// Firebase configuration object - Replace with your project's config
const firebaseConfig = {
  apiKey: (import.meta as any).env?.VITE_FIREBASE_API_KEY || 'placeholder-api-key',
  authDomain: (import.meta as any).env?.VITE_FIREBASE_AUTH_DOMAIN || 'placeholder-project.firebaseapp.com',
  projectId: (import.meta as any).env?.VITE_FIREBASE_PROJECT_ID || 'placeholder-project',
  storageBucket: (import.meta as any).env?.VITE_FIREBASE_STORAGE_BUCKET || 'placeholder-project.appspot.com',
  messagingSenderId: (import.meta as any).env?.VITE_FIREBASE_MESSAGING_SENDER_ID || 'placeholder-sender-id',
  appId: (import.meta as any).env?.VITE_FIREBASE_APP_ID || 'placeholder-app-id',
  measurementId: (import.meta as any).env?.VITE_FIREBASE_MEASUREMENT_ID || 'placeholder-measurement-id'
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const functions = getFunctions(app);

// Enable Firestore offline persistence
import { enableNetwork, disableNetwork } from 'firebase/firestore';

export const enableOfflineSupport = () => disableNetwork(db);
export const enableOnlineSupport = () => enableNetwork(db);

export default app;