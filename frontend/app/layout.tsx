import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { ToastProvider } from "@/components/ui/toast";
import { ThemeToggle } from "@/components/ThemeToggle";
import "./globals.css";

export const metadata: Metadata = {
  title: "Jesseverse",
  description: "Personal hub for all your tools and services",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var s=localStorage.getItem('theme'),p=window.matchMedia('(prefers-color-scheme: dark)').matches;document.documentElement.classList.toggle('dark',s==='dark'||(!s&&p))}catch(e){}})()`,
          }}
        />
      </head>
      <body className="min-h-screen bg-background antialiased">
        <ToastProvider>{children}</ToastProvider>
        <div className="fixed bottom-5 right-5 z-50">
          <ThemeToggle />
        </div>
      </body>
    </html>
  );
}
