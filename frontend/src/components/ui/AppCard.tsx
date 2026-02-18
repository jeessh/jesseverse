"use client";

import Link from "next/link";
import { AppDefinition } from "@/apps/registry";

interface AppCardProps {
  app: AppDefinition;
}

export function AppCard({ app }: AppCardProps) {
  const Icon = app.icon;

  return (
    <Link
      href={`/${app.route}`}
      className="group card hover:shadow-lg transition-all duration-200 hover:-translate-y-1"
    >
      <div className="flex items-start gap-4">
        {/* Icon */}
        <div
          className="p-3 rounded-xl"
          style={{ backgroundColor: app.color ? `${app.color}20` : "#e5e7eb" }}
        >
          <Icon
            size={28}
            style={{ color: app.color || "#6b7280" }}
          />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
            {app.name}
          </h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {app.description}
          </p>
        </div>

        {/* Arrow indicator */}
        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
          <svg
            className="w-5 h-5 text-primary-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5l7 7-7 7"
            />
          </svg>
        </div>
      </div>

      {/* Status indicator for disabled apps */}
      {!app.enabled && (
        <div className="mt-4 text-xs font-medium text-amber-600 dark:text-amber-400">
          Coming soon
        </div>
      )}
    </Link>
  );
}
