import Link from 'next/link'

export default function Navbar(){
  return (
    <header className="sticky top-0 z-20 border-b border-white/10 bg-bg/80 backdrop-blur">
      <nav className="mx-auto max-w-7xl px-4 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <img src="/logo.svg" alt="logo" className="h-6 w-6"/><span className="font-semibold">AI2Business</span>
        </Link>
        <div className="flex items-center gap-4 text-sm">
          <Link href="/app/overview" className="opacity-80 hover:opacity-100">Overview</Link>
          <Link href="/app/dashboard" className="opacity-80 hover:opacity-100">Dashboard</Link>
        </div>
      </nav>
    </header>
  )
}
