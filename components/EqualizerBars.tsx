'use client';

const BAR_DELAYS = [0, 0.15, 0.3, 0.45, 0.6, 0.45, 0.3, 0.15];

export default function EqualizerBars() {
  return (
    <div className="flex h-6 items-end gap-1">
      {BAR_DELAYS.map((delay, i) => (
        <span
          key={i}
          className="w-1 rounded-full bg-gradient-to-t from-magenta via-gold to-cyan"
          style={{
            animation: `mando-eq 0.9s ease-in-out ${delay}s infinite alternate`,
            height: '30%',
          }}
        />
      ))}
      <style jsx>{`
        @keyframes mando-eq {
          from {
            height: 20%;
          }
          to {
            height: 100%;
          }
        }
      `}</style>
    </div>
  );
}
