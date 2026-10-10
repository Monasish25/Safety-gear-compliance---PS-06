import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { changeInitialPassword } from "../lib/api";
import { Role } from "../types";
import { 
  Shield, 
  Lock, 
  Mail, 
  AlertCircle, 
  KeyRound, 
  ArrowRight, 
  UserPlus, 
  LogIn, 
  CheckCircle2, 
  User, 
  ShieldCheck 
} from "lucide-react";

export const Login: React.FC = () => {
  const [tab, setTab] = useState<"signin" | "signup">("signin");
  
  // Login form state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Signup form state
  const [signupName, setSignupName] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupRole, setSignupRole] = useState<Role>("HEAD");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupConfirmPassword, setSignupConfirmPassword] = useState("");

  // First-time password change state (for backend seeded accounts)
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [mustChangePassword, setMustChangePassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const { login, signUp } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = (location.state as any)?.from?.pathname || "/";

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Please enter both email and security passkey.");
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setSuccessMessage(null);
      const user = await login(email, password);
      if (user.forcePasswordChange) {
        setMustChangePassword(true);
      } else {
        navigate(from, { replace: true });
      }
    } catch (err: any) {
      setError(err?.message || "Invalid credentials or unauthorized access.");
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signupEmail || !signupPassword) {
      setError("Please enter an email and password.");
      return;
    }
    if (signupPassword.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (signupPassword !== signupConfirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setSuccessMessage(null);

      const res = await signUp(
        signupEmail.trim(),
        signupPassword,
        signupName.trim() || "Safety Officer",
        signupRole
      );

      // If active session created immediately, navigate
      if (res.session) {
        navigate(from, { replace: true });
        return;
      }

      // If email confirmation is enabled on Supabase, attempt instant login or notify
      try {
        await login(signupEmail.trim(), signupPassword);
        navigate(from, { replace: true });
        return;
      } catch {
        // Switch to signin tab with email prefilled
        setEmail(signupEmail.trim());
        setPassword(signupPassword);
        setTab("signin");
        setSuccessMessage("Account created successfully in Supabase! You can now sign in.");
      }
    } catch (err: any) {
      setError(err?.message || "Failed to create Supabase account.");
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 8) {
      setError("New password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await changeInitialPassword(newPassword);
      navigate(from, { replace: true });
    } catch (err: any) {
      setError(err?.message || "Failed to update security credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#07090e] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Ambient background glows */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        {/* Brand header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#0d111a]/80 backdrop-blur-xl border border-cyan-500/30 mb-4 shadow-[0_0_25px_rgba(0,240,255,0.15)]">
            <Shield className="w-8 h-8 text-cyan-400" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-wider font-display uppercase">
            SMART <span className="text-cyan-400">ATTENDANCE</span>
          </h1>
          <p className="text-xs font-mono text-gray-400 mt-1 uppercase tracking-widest">
            Plant Head & Gate Access Clearance
          </p>

          <div className="mt-3 flex items-center justify-center gap-1.5 py-1 px-3 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] font-mono mx-auto w-fit">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Supabase Authentication Connected
          </div>
        </div>

        {/* Glass Card */}
        <div className="bg-[#0d111a]/85 backdrop-blur-2xl border border-cyan-500/20 rounded-2xl p-7 shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
          
          {/* Tab Selector: Sign In vs Sign Up */}
          {!mustChangePassword && (
            <div className="flex rounded-xl bg-[#07090e]/90 p-1 border border-gray-800 mb-6">
              <button
                type="button"
                onClick={() => {
                  setTab("signin");
                  setError(null);
                  setSuccessMessage(null);
                }}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-medium rounded-lg transition-all ${
                  tab === "signin"
                    ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                <LogIn className="w-3.5 h-3.5" />
                Sign In
              </button>
              <button
                type="button"
                onClick={() => {
                  setTab("signup");
                  setError(null);
                  setSuccessMessage(null);
                }}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-medium rounded-lg transition-all ${
                  tab === "signup"
                    ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                <UserPlus className="w-3.5 h-3.5" />
                Sign Up
              </button>
            </div>
          )}

          {error && (
            <div className="mb-5 p-3 rounded-xl bg-red-500/10 border border-red-500/30 flex items-start gap-2.5 text-red-400 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {successMessage && (
            <div className="mb-5 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-start gap-2.5 text-emerald-400 text-xs">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{successMessage}</span>
            </div>
          )}

          {!mustChangePassword ? (
            tab === "signin" ? (
              /* SIGN IN FORM */
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-xs font-mono text-gray-300 uppercase tracking-wider mb-2">
                    Officer / Head Email
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-gray-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="chiranjib47@gmail.com"
                      required
                      className="w-full pl-10 pr-4 py-2.5 bg-[#07090e]/90 border border-gray-800 rounded-xl text-white text-sm placeholder-gray-600 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/50 transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-mono text-gray-300 uppercase tracking-wider mb-2">
                    Security Passkey
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-gray-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••••••"
                      required
                      className="w-full pl-10 pr-4 py-2.5 bg-[#07090e]/90 border border-gray-800 rounded-xl text-white text-sm placeholder-gray-600 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/50 transition-all"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 px-4 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-semibold text-sm rounded-xl transition-all shadow-[0_0_20px_rgba(0,240,255,0.25)] hover:shadow-[0_0_30px_rgba(0,240,255,0.4)] flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer uppercase tracking-wider mt-2 font-display"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                      Authenticating...
                    </span>
                  ) : (
                    <>
                      Sign In to Console
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>

                {/* Quick test credentials */}
                <div className="pt-2 text-center space-y-2">
                  <div className="p-3 rounded-xl bg-gray-900/60 border border-gray-800 text-left text-[11px] font-mono text-gray-400 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400 font-semibold uppercase tracking-wider text-[10px]">Your Supabase Account:</span>
                      <button
                        type="button"
                        onClick={() => {
                          setEmail("chiranjib47@gmail.com");
                          setPassword("Admin@12345");
                        }}
                        className="text-cyan-400 hover:text-cyan-300 text-[10px] underline cursor-pointer"
                      >
                        Auto-Fill
                      </button>
                    </div>
                    <div className="text-gray-300">Email: <span className="text-cyan-400">chiranjib47@gmail.com</span></div>
                    <div className="text-gray-300">Passkey: <span className="text-cyan-400">Admin@12345</span></div>
                  </div>
                </div>
              </form>
            ) : (
              /* SIGN UP FORM */
              <form onSubmit={handleSignUp} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-mono text-gray-300 uppercase tracking-wider mb-1.5">
                    Officer Full Name
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-gray-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={signupName}
                      onChange={(e) => setSignupName(e.target.value)}
                      placeholder="e.g. Chief Safety Officer"
                      required
                      className="w-full pl-10 pr-4 py-2.5 bg-[#07090e]/90 border border-gray-800 rounded-xl text-white text-sm placeholder-gray-600 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/50 transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-mono text-gray-300 uppercase tracking-wider mb-1.5">
                    Work Email Address
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-gray-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      value={signupEmail}
                      onChange={(e) => setSignupEmail(e.target.value)}
                      placeholder="officer@company.com"
                      required
                      className="w-full pl-10 pr-4 py-2.5 bg-[#07090e]/90 border border-gray-800 rounded-xl text-white text-sm placeholder-gray-600 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/50 transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-mono text-gray-300 uppercase tracking-wider mb-1.5">
                    Clearance Role
                  </label>
                  <div className="relative">
                    <ShieldCheck className="w-4 h-4 text-gray-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <select
                      value={signupRole}
                      onChange={(e) => setSignupRole(e.target.value as Role)}
                      className="w-full pl-10 pr-4 py-2.5 bg-[#07090e]/90 border border-gray-800 rounded-xl text-white text-sm focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/50 transition-all cursor-pointer"
                    >
                      <option value="HEAD">HEAD (Full Plant Safety & Turnstile Admin)</option>
                      <option value="SUPERVISOR">SUPERVISOR (Gate & PPE Verification)</option>
                      <option value="VIEWER">VIEWER (Read-Only Safety Audit)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-mono text-gray-300 uppercase tracking-wider mb-1.5">
                    Create Password (min 6 characters)
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-gray-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="password"
                      value={signupPassword}
                      onChange={(e) => setSignupPassword(e.target.value)}
                      placeholder="••••••••••••"
                      required
                      className="w-full pl-10 pr-4 py-2.5 bg-[#07090e]/90 border border-gray-800 rounded-xl text-white text-sm placeholder-gray-600 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/50 transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-mono text-gray-300 uppercase tracking-wider mb-1.5">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <KeyRound className="w-4 h-4 text-gray-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="password"
                      value={signupConfirmPassword}
                      onChange={(e) => setSignupConfirmPassword(e.target.value)}
                      placeholder="••••••••••••"
                      required
                      className="w-full pl-10 pr-4 py-2.5 bg-[#07090e]/90 border border-gray-800 rounded-xl text-white text-sm placeholder-gray-600 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/50 transition-all"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 px-4 bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-black font-semibold text-sm rounded-xl transition-all shadow-[0_0_20px_rgba(16,185,129,0.25)] hover:shadow-[0_0_30px_rgba(16,185,129,0.4)] flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer uppercase tracking-wider mt-3 font-display"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                      Registering in Supabase...
                    </span>
                  ) : (
                    <>
                      Register New Officer Account
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            )
          ) : (
            /* FIRST TIME PASSWORD CHANGE FORM */
            <form onSubmit={handlePasswordChange} className="space-y-5">
              <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl mb-4">
                <p className="text-xs text-amber-300 font-sans">
                  <strong>First-Time Login:</strong> Please change your default password before accessing system controls.
                </p>
              </div>

              <div>
                <label className="block text-xs font-mono text-gray-300 uppercase tracking-wider mb-2">
                  New Passkey (min 8 characters)
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-gray-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="New secure password"
                    required
                    className="w-full pl-10 pr-4 py-3 bg-[#07090e]/90 border border-gray-800 rounded-xl text-white text-sm placeholder-gray-600 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/50 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono text-gray-300 uppercase tracking-wider mb-2">
                  Confirm New Passkey
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-gray-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter new secure password"
                    required
                    className="w-full pl-10 pr-4 py-3 bg-[#07090e]/90 border border-gray-800 rounded-xl text-white text-sm placeholder-gray-600 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/50 transition-all"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 px-4 bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-black font-semibold text-sm rounded-xl transition-all shadow-[0_0_20px_rgba(16,185,129,0.25)] hover:shadow-[0_0_30px_rgba(16,185,129,0.4)] flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer uppercase tracking-wider font-display"
              >
                {loading ? "Updating Credentials..." : "Activate & Launch Dashboard"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
