import React, { createContext, useContext, useState, useEffect } from 'react';
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

  const login = async (username, password, expectedRole = null) => {
    const data = await api.login(username, password);
    // data.access_token contains the token
    const token = data.access_token;
    localStorage.setItem('token', token);
    const me = await api.me();

    if (expectedRole && me.role !== expectedRole) {
      localStorage.removeItem('token');
      throw new Error(`Unauthorized: This portal requires ${expectedRole} privileges.`);
    }

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
