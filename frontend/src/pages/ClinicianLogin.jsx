import React, { useState } from 'react';
import { useAuth } from '../components/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Stethoscope, EnvelopeSimple, LockKey, Eye, Brain, Heartbeat } from '@phosphor-icons/react';
import { toast } from 'sonner';

export default function ClinicianLogin() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(username, password, 'CLINICIAN');
      navigate('/');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSSO = () => {
    toast.info("Microsoft SSO is not configured in this environment.");
  };

  return (
    <div className="min-h-screen bg-[#0A192F] relative overflow-hidden flex flex-col items-center py-12 px-4 sm:px-6 lg:px-8 font-sans text-slate-300">
      
      {/* Logo */}
      <div className="mb-8 text-center flex flex-col items-center z-10">
        <div className="flex items-center gap-2 mb-2">
          <Brain weight="fill" className="text-sky-400 w-12 h-12" />
          <h1 className="text-4xl font-extrabold text-white tracking-tight">Medi<span className="text-sky-400">Mind</span></h1>
        </div>
        <p className="text-sm font-medium text-slate-400">Smarter Care. Better Decisions.</p>
      </div>

      {/* Card */}
      <div className="bg-[#112240] p-8 md:p-10 rounded-2xl shadow-2xl w-full max-w-md z-10 border border-slate-700/50">
        <div className="text-center mb-8 flex flex-col items-center">
          <Stethoscope className="text-sky-400 w-10 h-10 mb-3" weight="duotone" />
          <h2 className="text-2xl font-bold text-white mb-2">Clinician Login</h2>
          <p className="text-sm text-slate-400 leading-relaxed px-4">
            Access patient data, review AI insights and manage clinical workflows.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <EnvelopeSimple className="text-slate-400 w-5 h-5" />
            </div>
            <input
              type="text"
              placeholder="Work Email"
              className="block w-full pl-10 pr-3 py-2.5 bg-[#0A192F] border border-slate-700 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 text-sm text-white placeholder-slate-500 transition-shadow outline-none"
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
              className="block w-full pl-10 pr-10 py-2.5 bg-[#0A192F] border border-slate-700 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 text-sm text-white placeholder-slate-500 transition-shadow outline-none"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center cursor-pointer">
              <Eye className="text-slate-400 w-5 h-5 hover:text-slate-300" />
            </div>
          </div>

          <div className="flex items-center justify-between text-sm">
            <label className="flex items-center text-slate-400 cursor-pointer">
              <input type="checkbox" className="rounded border-slate-600 bg-[#0A192F] text-sky-500 focus:ring-sky-500 focus:ring-offset-[#112240] w-4 h-4 mr-2" />
              Remember me
            </label>
            <a href="#" className="font-semibold text-sky-400 hover:text-sky-300">Forgot password?</a>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-semibold text-white bg-sky-500 hover:bg-sky-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#112240] focus:ring-sky-500 transition-colors disabled:opacity-70"
          >
            {loading ? 'Authenticating...' : 'Login'}
          </button>
        </form>

        <div className="mt-6">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-700" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-[#112240] px-2 text-slate-500">or</span>
            </div>
          </div>

          <div className="mt-6">
            <button
              onClick={handleSSO}
              type="button"
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 border border-slate-700 rounded-lg shadow-sm text-sm font-semibold text-slate-300 bg-transparent hover:bg-slate-800 transition-colors"
            >
              <img src="https://www.svgrepo.com/show/475667/microsoft-color.svg" className="w-5 h-5" alt="Microsoft" />
              Continue with Microsoft
            </button>
          </div>
        </div>

        <p className="mt-8 text-center text-xs text-slate-500">
          Need help? Contact <a href="#" className="font-semibold text-sky-400 hover:text-sky-300">IT Support</a>
        </p>
      </div>

      {/* Bottom Pulse Decor */}
      <div className="absolute bottom-10 flex flex-col items-center text-slate-600 z-0">
        <Heartbeat className="w-12 h-12 mb-2 text-slate-700" />
        <p className="text-xs tracking-wider uppercase">Better insights. Better care.</p>
      </div>
      
      <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-sky-900 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob" />
      <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-indigo-900 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000" />
    </div>
  );
}
