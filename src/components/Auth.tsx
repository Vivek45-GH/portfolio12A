import React, { useState, useEffect, createContext, useContext } from 'react';
import { GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, User, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { doc, getDoc, setDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { Student } from '@/types';
import { generateKeyPair } from '@/lib/crypto';

interface AuthContextType {
  user: User | null;
  studentProfile: Student | null;
  loading: boolean;
  isAdmin: boolean;
  privateKey: string | null;
  login: () => Promise<void>;
  loginWithEmail: (email: string, pass: string) => Promise<void>;
  register: (email: string, pass: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [studentProfile, setStudentProfile] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);
  const [privateKey, setPrivateKey] = useState<string | null>(localStorage.getItem('e2ee_private_key'));

  const isAdmin = user?.email === "vvek34785@gmail.com";

  const ensureKeys = async (uid: string, currentProfile: Student) => {
    if (!currentProfile.publicKey) {
      console.log("Generating E2EE keys...");
      const keys = await generateKeyPair();
      localStorage.setItem('e2ee_private_key', keys.privateKey);
      setPrivateKey(keys.privateKey);
      await updateDoc(doc(db, 'students', uid), {
        publicKey: keys.publicKey
      });
    }
  };

  const updatePresence = async (uid: string) => {
    try {
      await updateDoc(doc(db, 'students', uid), {
        lastSeen: serverTimestamp()
      });
    } catch (e) {
      console.error("Presence update failed", e);
    }
  };

  useEffect(() => {
    if (!auth) {
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser && db) {
        const docRef = doc(db, 'students', firebaseUser.uid);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          const data = docSnap.data() as Student;
          setStudentProfile(data);
          updatePresence(firebaseUser.uid);
          await ensureKeys(firebaseUser.uid, data);
        } else {
          // Create initial profile
          const keys = await generateKeyPair();
          localStorage.setItem('e2ee_private_key', keys.privateKey);
          setPrivateKey(keys.privateKey);

          const newProfile: Student = {
            uid: firebaseUser.uid,
            name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Anonymous',
            photoURL: firebaseUser.photoURL || '',
            role: firebaseUser.email === "vvek34785@gmail.com" ? 'admin' : 'student',
            canEdit: true,
            lastSeen: serverTimestamp(),
            socialLinks: {},
            tags: [],
            publicKey: keys.publicKey
          };
          await setDoc(docRef, newProfile);
          setStudentProfile(newProfile);
        }
      } else {
        setStudentProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Presence heartbeat
  useEffect(() => {
    if (!user || !db) return;

    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        updatePresence(user.uid);
      }
    }, 60000); // Update every minute if active

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        updatePresence(user.uid);
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [user]);

  const login = async () => {
    if (!auth) return;
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  };

  const loginWithEmail = async (email: string, pass: string) => {
    if (!auth) return;
    await signInWithEmailAndPassword(auth, email, pass);
  };

  const register = async (email: string, pass: string) => {
    if (!auth) return;
    await createUserWithEmailAndPassword(auth, email, pass);
  };

  const logout = async () => {
    if (!auth) return;
    await signOut(auth);
  };

  return (
    <AuthContext.Provider value={{ user, studentProfile, loading, isAdmin, privateKey, login, loginWithEmail, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
