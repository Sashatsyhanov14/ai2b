export default function Spinner({ size = 16, className = '' }: { size?: number; className?: string }) {
  const s = `${size}px`;
  return (
    <span
      className={`inline-block animate-spin rounded-full border-2 border-zinc-300 border-t-transparent light:border-zinc-400 ${className}`}
      style={{ width: s, height: s }}
      aria-label="loading"
    />
  );
}

