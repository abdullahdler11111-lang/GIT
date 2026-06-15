import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, signInWithGoogle, logout } from '../lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  authError: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const FirebaseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const signIn = async () => {
    setAuthError(null);
    try {
      await signInWithGoogle();
    } catch (error: any) {
      console.error("Sign in failed:", error);
      if (error?.code === 'auth/popup-closed-by-user') {
         // Optionally, don't show an error or show a specific one
         setAuthError("پەنجەرەی چوونەژوورەوە داخرا. تکایە دووبارە تاقیبکەرەوە.");
      } else {
         setAuthError("سەرکەوتوو نەبوو لە چوونەژوورەوە، تکایە دووبارە تاقیبکەرەوە.");
      }
    }
  };

  const signOut = async () => {
    try {
      await logout();
      setUser(null);
    } catch (error) {
      console.error("Sign out failed", error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signOut, authError }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within a FirebaseProvider');
  }
  return context;
};

