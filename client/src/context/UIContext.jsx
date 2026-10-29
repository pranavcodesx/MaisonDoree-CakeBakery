import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext.jsx';

const Ctx = createContext(null);
export const useUI = () => useContext(Ctx);

export function UIProvider({ children }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loginOpen, setLoginOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [spinOpen, setSpinOpen] = useState(false);
  const [product, setProduct] = useState(null);   // the cake shown in the quick-view popup
  const nextRef = useRef('/account');

  const openLogin = useCallback((next = '/account') => { nextRef.current = next; setLoginOpen(true); }, []);
  // go to a page that needs an account; ask the visitor to log in first if they haven't
  const gate = useCallback(path => (user ? navigate(path) : openLogin(path)), [user, navigate, openLogin]);
  const afterLogin = useCallback(() => { setLoginOpen(false); navigate(nextRef.current); }, [navigate]);

  const anyOpen = loginOpen || cartOpen || searchOpen || menuOpen || spinOpen || !!product;
  useEffect(() => {
    document.body.classList.toggle('no-scroll', anyOpen);
    document.body.style.overflow = anyOpen ? 'hidden' : '';
  }, [anyOpen]);

  return (
    <Ctx.Provider value={{ loginOpen, setLoginOpen, openLogin, afterLogin, gate, cartOpen, setCartOpen, searchOpen, setSearchOpen, menuOpen, setMenuOpen, spinOpen, setSpinOpen, product, openProduct: setProduct, closeProduct: () => setProduct(null) }}>
      {children}
    </Ctx.Provider>
  );
}
