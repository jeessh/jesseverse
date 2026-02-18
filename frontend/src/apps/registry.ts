import { LucideIcon, Home, StickyNote, Receipt, MessageSquare, Settings } from "lucide-react";

/**
 * App definition for the registry.
 *
 * To add a new app:
 * 1. Add the app definition to the APPS array below
 * 2. Create the app's pages in /app/[app-route]/
 * 3. Create app-specific components in /components/apps/[app-name]/
 */
export interface AppDefinition {
  // Unique identifier for the app
  id: string;
  // Display name
  name: string;
  // Short description
  description: string;
  // Route path (without leading slash)
  route: string;
  // Lucide icon component
  icon: LucideIcon;
  // Whether to show in sidebar
  showInSidebar: boolean;
  // Whether to show on dashboard
  showOnDashboard: boolean;
  // Optional color theme
  color?: string;
  // Whether the app is ready/enabled
  enabled: boolean;
}

/**
 * Central registry of all Jessiverse apps.
 *
 * Add new apps here and they'll automatically appear
 * in the sidebar and dashboard.
 */
export const APPS: AppDefinition[] = [
  {
    id: "dashboard",
    name: "Dashboard",
    description: "Your central hub",
    route: "",
    icon: Home,
    showInSidebar: true,
    showOnDashboard: false,
    enabled: true,
  },
  {
    id: "notes",
    name: "Notes",
    description: "Quick notes and thoughts",
    route: "notes",
    icon: StickyNote,
    showInSidebar: true,
    showOnDashboard: true,
    color: "#fbbf24", // amber
    enabled: false, // Template - not yet implemented
  },
  {
    id: "splits",
    name: "Splits",
    description: "Track shared expenses",
    route: "splits",
    icon: Receipt,
    showInSidebar: true,
    showOnDashboard: true,
    color: "#34d399", // emerald
    enabled: false, // Template - not yet implemented
  },
  {
    id: "poke",
    name: "Poke",
    description: "Phone-based commands",
    route: "poke",
    icon: MessageSquare,
    showInSidebar: true,
    showOnDashboard: true,
    color: "#818cf8", // indigo
    enabled: true,
  },
  {
    id: "settings",
    name: "Settings",
    description: "Configure your Jessiverse",
    route: "settings",
    icon: Settings,
    showInSidebar: true,
    showOnDashboard: false,
    enabled: true,
  },
];

// Helper functions
export function getApp(id: string): AppDefinition | undefined {
  return APPS.find((app) => app.id === id);
}

export function getSidebarApps(): AppDefinition[] {
  return APPS.filter((app) => app.showInSidebar && app.enabled);
}

export function getDashboardApps(): AppDefinition[] {
  return APPS.filter((app) => app.showOnDashboard && app.enabled);
}

export function getEnabledApps(): AppDefinition[] {
  return APPS.filter((app) => app.enabled);
}
