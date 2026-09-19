import os

os.makedirs("src/components", exist_ok=True)
os.makedirs("src/pages", exist_ok=True)

auth_context = """import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../lib/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const role = localStorage.getItem('role');
    const username = localStorage.getItem('username');
    if (token) {
      setUser({ token, role, username });
    }
    setLoading(false);
  }, []);

  const login = async (username, password) => {
    const data = await api.login(username, password);
    // data.access_token contains the token
    // We can decode it but let's just fetch /auth/me for safety or just parse simple base64
    const token = data.access_token;
    localStorage.setItem('token', token);
    const me = await api.me();
    localStorage.setItem('role', me.role);
    localStorage.setItem('username', me.username);
    setUser({ token, role: me.role, username: me.username });
  };

  const register = async (username, password) => {
    await api.register(username, password);
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('username');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
"""

with open("src/components/AuthContext.js", "w") as f:
    f.write(auth_context)

protected_route = """import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from './AuthContext';

export const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();

  if (loading) return <div>Loading...</div>;

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role) && user.role !== 'ADMINISTRATOR') {
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
};
"""

with open("src/components/ProtectedRoute.js", "w") as f:
    f.write(protected_route)

# Now, we should modify App.js
app_js_content = """import React from "react";
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
import Login from "@/pages/Login";
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
            <Route path="/login" element={<Login />} />
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
"""

with open("src/App.js", "w") as f:
    f.write(app_js_content)

# create Login and Register
login_js = """import React, { useState } from 'react';
import { useAuth } from '../components/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await login(username, password);
      navigate('/');
    } catch (err) {
      alert('Login failed: ' + err.message);
    }
  };

  return (
    <div className="p-8">
      <h2 className="text-2xl mb-4">Login</h2>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 max-w-sm">
        <input className="border p-2" type="text" placeholder="Username" value={username} onChange={e=>setUsername(e.target.value)} required />
        <input className="border p-2" type="password" placeholder="Password" value={password} onChange={e=>setPassword(e.target.value)} required />
        <button className="bg-blue-500 text-white p-2 rounded" type="submit">Login</button>
      </form>
    </div>
  );
}
"""

with open("src/pages/Login.js", "w") as f:
    f.write(login_js)

register_js = """import React, { useState } from 'react';
import { useAuth } from '../components/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function Register() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await register(username, password);
      navigate('/login');
    } catch (err) {
      alert('Registration failed: ' + err.message);
    }
  };

  return (
    <div className="p-8">
      <h2 className="text-2xl mb-4">Register</h2>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 max-w-sm">
        <input className="border p-2" type="text" placeholder="Username" value={username} onChange={e=>setUsername(e.target.value)} required />
        <input className="border p-2" type="password" placeholder="Password" value={password} onChange={e=>setPassword(e.target.value)} required />
        <button className="bg-green-500 text-white p-2 rounded" type="submit">Register</button>
      </form>
    </div>
  );
}
"""

with open("src/pages/Register.js", "w") as f:
    f.write(register_js)

# API interceptor
api_js_addition = """
client.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.login = (username, password) => {
  const fd = new FormData();
  fd.append("username", username);
  fd.append("password", password);
  return client.post("/auth/login", fd).then(r => r.data);
};
api.register = (username, password) => client.post("/auth/register", { username, password }).then(r => r.data);
api.me = () => client.get("/auth/me").then(r => r.data);
"""

with open("src/lib/api.js", "a") as f:
    f.write(api_js_addition)
