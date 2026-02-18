"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/ui/Sidebar";
import { getSession } from "@/lib/supabase";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    async function checkAuth() {
      const { session } = await getSession();
      
      if (!session) {
        router.push("/login");
        return;
      }
      
      setIsAuthenticated(true);
      setIsLoading(false);
    }
    
    checkAuth();
  }, [router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen">
      <Sidebar />
      <main className="md:ml-64 min-h-screen p-6 pt-20 md:pt-6">
        {children}
      </main>
    </div>
  );
}
