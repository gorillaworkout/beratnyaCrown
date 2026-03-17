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

type AuthContextType = {
  user: User | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signInWithGoogle: async () => {},
  signOut: async () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // 1. Check for redirect result first (in case we're coming back from a mobile Google login)
  useEffect(() => {
    const checkRedirect = async () => {
      try {
        const result = await getRedirectResult(auth);
        if (result && result.user) {
          // Will be handled by onAuthStateChanged, but good to ensure redirect finishes resolving
          console.log("Redirect login successful");
        }
      } catch (err) {
        console.error("Error from getRedirectResult:", err);
      }
    };
    checkRedirect();
  }, []);

  // 2. Main auth state listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        // Upsert athlete profile in Firestore (crown-athletes collection)
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
          }
        } catch (error) {
          console.error("Error upserting athlete:", error);
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    // Fallback logic for mobile browsers (especially Safari/iOS WebViews/WhatsApp)
    // If popup fails or we are in an environment that blocks popups/storage, use redirect.
    try {
      const isMobileOrWebView = /iPhone|iPad|iPod|Android|webOS/i.test(navigator.userAgent);
      if (isMobileOrWebView) {
        // Redirect is safer on mobile browsers to avoid cross-origin storage issues
        await signInWithRedirect(auth, provider);
      } else {
        await signInWithPopup(auth, provider);
      }
    } catch (err: unknown) {
      const error = err as { code?: string };
      // Ignore cancelled-popup-request (React Strict Mode double-render)
      // and popup-closed-by-user (user closed the popup)
      if (
        error.code === "auth/cancelled-popup-request" ||
        error.code === "auth/popup-closed-by-user"
      ) {
        return;
      }
      // If popup was blocked, fallback to redirect
      if (error.code === "auth/popup-blocked") {
        await signInWithRedirect(auth, provider);
        return;
      }
      throw err;
    }
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
  };

  return (
    <AuthContext.Provider value={{ user, loading, signInWithGoogle, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
