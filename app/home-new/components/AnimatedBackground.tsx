"use client";

export default function AnimatedBackground() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden bg-white">
      {/* Subtle gradient accents */}
      <div
        className="absolute inset-0 opacity-5"
        style={{
          background: `
            radial-gradient(at 20% 10%, rgba(50, 59, 106, 0.15) 0px, transparent 50%),
            radial-gradient(at 80% 90%, rgba(144, 53, 206, 0.12) 0px, transparent 50%),
            radial-gradient(at 50% 50%, rgba(0, 168, 196, 0.08) 0px, transparent 50%)
          `,
        }}
      />
    </div>
  );
}
