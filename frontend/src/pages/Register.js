import React, { useState } from 'react';
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
