"use client";

import { useState, useEffect } from "react";
import { MessageSquare, Terminal } from "lucide-react";
import { api } from "@/lib/api";

interface HandlersResponse {
  handlers: string[];
  count: number;
}

export default function PokePage() {
  const [handlers, setHandlers] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadHandlers() {
      try {
        const data = await api.get<HandlersResponse>("/api/poke/handlers", { public: true });
        setHandlers(data.handlers);
      } catch (error) {
        console.error("Failed to load handlers:", error);
      } finally {
        setIsLoading(false);
      }
    }
    loadHandlers();
  }, []);

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <MessageSquare className="w-8 h-8 text-indigo-500" />
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Poke
        </h1>
      </div>

      {/* Overview */}
      <section className="card mb-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Phone-Based Commands
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Poke lets you interact with Jessiverse by sending text messages to your
          connected phone number. Each app can register commands that you can
          trigger via SMS.
        </p>
      </section>

      {/* Available Commands */}
      <section className="card mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Terminal className="w-5 h-5 text-gray-500" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Available Commands
          </h2>
        </div>
        
        {isLoading ? (
          <div className="animate-pulse space-y-2">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-32"></div>
          </div>
        ) : handlers.length > 0 ? (
          <div className="space-y-2">
            {handlers.map((handler) => (
              <div
                key={handler}
                className="flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg"
              >
                <code className="text-sm font-mono text-primary-600 dark:text-primary-400">
                  {handler}
                </code>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            No commands registered yet. Commands will appear here as you add apps.
          </p>
        )}
      </section>

      {/* How to Use */}
      <section className="card">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          How to Use
        </h2>
        <ol className="space-y-3 text-gray-600 dark:text-gray-400">
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 text-sm font-medium flex items-center justify-center">
              1
            </span>
            <span>Connect your Poke account in Settings</span>
          </li>
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 text-sm font-medium flex items-center justify-center">
              2
            </span>
            <span>Text a command to your Jessiverse phone number</span>
          </li>
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 text-sm font-medium flex items-center justify-center">
              3
            </span>
            <span>Receive a response with the result</span>
          </li>
        </ol>
        <div className="mt-4 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Example:
          </p>
          <code className="text-sm text-gray-600 dark:text-gray-400">
            help
          </code>
          <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
            → Returns available commands
          </p>
        </div>
      </section>
    </div>
  );
}
