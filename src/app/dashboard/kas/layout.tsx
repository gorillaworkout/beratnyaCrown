"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export default function KasLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);

  useEffect(() => {
    if (loading) return;
    
    if (!user) {
      router.push("/login");
      return;
    }

    if (user.email === "darmawanbayu1@gmail.com") {
      setIsAuthorized(true);
      return;
    }

    getDoc(doc(db, "crown-athletes", user.uid)).then(d => {
      if (d.exists() && d.data().role === "admin") {
        setIsAuthorized(true);
      } else {
        router.push("/dashboard");
      }
    });
  }, [user, loading, router]);

  if (isAuthorized === null || loading) return null;

  return <>{children}</>;
}