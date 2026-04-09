"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { auth, db } from "./firebase";
import {
  User,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut as firebaseSignOut,
  onAuthStateChanged,
} from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";

const OWNER_EMAIL = "darmawanbayu1@gmail.com";

type AuthContextType = {
  user: User | null;
  loading: boolean;
  isAdmin: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  isAdmin: false,
  signInWithGoogle: async () => {},
  signOut: async () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    // Handle redirect result (for Safari/iOS fallback)
    getRedirectResult(auth).catch((err) => {
      console.error("Redirect result error:", err);
    });

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        try {
          const athleteRef = doc(db, "crown-athletes", firebaseUser.uid);
          const athleteSnap = await getDoc(athleteRef);
          if (!athleteSnap.exists()) {
            await setDoc(athleteRef, {
              email: firebaseUser.email,
              name: firebaseUser.displayName,
              photoURL: firebaseUser.photoURL,
              role: "athlete",
              createdAt: new Date().toISOString(),
              targetWeight: 0,
            });
            setIsAdmin(false);
          } else {
            const role = athleteSnap.data()?.role;
            setIsAdmin(
              firebaseUser.email === OWNER_EMAIL || role === "admin"
            );
          }
        } catch (error) {
          console.error("Error upserting athlete:", error);
          setIsAdmin(firebaseUser.email === OWNER_EMAIL);
        }
      } else {
        setIsAdmin(false);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({
      prompt: 'select_account'
    });

    // Detect if we should use redirect directly
    // Safari, Chrome iOS, and in-app browsers all use WebKit which has ITP issues
    const ua = navigator.userAgent;
    const isSafari = /^((?!chrome|android).)*safari/i.test(ua);
    const isIOSChrome = /CriOS/i.test(ua);
    const isInAppBrowser = /FBAN|FBAV|Instagram|Line|WhatsApp/i.test(ua);
    const useRedirect = isSafari || isIOSChrome || isInAppBrowser;

    if (useRedirect) {
      // Redirect flow for Safari/iOS — avoids popup and sessionStorage issues
      try {
        await signInWithRedirect(auth, provider);
      } catch (err: any) {
        console.error("Redirect login error:", err);
        alert("Login gagal. Silakan coba lagi.");
      }
      return;
    }
    
    try {
      await signInWithPopup(auth, provider);
    } catch (err: any) {
      console.error("Login error:", err);
      // Ignore user cancellation
      if (
        err.code === "auth/cancelled-popup-request" ||
        err.code === "auth/popup-closed-by-user"
      ) {
        return;
      }
      
      // Popup blocked — fallback to redirect
      if (err.code === "auth/popup-blocked" || err.message?.toLowerCase().includes("popup")) {
        try {
          await signInWithRedirect(auth, provider);
        } catch {
          alert("Pop-up diblokir. Jika Anda membuka dari WhatsApp/Line/Instagram, silakan klik tombol titik tiga (⋮) di pojok kanan atas dan pilih 'Buka di Chrome/Safari'.");
        }
        return;
      }

      // Other errors — try redirect as last resort
      try {
        await signInWithRedirect(auth, provider);
      } catch {
        alert("Login gagal. Silakan coba lagi atau buka di browser lain.");
      }
    }
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
  };

  return (
    <AuthContext.Provider value={{ user, loading, isAdmin, signInWithGoogle, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
