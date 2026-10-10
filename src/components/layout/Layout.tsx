import React from "react";
import { Outlet } from "react-router-dom";
import { TopNav } from "../navigation/TopNav";

export const Layout: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col bg-[#07090e] text-[#f1f5f9]">
      <TopNav />
      <main className="flex-1 max-w-[1440px] w-full mx-auto px-4 py-6">
        <Outlet />
      </main>
      <footer className="py-4 border-t border-slate-900 text-center text-xs text-slate-400 font-mono">
        <div className="max-w-[1440px] mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>SMART ATTENDANCE &bull; INDUSTRIAL GATE CONTROL</span>
          <span className="text-[11px] text-slate-400">ZERO FACIAL RECOGNITION &bull; BADGE ID & PPE VERIFIED</span>
        </div>
      </footer>
    </div>
  );
};
