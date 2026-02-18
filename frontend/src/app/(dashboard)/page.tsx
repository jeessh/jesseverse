"use client";

import { useEffect, useState } from "react";
import { AppCard } from "@/components/ui/AppCard";
import { getDashboardApps } from "@/apps/registry";
import { getUser } from "@/lib/supabase";

export default function DashboardPage() {
  const [greeting, setGreeting] = useState("Welcome");
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const apps = getDashboardApps();

  useEffect(() => {
    // Set greeting based on time of day
    const hour = new Date().getHours();
    if (hour < 12) setGreeting("Good morning");
    else if (hour < 18) setGreeting("Good afternoon");
    else setGreeting("Good evening");

    // Get user info
    async function loadUser() {
      const { user } = await getUser();
      setUserEmail(user?.email || null);
    }
    loadUser();
  }, []);

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          {greeting}!
        </h1>
        {userEmail && (
          <p className="mt-1 text-gray-500 dark:text-gray-400">
            {userEmail}
          </p>
        )}
      </div>

      {/* App Grid */}
      <section>
        <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-4">
          Your Apps
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {apps.map((app) => (
            <AppCard key={app.id} app={app} />
          ))}
        </div>
        
        {apps.length === 0 && (
          <div className="card text-center py-12">
            <p className="text-gray-500 dark:text-gray-400">
              No apps available yet. Add apps in the registry to get started.
            </p>
          </div>
        )}
      </section>

      {/* Quick actions or recent activity can go here */}
      <section className="mt-12">
        <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-4">
          Quick Start
        </h2>
        <div className="card">
          <p className="text-gray-600 dark:text-gray-400">
            Welcome to Jessiverse! This is your personal hub for organization and productivity.
          </p>
          <ul className="mt-4 space-y-2 text-sm text-gray-500 dark:text-gray-400">
            <li>• Use the sidebar to navigate between apps</li>
            <li>• Connect with Poke to interact via your phone</li>
            <li>• New apps will appear here as they&apos;re enabled</li>
          </ul>
        </div>
      </section>
    </div>
  );
}
