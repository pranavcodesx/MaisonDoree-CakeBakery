import { useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import Header from './Header.jsx';
import Footer from './Footer.jsx';
import ProductModal from './ProductModal.jsx';
import CartDrawer from './CartDrawer.jsx';
import LoginModal from './LoginModal.jsx';
import SearchOverlay from './SearchOverlay.jsx';
import SpinModal from './SpinModal.jsx';
import Icon from './Icon.jsx';
import { useUI } from '../context/UIContext.jsx';

const ROUTES = { home: '/', shop: '/shop', builder: '/builder', about: '/about', contact: '/contact', '404': '/404', track: '/track' };

export default function Layout() {
  const navigate = useNavigate(); const { pathname } = useLocation(); const { gate } = useUI();

  // The original markup navigates with data-nav="…" attributes; keep that working for the ported pages.
  useEffect(() => {
    const h = e => {
      const el = e.target.closest('[data-nav]'); if (!el) return;
      e.preventDefault();
      const n = el.dataset.nav;
      if (n === 'profile') return gate('/account');
      if (n === 'profile-wishlist') return gate('/account/wishlist');
      if (n.startsWith('home-')) {
        const scroll = () => document.getElementById(n)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        if (window.location.pathname === '/') scroll(); else { navigate('/'); setTimeout(scroll, 350); }
        return;
      }
      navigate(ROUTES[n] || '/');
    };
    document.addEventListener('click', h);
    return () => document.removeEventListener('click', h);
  }, [navigate, gate]);

  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);

  // scroll-reveal for the .reveal sections of the original design
  useEffect(() => {
    const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { threshold: 0.08 });
    const scan = () => {
      document.querySelectorAll('.stagger').forEach(s => [...s.children].forEach((c, i) => c.style.setProperty('--i', i)));
      document.querySelectorAll('.reveal:not(.in),.reveal-scale:not(.in)').forEach(el => io.observe(el));
    };
    scan();
    const mo = new MutationObserver(scan); mo.observe(document.getElementById('app'), { childList: true, subtree: true });
    return () => { io.disconnect(); mo.disconnect(); };
  }, []);

  return (
    <>
      <Header />
      <main id="app"><Outlet /></main>
      <Footer />
      <ProductModal /><CartDrawer /><LoginModal /><SearchOverlay /><SpinModal />
      <div className="fab-stack"><button className="fab totop" aria-label="Back to top" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}><Icon name="arrow-up" /></button></div>
    </>
  );
}
