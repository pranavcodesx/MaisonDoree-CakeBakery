import { createContext, useCallback, useContext, useState } from 'react';
import Icon from '../components/Icon.jsx';

const Ctx = createContext(() => {});
export const useToast = () => useContext(Ctx);

export function ToastProvider({ children }) {
  const [list, setList] = useState([]);
  const toast = useCallback((msg, type = 'info', icon) => {
    const id = Math.random().toString(36).slice(2);
    const ic = (icon || (type === 'success' ? 'check-circle' : type === 'error' ? 'x' : 'sparkle')).replace(/^ic-/, '');
    setList(l => [...l, { id, msg, type, icon: ic, out: false }]);
    setTimeout(() => setList(l => l.map(t => (t.id === id ? { ...t, out: true } : t))), 3200);
    setTimeout(() => setList(l => l.filter(t => t.id !== id)), 3600);
  }, []);
  return (
    <Ctx.Provider value={toast}>
      {children}
      <div id="toastStack" aria-live="polite">
        {list.map(t => (
          <div key={t.id} className={`toast ${t.type} ${t.out ? 'out' : ''}`}>
            <span className="t-ic"><Icon name={t.icon} /></span><p>{t.msg}</p>
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}
