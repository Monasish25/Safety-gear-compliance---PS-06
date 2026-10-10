import React, { useState, useEffect } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { 
  ShieldCheck, 
  Bell, 
  LogOut, 
  Menu, 
  X,
  Radio,
  Cpu
} from "lucide-react";

export const TopNav: React.FC = () => {
  const [currentTime, setCurrentTime] = useState("");
  const [currentDate, setCurrentDate] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  const { user, logout, hasRole } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentDate(
        now.toLocaleDateString("en-US", {
          weekday: "short",
          day: "2-digit",
          month: "short",
          year: "numeric",
        })
      );
      setCurrentTime(
        now.toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false,
        })
      );
    };

    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  const navLinks = [
    { name: "Dashboard", path: "/" },
    { name: "Attendance", path: "/attendance" },
    { name: "Workers", path: "/workers" },
    { name: "Scan", path: "/scan" },
    { name: "Reports", path: "/reports" },
    { name: "Settings", path: "/settings" },
  ];

  if (hasRole(["HEAD"])) {
    navLinks.push({ name: "Model", path: "/model" });
  }

  const handleLogout = async () => {
    setProfileOpen(false);
    await logout();
    navigate("/login");
  };

  const getInitials = (name?: string) => {
    if (!name) return "HD";
    const parts = name.trim().split(" ");
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.substring(0, 2).toUpperCase();
  };

  return (
    <header className="sticky top-3 z-40 px-4 max-w-[1440px] mx-auto w-full">
      <nav className="glass-nav rounded-2xl px-4 lg:px-6 py-2.5 flex items-center justify-between border border-cyan-500/20 shadow-2xl">
        {/* LEFT: Logo & Product Title */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500/20 to-sky-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-glow-cyan-sm">
            <ShieldCheck className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-heading font-bold text-sm lg:text-base tracking-wide text-white whitespace-nowrap">
                SMART ATTENDANCE
              </span>
              <span className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-medium bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                <Radio className="w-2 h-2 animate-pulse text-emerald-400" />
                ONLINE
              </span>
            </div>
            <p className="text-[9px] font-mono text-slate-400 tracking-wider">
              FACTORY GATE ACCESS CONTROL
            </p>
          </div>
        </div>

        {/* CENTER: Navigation Links (Comfortably spaced, no crowding) */}
        <div className="hidden md:flex items-center gap-1 lg:gap-1.5 xl:gap-2 px-2">
          {navLinks.map((link) => (
            <NavLink
              key={link.path}
              to={link.path}
              end={link.path === "/"}
              className={({ isActive }) =>
                `px-2.5 lg:px-3 py-1.5 rounded-lg text-xs lg:text-sm font-medium transition-all duration-150 whitespace-nowrap ${
                  isActive
                    ? "bg-cyan-500/15 text-cyan-300 font-semibold border border-cyan-500/30 shadow-glow-cyan-sm"
                    : "text-slate-400 hover:text-white hover:bg-slate-800/50"
                }`
              }
            >
              {link.name}
            </NavLink>
          ))}
        </div>

        {/* RIGHT: Clock, Notifications, Profile */}
        <div className="flex items-center gap-3 shrink-0">
          {/* Live Date/Time in dedicated glass badge */}
          <div className="hidden xl:flex flex-col items-end px-3 py-1 rounded-xl bg-slate-900/60 border border-slate-800">
            <span className="font-mono text-xs font-semibold tracking-wider text-slate-200">
              {currentTime}
            </span>
            <span className="font-mono text-[9px] text-slate-400">
              {currentDate}
            </span>
          </div>

          {/* Notifications Button */}
          <div className="relative">
            <button
              onClick={() => setNotificationsOpen(!notificationsOpen)}
              className="relative p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/60 border border-transparent hover:border-slate-700 transition-colors"
              title="Notifications"
            >
              <Bell className="w-4 h-4" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-cyan-400 shadow-glow-cyan-sm" />
            </button>

            {notificationsOpen && (
              <div className="absolute right-0 top-full mt-2 w-72 glass-panel p-3 shadow-2xl border border-cyan-500/20 z-50">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800 mb-2">
                  <span className="text-xs font-mono uppercase text-slate-300 font-semibold">Gate Alerts</span>
                  <span className="text-[10px] font-mono text-cyan-400">Live Telemetry</span>
                </div>
                <div className="space-y-2 text-xs">
                  <div className="p-2 rounded bg-cyan-950/20 border border-cyan-500/30 text-cyan-300">
                    <p className="font-medium text-[11px]">Turnstile Vision Guard Active</p>
                    <p className="text-[10px] text-slate-400 font-mono">Live WebSocket & RTSP stream ready</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* User Profile Avatar / Menu */}
          <div className="relative">
            <button
              onClick={() => setProfileOpen(!profileOpen)}
              className="flex items-center gap-2 p-1.5 rounded-xl border border-slate-800 hover:border-cyan-500/40 bg-slate-900/60 transition-colors cursor-pointer"
            >
              <div className="w-7 h-7 rounded-lg bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 flex items-center justify-center font-mono font-bold text-xs">
                {getInitials(user?.name)}
              </div>
              <div className="hidden sm:flex flex-col items-start text-left">
                <span className="text-xs font-medium text-slate-200 font-sans leading-tight">
                  {user?.name || "Officer"}
                </span>
                <span className="text-[9px] font-mono font-semibold text-cyan-400 uppercase tracking-wider">
                  {user?.role || "HEAD"}
                </span>
              </div>
            </button>

            {profileOpen && (
              <div className="absolute right-0 top-full mt-2 w-52 glass-panel p-2 shadow-2xl border border-cyan-500/20 z-50">
                <div className="px-3 py-2 border-b border-slate-800">
                  <p className="text-xs font-semibold text-white">{user?.name || "Authorized User"}</p>
                  <p className="text-[10px] font-mono text-cyan-400 mt-0.5">{user?.role} Clearance</p>
                  <p className="text-[10px] font-mono text-slate-400 truncate">{user?.email}</p>
                </div>
                {hasRole(["HEAD"]) && (
                  <NavLink
                    to="/model"
                    onClick={() => setProfileOpen(false)}
                    className="w-full mt-1 flex items-center gap-2 px-3 py-1.5 text-xs text-slate-300 hover:bg-cyan-950/30 hover:text-cyan-400 rounded transition-colors"
                  >
                    <Cpu className="w-3.5 h-3.5" />
                    <span>Vision Model Console</span>
                  </NavLink>
                )}
                <button
                  onClick={handleLogout}
                  className="w-full mt-1 flex items-center gap-2 px-3 py-1.5 text-xs text-rose-400 hover:bg-rose-950/30 rounded transition-colors cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Logout</span>
                </button>
              </div>
            )}
          </div>

          {/* Mobile menu toggle */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </nav>

      {/* Mobile navigation collapse */}
      {mobileMenuOpen && (
        <div className="md:hidden mt-2 glass-panel p-4 flex flex-col gap-3 border border-cyan-500/20">
          {navLinks.map((link) => (
            <NavLink
              key={link.path}
              to={link.path}
              end={link.path === "/"}
              onClick={() => setMobileMenuOpen(false)}
              className={({ isActive }) =>
                `px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                    : "text-slate-400 hover:text-white hover:bg-slate-800/50"
                }`
              }
            >
              {link.name}
            </NavLink>
          ))}
        </div>
      )}
    </header>
  );
};
