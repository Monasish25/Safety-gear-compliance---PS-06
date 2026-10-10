import React from "react";
import { LucideIcon } from "lucide-react";

interface PrimaryButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  icon?: LucideIcon;
  size?: "sm" | "md" | "lg";
  loading?: boolean;
}

export const PrimaryButton: React.FC<PrimaryButtonProps> = ({
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
      className={`inline-flex items-center justify-center font-medium font-sans rounded-xl bg-gradient-to-r from-cyan-500 to-sky-500 text-slate-950 shadow-glow-cyan-sm hover:shadow-glow-cyan hover:brightness-110 active:scale-[0.98] transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 ${sizeClasses} ${className}`}
      {...props}
    >
      {loading ? (
        <span className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
      ) : Icon ? (
        <Icon className="w-4 h-4" />
      ) : null}
      {children}
    </button>
  );
};
