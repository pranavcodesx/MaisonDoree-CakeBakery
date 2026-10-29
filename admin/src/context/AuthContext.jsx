import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api, setUnauthorizedHandler } from '../lib/api.js';

const Ctx = createContext(null);
export const useAuth = () => useContext(Ctx);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    setUnauthorizedHandler(() => setUser(null));   // an expired session sends the owner back to the login screen
    api('/auth/me').then(d => setUser(d.user)).catch(() => setUser(null)).finally(() => setReady(true));
  }, []);
  const login = useCallback(async (email, password) => { const d = await api('/auth/login', { method: 'POST', body: { email, password } }); setUser(d.user); return d.user; }, []);
  const logout = useCallback(async () => { await api('/auth/logout', { method: 'POST' }).catch(() => {}); setUser(null); }, []);
  return <Ctx.Provider value={{ user, setUser, ready, login, logout }}>{children}</Ctx.Provider>;
}
