'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function HomePage() {
  const router = useRouter();
  
  useEffect(() => {
    // Preserve hash and search params during redirect
    const target = '/app' + window.location.search + window.location.hash;
    router.replace(target);
  }, [router]);

  return (
    <div className="min-h-screen bg-[#0a0a0c] flex items-center justify-center">
      <div className="animate-pulse text-zinc-500 font-mono text-xs">
        REDIRECTING WITH HASH...
      </div>
    </div>
  );
}
