"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { auth, db } from "./firebase";
import {
  User,
  GoogleAuthProvider,
  signInWithPopup,
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

        // Catat kunjungan. Satu catatan per sesi tab supaya refresh halaman
        // tidak membanjiri koleksi. Gagal mencatat tidak boleh memblokir login.
        try {
          const key = `crown-login-logged-${firebaseUser.uid}`;
          if (!sessionStorage.getItem(key)) {
            sessionStorage.setItem(key, "1");
            const coordsRaw = localStorage.getItem("crown-share-gps-coords");
            void fetch("/api/login-log", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                uid: firebaseUser.uid,
                email: firebaseUser.email,
                name: firebaseUser.displayName,
                coords: coordsRaw ? JSON.parse(coordsRaw) : null,
              }),
            }).catch(() => {});
          }
        } catch {
          // sessionStorage bisa diblokir di mode privat — abaikan.
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
      
      // Jika diblokir oleh In-App Browser (WhatsApp/Line/Instagram)
      if (err.code === "auth/popup-blocked" || err.message?.toLowerCase().includes("popup")) {
        alert("Pop-up diblokir. Jika Anda membuka dari WhatsApp/Line/Instagram, silakan klik tombol titik tiga (⋮) di pojok kanan atas dan pilih 'Buka di Chrome/Safari'.");
        return;
      }
      
      throw err;
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
