export function Logo({ className = "" }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 500 500"
      width="100%"
      height="100%"
      className={className}
    >
      <defs>
        <linearGradient id="strongNebula" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FF0055" />
          <stop offset="50%" stopColor="#7000FF" />
          <stop offset="100%" stopColor="#00F0FF" />
        </linearGradient>

        <linearGradient id="coreLight" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFB3D9" />
          <stop offset="50%" stopColor="#D9B3FF" />
          <stop offset="100%" stopColor="#B3FFFF" />
        </linearGradient>

        <filter id="hyperGlow" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="25" result="blurOut" />
          <feComposite in="SourceGraphic" in2="blurOut" operator="over" />
        </filter>
      </defs>

      <rect width="100%" height="100%" rx="100" fill="#030305" />

      <path
        d="M 410 70 Q 420 100 450 110 Q 420 120 410 150 Q 400 120 370 110 Q 400 100 410 70 Z"
        fill="#00F0FF"
        filter="url(#hyperGlow)"
      />
      <path
        d="M 100 360 Q 105 375 120 380 Q 105 385 100 400 Q 95 385 80 380 Q 95 375 100 360 Z"
        fill="#FF0055"
        filter="url(#hyperGlow)"
      />

      <g filter="url(#hyperGlow)">
        <path
          d="M 360 140 C 360 30 140 30 140 190 C 140 320 360 180 360 310 C 360 470 140 470 140 360"
          fill="none"
          stroke="url(#strongNebula)"
          strokeWidth="75"
          strokeLinecap="round"
        />
      </g>

      <path
        d="M 360 140 C 360 30 140 30 140 190 C 140 320 360 180 360 310 C 360 470 140 470 140 360"
        fill="none"
        stroke="url(#coreLight)"
        strokeWidth="18"
        strokeLinecap="round"
        opacity="0.8"
      />
    </svg>
  );
}
