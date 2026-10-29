import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api } from '../lib/api.js';

const Ctx = createContext(null);
export const useAuth = () => useContext(Ctx);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    api('/api/auth/me').then(d => setUser(d.user)).catch(() => setUser(null)).finally(() => setReady(true));
  }, []);

  const login = useCallback(async (identifier, password) => {
    const d = await api('/api/auth/login', { method: 'POST', body: { identifier, password } });
    setUser(d.user); return d.user;
  }, []);
  const signup = useCallback(async (name, identifier, password) => {
    const d = await api('/api/auth/signup', { method: 'POST', body: { name, identifier, password } });
    setUser(d.user); return d.user;
  }, []);
  const googleLogin = useCallback(async credential => {
    const d = await api('/api/auth/google', { method: 'POST', body: { credential } });
    setUser(d.user); return d.user;
  }, []);
  const logout = useCallback(async () => { await api('/api/auth/logout', { method: 'POST' }).catch(() => {}); setUser(null); }, []);
  const patchUser = useCallback(p => setUser(u => (u ? { ...u, ...p } : u)), []);

  return <Ctx.Provider value={{ user, ready, login, signup, googleLogin, logout, patchUser, setUser }}>{children}</Ctx.Provider>;
}
