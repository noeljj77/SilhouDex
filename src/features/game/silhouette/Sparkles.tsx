/** Positions are fixed (not random), so the backdrop looks the same on every render and device. */
const SPARKLES = Array.from({ length: 20 }, (_, i) => {
  const golden = 0.618033988749895;
  return {
    left: ((i * golden * 7.3) % 1) * 100,
    top: ((i * golden * 3.1 + 0.17) % 1) * 100,
    size: 2 + ((i * 5) % 4),
    delay: (i * 0.9) % 6,
    duration: 4.5 + ((i * 7) % 5),
  };
});

/** Faint, slow, twinkling dots behind the silhouette. Purely decorative. */
export function Sparkles() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {SPARKLES.map((s, i) => (
        <span
          key={i}
          className="sparkle absolute rounded-full bg-white"
          style={
            {
              left: `${s.left}%`,
              top: `${s.top}%`,
              width: s.size,
              height: s.size,
              '--delay': `${s.delay}s`,
              '--dur': `${s.duration}s`,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}
