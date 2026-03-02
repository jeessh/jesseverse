"use client";

import { useState, useEffect, useRef } from "react";
import { Blocks } from "lucide-react";

interface Props {
  children: React.ReactNode;
}

export function PageLoader({ children }: Props) {
  const [phase, setPhase] = useState<"spinning" | "exiting" | "done">("spinning");
  const [snap, setSnap] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    // snap the icon into place after first spin cycle (~0.9s)
    const snapTimer = setTimeout(() => setSnap(true), 900);

    // minimum display time = 1.5s, then begin fade-out
    timerRef.current = setTimeout(() => {
      setPhase("exiting");
      // after fade-out completes, reveal children
      setTimeout(() => setPhase("done"), 300);
    }, 1500);

    return () => {
      clearTimeout(snapTimer);
      clearTimeout(timerRef.current);
    };
  }, []);

  if (phase === "done") {
    return <div className="animate-fade-in-up">{children}</div>;
  }

  return (
    <>
      {/* preload children invisibly so data fetching + streaming starts immediately */}
      <div className="sr-only" aria-hidden>
        {children}
      </div>

      {/* loader overlay */}
      <div
        className={`flex flex-col items-center justify-center gap-4 py-24 transition-opacity duration-300 ${
          phase === "exiting" ? "animate-fade-out" : ""
        }`}
      >
        <Blocks
          className={`h-10 w-10 text-primary ${
            snap ? "opacity-100" : "animate-spin-snap opacity-90"
          }`}
          strokeWidth={1.5}
        />
        <p className="text-sm font-medium text-muted-foreground tracking-wide">
          Loading extensions
          <span className="ml-0.5 inline-flex gap-0.5">
            <span className="animate-blink" style={{ animationDelay: "0ms" }}>.</span>
            <span className="animate-blink" style={{ animationDelay: "200ms" }}>.</span>
            <span className="animate-blink" style={{ animationDelay: "400ms" }}>.</span>
          </span>
        </p>
      </div>
    </>
  );
}
