export default function PageHeader({
  title,
  subtitle,
  children,
}: { title: string; subtitle?: string; children?: React.ReactNode }) {
  return (
    <div className="mb-6 border-b border-zinc-800 light:border-zinc-200">
      <div className="flex items-start justify-between gap-4 max-w-7xl mx-auto px-6 pt-4">
        <div>
          <h1 className="text-xl font-semibold">{title}</h1>
          {subtitle && <p className="text-sm text-zinc-400 light:text-zinc-600 mt-1">{subtitle}</p>}
        </div>
        <div className="flex items-center gap-2">{children}</div>
      </div>
    </div>
  );
}
