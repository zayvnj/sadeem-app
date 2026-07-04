import { Cairo } from 'next/font/google'

const cairo = Cairo({ subsets: ['arabic'], weight: ['700', '800'] })

export function Logo({ className = "" }: { className?: string }) {
  return (
    <span
      className={`${cairo.className} font-extrabold tracking-tight bg-clip-text text-transparent drop-shadow-sm ${className}`}
      style={{
        backgroundImage: 'linear-gradient(to right, #FF0055, #7000FF, #00F0FF)',
      }}
    >
      سديم
    </span>
  );
}
