import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { Layout } from "@/components/Layout";
import Dashboard from "@/pages/Dashboard";
import Assistant from "@/pages/Assistant";
import Imaging from "@/pages/Imaging";
import Documents from "@/pages/Documents";
import Review from "@/pages/Review";
import Workflow from "@/pages/Workflow";
import Analytics from "@/pages/Analytics";
import Settings from "@/pages/Settings";
import PatientLogin from "@/pages/PatientLogin";
import ClinicianLogin from "@/pages/ClinicianLogin";
import AdminLogin from "@/pages/AdminLogin";
import PortalSelect from "@/pages/PortalSelect";
import Register from "@/pages/Register";
import { AuthProvider } from "@/components/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import "@/App.css";

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Layout>
          <Routes>
            <Route path="/login" element={<PortalSelect />} />
            <Route path="/login/patient" element={<PatientLogin />} />
            <Route path="/login/clinician" element={<ClinicianLogin />} />
            <Route path="/login/admin" element={<AdminLogin />} />
            <Route path="/register" element={<Register />} />
            <Route path="/unauthorized" element={<div>Unauthorized Access</div>} />
            
            <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/assistant" element={<ProtectedRoute><Assistant /></ProtectedRoute>} />
            <Route path="/imaging" element={<ProtectedRoute><Imaging /></ProtectedRoute>} />
            <Route path="/documents" element={<ProtectedRoute><Documents /></ProtectedRoute>} />
            
            <Route path="/review" element={<ProtectedRoute allowedRoles={['CLINICIAN', 'ADMINISTRATOR']}><Review /></ProtectedRoute>} />
            
            <Route path="/workflow" element={<ProtectedRoute><Workflow /></ProtectedRoute>} />
            <Route path="/analytics" element={<ProtectedRoute allowedRoles={['ADMINISTRATOR']}><Analytics /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
          </Routes>
        </Layout>
        <Toaster position="top-right" richColors />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
