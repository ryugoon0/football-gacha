/**
 * The locker room the manager walks into: a tactics board, the kit on its peg,
 * a ball on the floor and the gaffer with his back to us. Drawn as one SVG so
 * it scales cleanly and ships no image files.
 */
export default function LockerRoomScene({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 400 220"
      role="img"
      aria-label="라커룸 — 전술판과 유니폼, 축구공, 감독의 뒷모습"
      className={className}
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        <linearGradient id="lr-wall" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1d3049" />
          <stop offset="100%" stopColor="#0d1728" />
        </linearGradient>
        <linearGradient id="lr-board" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#12281f" />
          <stop offset="100%" stopColor="#0e1f18" />
        </linearGradient>
        <linearGradient id="lr-coach" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1e293b" />
          <stop offset="100%" stopColor="#0f172a" />
        </linearGradient>
        <radialGradient id="lr-glow" cx="50%" cy="18%" r="65%">
          <stop offset="0%" stopColor="#34d399" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#34d399" stopOpacity="0" />
        </radialGradient>
      </defs>

      <rect width="400" height="220" fill="url(#lr-wall)" />
      <rect width="400" height="220" fill="url(#lr-glow)" />

      {/* lockers along the back wall */}
      <g opacity="0.9">
        {[0, 1, 2, 3, 4, 5].map((index) => (
          <g key={index} transform={`translate(${8 + index * 66} 26)`}>
            <rect width="58" height="150" rx="4" fill="#16273d" stroke="#31496a" />
            <rect x="8" y="10" width="42" height="26" rx="3" fill="#1d32f4d" />
            <circle cx="48" cy="82" r="2.4" fill="#5b7ba3" />
          </g>
        ))}
      </g>

      {/* bench */}
      <rect x="0" y="176" width="400" height="10" rx="3" fill="#1b2b40" />
      <rect x="0" y="186" width="400" height="34" fill="#0a1220" />
      <rect x="46" y="186" width="8" height="26" fill="#16253a" />
      <rect x="330" y="186" width="8" height="26" fill="#16253a" />

      {/* tactics board */}
      <g transform="translate(214 36)">
        <rect width="150" height="104" rx="6" fill="url(#lr-board)" stroke="#2c4a3c" />
        <rect x="8" y="8" width="134" height="88" rx="3" fill="none" stroke="#3d6b56" strokeWidth="1" />
        <line x1="75" y1="8" x2="75" y2="96" stroke="#3d6b56" strokeWidth="1" />
        <circle cx="75" cy="52" r="13" fill="none" stroke="#3d6b56" strokeWidth="1" />
        <rect x="8" y="34" width="14" height="36" fill="none" stroke="#3d6b56" strokeWidth="1" />
        <rect x="128" y="34" width="14" height="36" fill="none" stroke="#3d6b56" strokeWidth="1" />
        {/* our shape, chalked on */}
        {[
          [28, 52],
          [50, 26],
          [50, 52],
          [50, 78],
          [72, 34],
          [72, 70],
        ].map(([x, y]) => (
          <circle key={`${x}-${y}`} cx={x} cy={y} r="4" fill="#34d399" />
        ))}
        {[
          [104, 30],
          [104, 74],
          [120, 52],
        ].map(([x, y]) => (
          <g key={`x-${x}-${y}`} stroke="#f87171" strokeWidth="1.6" strokeLinecap="round">
            <line x1={x - 3.5} y1={y - 3.5} x2={x + 3.5} y2={y + 3.5} />
            <line x1={x + 3.5} y1={y - 3.5} x2={x - 3.5} y2={y + 3.5} />
          </g>
        ))}
        <path
          d="M76 34 C94 20 108 24 118 40"
          fill="none"
          stroke="#fbbf24"
          strokeWidth="1.8"
          strokeDasharray="4 3"
          strokeLinecap="round"
        />
        <path d="M118 40 l-5 -4 M118 40 l1 -6" stroke="#fbbf24" strokeWidth="1.8" strokeLinecap="round" />
      </g>

      {/* kit on its peg */}
      <g transform="translate(96 44)">
        <rect x="24" y="-8" width="4" height="10" rx="2" fill="#33475f" />
        <path
          d="M10 4 L26 -2 L42 4 L48 16 L40 20 L40 62 Q26 66 12 62 L12 20 L4 16 Z"
          fill="#0ea5e9"
          fillOpacity="0.85"
          stroke="#38bdf8"
          strokeWidth="1.2"
        />
        <path d="M20 0 Q26 8 32 0" fill="none" stroke="#0b1422" strokeWidth="1.6" />
        <text
          x="26"
          y="44"
          textAnchor="middle"
          fontSize="20"
          fontWeight="800"
          fill="#0b1422"
          fontFamily="system-ui, sans-serif"
        >
          10
        </text>
      </g>

      {/* the ball */}
      <g transform="translate(60 158)">
        <ellipse cx="0" cy="20" rx="20" ry="4" fill="#000" opacity="0.35" />
        <circle r="17" fill="#f8fafc" stroke="#cbd5e1" />
        <path
          d="M0 -9 L8 -3 L5 7 L-5 7 L-8 -3 Z"
          fill="#0f172a"
        />
        {[0, 72, 144, 216, 288].map((angle) => (
          <line
            key={angle}
            x1="0"
            y1="0"
            x2={Math.cos((angle * Math.PI) / 180) * 17}
            y2={Math.sin((angle * Math.PI) / 180) * 17}
            stroke="#0f172a"
            strokeWidth="1.1"
            opacity="0.55"
          />
        ))}
      </g>

      {/* the gaffer, seen from behind */}
      <g transform="translate(150 92)">
        <ellipse cx="0" cy="92" rx="42" ry="6" fill="#000" opacity="0.35" />
        <path
          d="M-34 92 L-30 34 Q-28 14 0 12 Q28 14 30 34 L34 92 Z"
          fill="url(#lr-coach)"
          stroke="#233247"
        />
        <path d="M-30 40 L30 40" stroke="#1b2739" strokeWidth="2" />
        <circle cx="0" cy="-2" r="15" fill="#243449" />
        <path d="M-15 -4 Q0 -20 15 -4 Z" fill="#1b2739" />
        <path d="M-16 -3 Q0 -12 16 -3" fill="none" stroke="#334155" strokeWidth="3" strokeLinecap="round" />
        {/* clipboard under the arm */}
        <g transform="translate(28 52) rotate(12)">
          <rect width="20" height="26" rx="2" fill="#e2e8f0" />
          <rect x="6" y="-2" width="8" height="4" rx="1" fill="#94a3b8" />
          <line x1="4" y1="8" x2="16" y2="8" stroke="#94a3b8" strokeWidth="1.4" />
          <line x1="4" y1="13" x2="16" y2="13" stroke="#94a3b8" strokeWidth="1.4" />
          <line x1="4" y1="18" x2="12" y2="18" stroke="#94a3b8" strokeWidth="1.4" />
        </g>
      </g>
    </svg>
  )
}
