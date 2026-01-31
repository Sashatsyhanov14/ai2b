"use client";
import * as React from "react";

type Variant = "default" | "outline" | "ghost" | "link" | "secondary";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  loading?: boolean;
};

export function Button({
  variant = "default",
  loading = false,
  className = "",
  disabled,
  ...props
}: ButtonProps) {
  const base = "btn rounded-xl";
  const map: Record<Variant, string> = {
    default: "btn-primary",
    outline: "btn-outline",
    ghost: "btn-ghost",
    link: "btn-link",
    secondary: "btn-outline",
  };
  const extra = loading ? "opacity-60 cursor-not-allowed" : "";
  return (
    <button
      disabled={loading || disabled}
      className={`${base} ${map[variant]} ${extra} ${className}`.trim()}
      {...props}
    />
  );
}

