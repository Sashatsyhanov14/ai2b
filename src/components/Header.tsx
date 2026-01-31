"use client";

import LanguageMenu from "./LanguageMenu";

export default function Header() {
  return (
    <header className="h-14 border-b border-zinc-800 bg-zinc-950 flex items-center justify-between px-6 light:border-zinc-200 light:bg-white relative z-10">
      <div className="text-sm text-zinc-400 font-medium tracking-wide light:text-zinc-600">ai2business dashboard</div>
      <div className="flex items-center gap-2">
        <LanguageMenu />
      </div>
    </header>
  );
}
