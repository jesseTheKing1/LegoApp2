import React from "react";
import { Link } from "react-router-dom";

function cx(...c: Array<string | false | null | undefined>) {
  return c.filter(Boolean).join(" ");
}

export function ButtonLink({
  to,
  variant = "primary",
  size = "md",
  className,
  children,
}: {
  to: string;
  variant?: "primary" | "secondary" | "ghost";
  size?: "sm" | "md" | "lg";
  className?: string;
  children: React.ReactNode;
}) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition active:translate-y-[1px] focus:outline-none focus:ring-2 focus:ring-slate-400/40";
  const sizes =
    size === "sm"
      ? "h-9 px-3 text-sm"
      : size === "lg"
      ? "h-12 px-5 text-base rounded-2xl"
      : "h-10 px-4 text-sm";
  const variants =
    variant === "primary"
      ? "bg-slate-900 text-white hover:bg-slate-800"
      : variant === "secondary"
      ? "bg-white text-slate-900 border border-slate-200 hover:bg-slate-50"
      : "bg-transparent text-slate-900 hover:bg-slate-100";

  return (
    <Link to={to} className={cx(base, sizes, variants, className)}>
      {children}
    </Link>
  );
}

export function Button({
  variant = "secondary",
  size = "md",
  className,
  onClick,
  children,
  type = "button",
}: {
  variant?: "primary" | "secondary" | "ghost";
  size?: "sm" | "md" | "lg";
  className?: string;
  onClick?: () => void;
  children: React.ReactNode;
  type?: "button" | "submit";
}) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition active:translate-y-[1px] focus:outline-none focus:ring-2 focus:ring-slate-400/40";
  const sizes =
    size === "sm"
      ? "h-9 px-3 text-sm"
      : size === "lg"
      ? "h-12 px-5 text-base rounded-2xl"
      : "h-10 px-4 text-sm";
  const variants =
    variant === "primary"
      ? "bg-slate-900 text-white hover:bg-slate-800"
      : variant === "secondary"
      ? "bg-white text-slate-900 border border-slate-200 hover:bg-slate-50"
      : "bg-transparent text-slate-900 hover:bg-slate-100";

  return (
    <button type={type} onClick={onClick} className={cx(base, sizes, variants, className)}>
      {children}
    </button>
  );
}
