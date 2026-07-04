export function Logo({ className = "" }: { className?: string }) {
  return (
    <span
      className={`font-sans font-bold tracking-tight bg-clip-text text-transparent ${className}`}
      style={{
        backgroundImage: 'linear-gradient(to right, #FF0055, #7000FF, #00F0FF)',
      }}
    >
      سديم
    </span>
  );
}
