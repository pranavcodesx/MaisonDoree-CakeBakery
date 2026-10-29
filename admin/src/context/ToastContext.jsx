import { createContext, useCallback, useContext, useState } from 'react';
import Icon from '../components/Icon.jsx';

const Ctx = createContext(() => {});
export const useToast = () => useContext(Ctx);

export function ToastProvider({ children }) {
  const [list, setList] = useState([]);
  const toast = useCallback((msg, type = 'info') => {
    const id = Math.random().toString(36).slice(2);
    setList(l => [...l, { id, msg, type, out: false }]);
    setTimeout(() => setList(l => l.map(t => (t.id === id ? { ...t, out: true } : t))), 3600);
    setTimeout(() => setList(l => l.filter(t => t.id !== id)), 3950);
  }, []);
  return (
    <Ctx.Provider value={toast}>
      {children}
      <div id="toastStack" aria-live="polite">
        {list.map(t => (
          <div key={t.id} className={`toast ${t.type} ${t.out ? 'out' : ''}`}>
            <span className="t-ic"><Icon name={t.type === 'success' ? 'check-circle' : t.type === 'error' ? 'alert' : 'bell'} /></span><p>{t.msg}</p>
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}
