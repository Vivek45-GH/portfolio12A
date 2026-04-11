import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, getDocFromCache, getDocFromServer } from 'firebase/firestore';
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

  // Connection test
  const testConnection = async () => {
    try {
      // Try to fetch a non-existent doc to test connection
      await getDocFromServer(doc(db, '_connection_test', 'test'));
      console.log("Firestore connected successfully.");
    } catch (error: any) {
      if (error.message?.includes('offline')) {
        console.error("Firestore Error: The client is offline. This usually means the Firebase configuration (Project ID or Database ID) is incorrect or the database is not provisioned.");
      }
    }
  };
  testConnection();
} catch (error) {
  console.error("Firebase initialization failed:", error);
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth?.currentUser?.uid,
      email: auth?.currentUser?.email,
      emailVerified: auth?.currentUser?.emailVerified,
      isAnonymous: auth?.currentUser?.isAnonymous,
      tenantId: auth?.currentUser?.tenantId,
      providerInfo: auth?.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export { db, auth, storage };
