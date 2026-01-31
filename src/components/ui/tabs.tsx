"use client";
import * as React from "react";

type TabsCtx = {
  value: string;
  setValue: (v: string) => void;
};

const Ctx = React.createContext<TabsCtx | null>(null);

export function Tabs({ defaultValue, className = "", children }: { defaultValue: string; className?: string; children: React.ReactNode }) {
  const [value, setValue] = React.useState(defaultValue);
  return (
    <Ctx.Provider value={{ value, setValue }}>
      <div className={className}>{children}</div>
    </Ctx.Provider>
  );
}

export function TabsList({ className = "", ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`inline-flex rounded-xl border border-neutral-800 bg-neutral-900/40 p-1 ${className}`.trim()}
      {...props}
    />
  );
}

export function TabsTrigger({
  value,
  className = "",
  children,
}: {
  value: string;
  className?: string;
  children: React.ReactNode;
}) {
  const ctx = React.useContext(Ctx)!;
  const active = ctx.value === value;
  const base = "px-3 h-9 text-sm rounded-lg";
  const styles = active
    ? "bg-neutral-900 text-neutral-100"
    : "text-neutral-400 hover:bg-neutral-900/40";
  return (
    <button type="button" className={`${base} ${styles} ${className}`.trim()} onClick={() => ctx.setValue(value)}>
      {children}
    </button>
  );
}

export function TabsContent({ value, className = "", children }: { value: string; className?: string; children: React.ReactNode }) {
  const ctx = React.useContext(Ctx)!;
  if (ctx.value !== value) return null;
  return <div className={className}>{children}</div>;
}
