"use client";

import { useState, useEffect } from "react";
import { getUser } from "@/lib/supabase";
import { Settings } from "lucide-react";

export default function SettingsPage() {
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    async function loadUser() {
      const { user } = await getUser();
      setUserEmail(user?.email || null);
    }
    loadUser();
  }, []);

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <Settings className="w-8 h-8 text-gray-700 dark:text-gray-300" />
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Settings
        </h1>
      </div>

      {/* Account Section */}
      <section className="card mb-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Account
        </h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">
              Email
            </label>
            <p className="mt-1 text-gray-900 dark:text-white">
              {userEmail || "Loading..."}
            </p>
          </div>
        </div>
      </section>

      {/* Poke Integration Section */}
      <section className="card mb-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Poke Integration
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          Connect your phone number to interact with Jessiverse via text messages.
        </p>
        <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Poke integration settings coming soon.
          </p>
        </div>
      </section>

      {/* Apps Section */}
      <section className="card">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Apps
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          Manage your installed apps and their settings.
        </p>
        <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            App management coming soon.
          </p>
        </div>
      </section>
    </div>
  );
}
