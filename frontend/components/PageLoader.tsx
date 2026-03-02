"use client";

import { useState, useEffect, useRef, createContext, useContext, useCallback } from "react";
import { Blocks } from "lucide-react";

// ── Ready signal ─────────────────────────────────────────────────────────────

const LoaderContext = createContext<{ onReady: () => void }>({ onReady: () => {} });

/**
 * Drop this inside the async server component that PageLoader wraps.
 * It mounts only after data has resolved and streamed, signalling
 * PageLoader to begin the exit transition.
 */
export function LoaderReadySignal() {
  const { onReady } = useContext(LoaderContext);
  useEffect(() => { onReady(); }, [onReady]);
  return null;
}

// ── Loader ───────────────────────────────────────────────────────────────────

interface Props {
  children: React.ReactNode;
}

const ORBIT_DELAYS = ["0s", "-0.6s", "-1.2s"];

// Minimum visible time (ms) — prevents a flash when data loads near-instantly.
const MIN_MS = 800;

export function PageLoader({ children }: Props) {
  const [phase, setPhase] = useState<"orbiting" | "exiting" | "done">("orbiting");

  // Refs let tryExit read current state without stale closures or
  // re-running effects whenever phase changes.
  const phaseRef        = useRef<"orbiting" | "exiting" | "done">("orbiting");
  const dataReadyRef    = useRef(false);
  const minTimeReadyRef = useRef(false);
  const exitTimerRef    = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const updatePhase = useCallback((p: "orbiting" | "exiting" | "done") => {
    phaseRef.current = p;
    setPhase(p);
  }, []);

  // Exit only when BOTH gates are open: minimum time elapsed + data ready.
  const tryExit = useCallback(() => {
    if (dataReadyRef.current && minTimeReadyRef.current && phaseRef.current === "orbiting") {
      updatePhase("exiting");
      exitTimerRef.current = setTimeout(() => updatePhase("done"), 350);
    }
  }, [updatePhase]);

  // Gate 1 — minimum display time
  useEffect(() => {
    const t = setTimeout(() => {
      minTimeReadyRef.current = true;
      tryExit();
    }, MIN_MS);
    return () => {
      clearTimeout(t);
      clearTimeout(exitTimerRef.current);
    };
  }, [tryExit]);

  // Gate 2 — data ready (called by LoaderReadySignal)
  const onReady = useCallback(() => {
    if (dataReadyRef.current) return; // guard against double-fire
    dataReadyRef.current = true;
    tryExit();
  }, [tryExit]);

  if (phase === "done") {
    return <div className="animate-fade-in-up">{children}</div>;
  }

  return (
    <LoaderContext.Provider value={{ onReady }}>
      {/* preload children invisibly so data fetching starts immediately;
          LoaderReadySignal inside children will fire onReady when data resolves */}
      <div className="sr-only" aria-hidden>{children}</div>

      {/* cosmic loader */}
      <div
        className={`flex flex-col items-center justify-center gap-5 py-24 ${
          phase === "exiting" ? "animate-fade-out" : ""
        }`}
      >
        {/* orbiting dots around central icon */}
        <div className="relative flex h-16 w-16 items-center justify-center">
          {/* center icon */}
          <Blocks
            className="animate-icon-pulse h-7 w-7 text-primary"
            strokeWidth={1.5}
          />

          {/* faint orbit ring */}
          <div className="absolute inset-0 rounded-full ring-1 ring-primary/15" />

          {/* 3 orbiting dots */}
          {ORBIT_DELAYS.map((delay, i) => (
            <div
              key={i}
              className="animate-orbit absolute inset-0 flex items-center justify-center"
              style={{ animationDelay: delay }}
            >
              <div
                className="h-1.5 w-1.5 rounded-full bg-primary"
                style={{
                  transform: "translateX(32px)",
                  opacity: 0.7 - i * 0.15,
                }}
              />
            </div>
          ))}
        </div>

        <p className="text-xs font-medium tracking-widest text-muted-foreground/60 uppercase">
          Loading extensions
        </p>
      </div>
    </LoaderContext.Provider>
  );
}
