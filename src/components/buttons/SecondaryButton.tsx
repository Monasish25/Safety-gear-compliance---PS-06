import React from "react";
import { LucideIcon } from "lucide-react";

interface SecondaryButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  icon?: LucideIcon;
  size?: "sm" | "md" | "lg";
  loading?: boolean;
}

export const SecondaryButton: React.FC<SecondaryButtonProps> = ({
  children,
  icon: Icon,
  size = "md",
  loading = false,
  className = "",
  disabled,
  ...props
}) => {
  const sizeClasses = {
    sm: "px-3 py-1.5 text-xs gap-1.5",
    md: "px-4 py-2 text-sm gap-2",
    lg: "px-5 py-2.5 text-base gap-2.5",
  }[size];

  return (
    <button
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center font-medium font-sans rounded-xl bg-slate-900/80 border border-white/10 text-slate-200 hover:bg-slate-800 hover:border-cyan-500/30 hover:text-white transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed ${sizeClasses} ${className}`}
      {...props}
    >
      {loading ? (
        <span className="w-4 h-4 border-2 border-slate-300 border-t-transparent rounded-full animate-spin" />
      ) : Icon ? (
        <Icon className="w-4 h-4 text-slate-400 group-hover:text-cyan-400" />
      ) : null}
      {children}
    </button>
  );
};
