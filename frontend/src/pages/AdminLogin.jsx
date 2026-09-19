import React, { useState } from 'react';
import { useAuth } from '../components/AuthContext';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, User, LockKey, Eye, Brain, Gear } from '@phosphor-icons/react';
import { toast } from 'sonner';

export default function AdminLogin() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(username, password, 'ADMINISTRATOR');
      navigate('/');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSSO = () => {
    toast.info("Enterprise SSO is not configured in this environment.");
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] relative overflow-hidden flex flex-col items-center py-12 px-4 sm:px-6 lg:px-8 font-sans">
      {/* Background Decor */}
      <div className="absolute bottom-0 right-0 w-full h-64 bg-gradient-to-tr from-indigo-100 to-transparent -z-10" style={{ clipPath: "polygon(0 100%, 100% 60%, 100% 100%)" }} />
      <div className="absolute top-0 left-0 w-full h-64 bg-gradient-to-b from-indigo-50/50 to-transparent -z-10" />

      {/* Logo */}
      <div className="mb-10 text-center flex flex-col items-center">
        <div className="flex items-center gap-2 mb-2">
          <Brain weight="fill" className="text-sky-500 w-12 h-12" />
          <h1 className="text-4xl font-extrabold text-slate-800 tracking-tight">Medi<span className="text-sky-500">Mind</span></h1>
        </div>
        <p className="text-sm font-medium text-slate-500">Smarter Care. Better Decisions.</p>
      </div>

      {/* Card */}
      <div className="bg-white p-8 md:p-10 rounded-2xl shadow-xl shadow-indigo-900/5 w-full max-w-md z-10 border border-slate-100">
        <div className="text-center mb-8 flex flex-col items-center">
          <ShieldCheck className="text-indigo-600 w-10 h-10 mb-3" weight="duotone" />
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Administrator Login</h2>
          <p className="text-sm text-slate-500 leading-relaxed px-4">
            Manage system settings, users and platform configuration.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <User className="text-slate-400 w-5 h-5" />
            </div>
            <input
              type="text"
              placeholder="Username or Email"
              className="block w-full pl-10 pr-3 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm transition-shadow outline-none"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>

          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <LockKey className="text-slate-400 w-5 h-5" />
            </div>
            <input
              type="password"
              placeholder="Password"
              className="block w-full pl-10 pr-10 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm transition-shadow outline-none"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center cursor-pointer">
              <Eye className="text-slate-400 w-5 h-5 hover:text-slate-600" />
            </div>
          </div>

          <div className="flex items-center justify-between text-sm">
            <label className="flex items-center text-slate-600 cursor-pointer">
              <input type="checkbox" className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4 mr-2" />
              Remember me
            </label>
            <a href="#" className="font-semibold text-indigo-600 hover:text-indigo-700">Forgot password?</a>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors disabled:opacity-70"
          >
            {loading ? 'Authenticating...' : 'Login'}
          </button>
        </form>

        <div className="mt-6">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-white px-2 text-slate-400">or</span>
            </div>
          </div>

          <div className="mt-6">
            <button
              onClick={handleSSO}
              type="button"
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 border border-slate-200 rounded-lg shadow-sm text-sm font-semibold text-indigo-700 bg-white hover:bg-slate-50 transition-colors"
            >
              <ShieldCheck className="w-5 h-5 text-indigo-600" weight="fill" />
              Continue with SSO
            </button>
          </div>
        </div>

        <p className="mt-8 text-center text-xs text-slate-500">
          Need help? Contact <a href="#" className="font-semibold text-indigo-600 hover:text-indigo-700">Support</a>
        </p>
      </div>

      {/* Bottom info */}
      <div className="absolute bottom-8 left-8 flex items-start gap-3 text-sm hidden md:flex">
        <Gear className="text-indigo-400 w-8 h-8" weight="duotone" />
        <div>
          <p className="font-medium text-indigo-700">Secure Access.</p>
          <p className="text-slate-500">Better Management.</p>
        </div>
      </div>
    </div>
  );
}
