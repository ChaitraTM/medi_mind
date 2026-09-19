import React from "react";
import { useAuth } from "@/components/AuthContext";
import AdminDashboard from "./AdminDashboard";
import ClinicianDashboard from "./ClinicianDashboard";
import PatientDashboard from "./PatientDashboard";

export default function Dashboard() {
  const { user } = useAuth();
  
  if (user?.role === "ADMINISTRATOR") {
    return <AdminDashboard />;
  }
  
  if (user?.role === "CLINICIAN") {
    return <ClinicianDashboard />;
  }
  
  return <PatientDashboard />;
}
