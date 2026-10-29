import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import Icon from './Icon.jsx';
import { useCart } from '../context/CartContext.jsx';
import { useUI } from '../context/UIContext.jsx';
import { useWishlist } from '../hooks/useWishlist.js';

const LINKS = [['home', 'Home', 'pin'], ['shop', 'Cakes', 'cart'], ['builder', 'Custom Cake', 'gift'], ['home-occasions', 'Occasions', 'sparkle'], ['home-offers', 'Offers', 'tag'], ['about', 'About', 'chef'], ['contact', 'Contact', 'message']];
const BOTTOM = [['home', 'Home', 'pin'], ['shop', 'Cakes', 'search'], ['builder', 'Custom Cake', 'gift'], ['about', 'About', 'chef'], ['contact', 'Contact', 'message']];
const PATH_PAGE = { '/': 'home', '/shop': 'shop', '/builder': 'builder', '/about': 'about', '/contact': 'contact' };

export default function Header() {
  const { pathname } = useLocation(); const cart = useCart(); const ui = useUI(); const wish = useWishlist();
  const [scrolled, setScrolled] = useState(false);
  const [logoOk, setLogoOk] = useState(true);
  const page = PATH_PAGE[pathname];
  useEffect(() => { const h = () => setScrolled(window.scrollY > 40); h(); window.addEventListener('scroll', h, { passive: true }); return () => window.removeEventListener('scroll', h); }, []);
  const close = () => ui.setMenuOpen(false);
  return (
    <>
      <header id="navbar" className={scrolled ? 'scrolled' : ''}>
        <div className="nav-inner">
          <button className="nav-icon-btn" id="mobileMenuBtn" aria-label="Open menu" onClick={() => ui.setMenuOpen(true)}><Icon name="menu" /></button>
          <a href="/" className="nav-logo" data-nav="home">
            {logoOk ? <img src="/images/logo.png" alt="Maison Dorée — Atelier de Gâteaux" className="logo-image" onError={() => setLogoOk(false)} /> : <span className="footer-logo" style={{ color: 'var(--ink)' }}>Maison <span style={{ color: 'var(--gold-500)' }}>Dorée</span></span>}
          </a>
          <nav className="nav-links">
            {LINKS.map(([k, l]) => <a key={k} href="/" data-nav={k} className={page === k ? 'active' : ''}>{l}</a>)}
          </nav>
          <div className="nav-actions">
            <button className="nav-icon-btn" aria-label="Search" onClick={() => ui.setSearchOpen(true)}><Icon name="search" /></button>
            <button className="nav-icon-btn" aria-label="Wishlist" data-nav="profile-wishlist"><Icon name="heart" />{wish.count > 0 && <span className="nav-count">{wish.count}</span>}</button>
            <button className="nav-icon-btn" aria-label="Cart" onClick={() => ui.setCartOpen(o => !o)}><Icon name="cart" />{cart.count > 0 && <span className="nav-count">{cart.count}</span>}</button>
            <button className="nav-icon-btn" aria-label="Profile" data-nav="profile"><Icon name="user" /></button>
          </div>
        </div>
      </header>

      <nav id="bottomNav" aria-label="Mobile navigation">
        <div className="row">
          {BOTTOM.map(([k, l, ic]) => <button key={k} data-nav={k} className={page === k ? 'active' : ''}><Icon name={ic} /><span>{l}</span></button>)}
        </div>
      </nav>

      <div className={`drawer-overlay ${ui.menuOpen ? 'open' : ''}`} onClick={e => e.target === e.currentTarget && close()}>
        <nav className="drawer from-left" aria-label="Main menu" onClick={e => e.target.closest('[data-nav]') && close()}>
          <div className="drawer-head"><h3>Menu</h3><button className="modal-close" style={{ position: 'static' }} onClick={close} aria-label="Close menu"><Icon name="x" /></button></div>
          <div className="drawer-body"><div className="mnav-links">
            {LINKS.map(([k, l, ic]) => <a key={k} href="/" data-nav={k} className={page === k ? 'active' : ''}><Icon name={ic} />{l}</a>)}
          </div></div>
        </nav>
      </div>
    </>
  );
}
