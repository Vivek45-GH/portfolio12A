import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import localFirebaseConfig from '../../firebase-applet-config.json';

// Helper to get env variables safely
const getEnv = (key: string) => {
  // @ts-ignore
  return import.meta.env[key] || (typeof process !== 'undefined' ? process.env[key] : undefined);
};

const firebaseConfig = {
  apiKey: getEnv('VITE_FIREBASE_API_KEY') || localFirebaseConfig.apiKey,
  authDomain: getEnv('VITE_FIREBASE_AUTH_DOMAIN') || localFirebaseConfig.authDomain,
  projectId: getEnv('VITE_FIREBASE_PROJECT_ID') || localFirebaseConfig.projectId,
  storageBucket: getEnv('VITE_FIREBASE_STORAGE_BUCKET') || localFirebaseConfig.storageBucket,
  messagingSenderId: getEnv('VITE_FIREBASE_MESSAGING_SENDER_ID') || localFirebaseConfig.messagingSenderId,
  appId: getEnv('VITE_FIREBASE_APP_ID') || localFirebaseConfig.appId,
};

const databaseId = getEnv('VITE_FIREBASE_DATABASE_ID') || localFirebaseConfig.firestoreDatabaseId;

// Initialize Firebase only if config is valid to prevent crashes
let app: any;
let db: any;
let auth: any;
let storage: any;

try {
  if (!firebaseConfig.apiKey || firebaseConfig.apiKey === "undefined") {
    console.warn("Firebase API Key is missing. Falling back to local config if available.");
  }
  
  app = initializeApp(firebaseConfig);
  db = getFirestore(app, databaseId || '(default)');
  auth = getAuth(app);
  storage = getStorage(app);
} catch (error) {
  console.error("Firebase initialization failed:", error);
}

export { db, auth, storage };
