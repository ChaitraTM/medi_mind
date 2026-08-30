import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
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
import "@/App.css";

function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/assistant" element={<Assistant />} />
          <Route path="/imaging" element={<Imaging />} />
          <Route path="/documents" element={<Documents />} />
          <Route path="/review" element={<Review />} />
          <Route path="/workflow" element={<Workflow />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </Layout>
      <Toaster position="top-right" richColors />
    </BrowserRouter>
  );
}

export default App;
