"use client";

import { useEffect, useRef } from "react";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

const COUNT = 38;
const LINK_DIST = 110;
const DOT_SPEED = 0.35;

export function ParticleField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf: number;
    const particles: Particle[] = [];

    // Read --primary from CSS vars so it respects dark mode
    const getPrimaryHSL = () => {
      const raw = getComputedStyle(document.documentElement)
        .getPropertyValue("--primary")
        .trim(); // e.g. "244 75% 57%"
      return raw || "244 75% 65%";
    };

    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };

    const init = () => {
      particles.length = 0;
      for (let i = 0; i < COUNT; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = DOT_SPEED * (0.5 + Math.random() * 0.5);
        particles.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
        });
      }
    };

    resize();
    init();

    const onResize = () => { resize(); init(); };
    window.addEventListener("resize", onResize);

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const hsl = getPrimaryHSL();

      // update
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        // soft bounce off edges
        if (p.x < 0)            { p.x = 0;            p.vx = Math.abs(p.vx); }
        if (p.x > canvas.width) { p.x = canvas.width; p.vx = -Math.abs(p.vx); }
        if (p.y < 0)            { p.y = 0;            p.vy = Math.abs(p.vy); }
        if (p.y > canvas.height){ p.y = canvas.height; p.vy = -Math.abs(p.vy); }
      }

      // lines between nearby particles
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < LINK_DIST) {
            const alpha = ((1 - dist / LINK_DIST) * 0.45).toFixed(3);
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `hsl(${hsl} / ${alpha})`;
            ctx.lineWidth = 0.6;
            ctx.stroke();
          }
        }
      }

      // dots
      for (const p of particles) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, 1.5, 0, Math.PI * 2);
        ctx.fillStyle = `hsl(${hsl} / 0.55)`;
        ctx.fill();
      }

      raf = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className="pointer-events-none absolute inset-x-0 w-full"
      style={{
        top: "-100px",
        height: "calc(100% + 100px)",
        maskImage: "linear-gradient(to bottom, black 0%, black 40%, rgba(0,0,0,0.6) 65%, rgba(0,0,0,0.15) 85%, transparent 100%)",
        WebkitMaskImage: "linear-gradient(to bottom, black 0%, black 40%, rgba(0,0,0,0.6) 65%, rgba(0,0,0,0.15) 85%, transparent 100%)",
      }}
    />
  );
}
