"use client";
import { ReactNode } from 'react';

export function Field({ label, error, hint, children, className = '' }: {
  label: string;
  error?: string;
  hint?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      {children}
      <div className={`mt-1 text-xs ${error ? 'text-red-400' : 'text-white/50 light:text-zinc-500'}`}>
        {error ? error : (hint ?? label)}
      </div>
    </div>
  );
}

