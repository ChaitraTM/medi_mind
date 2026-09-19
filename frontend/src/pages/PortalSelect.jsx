import React from 'react';
import { Link } from 'react-router-dom';
import { User, Stethoscope, ShieldCheck, Brain } from '@phosphor-icons/react';

export default function PortalSelect() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 font-sans">
      <div className="mb-12 text-center flex flex-col items-center">
        <div className="flex items-center gap-2 mb-2">
          <Brain weight="fill" className="text-sky-500 w-16 h-16" />
          <h1 className="text-5xl font-extrabold text-slate-800 tracking-tight">Medi<span className="text-sky-500">Mind</span></h1>
        </div>
        <p className="text-lg font-medium text-slate-500">Select your login portal</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl w-full">
        {/* Patient Portal */}
        <Link to="/login/patient" className="group flex flex-col items-center bg-white p-8 rounded-2xl shadow-sm border border-slate-200 hover:shadow-xl hover:border-sky-200 transition-all">
          <div className="w-16 h-16 bg-sky-50 text-sky-500 rounded-full flex items-center justify-center mb-4 group-hover:bg-sky-500 group-hover:text-white transition-colors">
            <User className="w-8 h-8" weight="duotone" />
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">Patient Portal</h2>
          <p className="text-sm text-slate-500 text-center">Access your health records and AI assistance.</p>
        </Link>

        {/* Clinician Portal */}
        <Link to="/login/clinician" className="group flex flex-col items-center bg-[#0A192F] p-8 rounded-2xl shadow-sm border border-slate-800 hover:shadow-xl hover:border-sky-500 transition-all">
          <div className="w-16 h-16 bg-[#112240] text-sky-400 rounded-full flex items-center justify-center mb-4 group-hover:bg-sky-500 group-hover:text-white transition-colors">
            <Stethoscope className="w-8 h-8" weight="duotone" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Clinician Portal</h2>
          <p className="text-sm text-slate-400 text-center">Review AI insights and manage workflows.</p>
        </Link>

        {/* Admin Portal */}
        <Link to="/login/admin" className="group flex flex-col items-center bg-white p-8 rounded-2xl shadow-sm border border-slate-200 hover:shadow-xl hover:border-indigo-200 transition-all">
          <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mb-4 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
            <ShieldCheck className="w-8 h-8" weight="duotone" />
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">Admin Portal</h2>
          <p className="text-sm text-slate-500 text-center">Manage system settings and user access.</p>
        </Link>
      </div>
    </div>
  );
}
