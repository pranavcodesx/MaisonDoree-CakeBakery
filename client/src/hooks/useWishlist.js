import { useCallback } from 'react';
import { api } from '../lib/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useUI } from '../context/UIContext.jsx';
import { useToast } from '../context/ToastContext.jsx';

// Wishlist is saved on the account, so it follows the customer across devices.
export function useWishlist() {
  const { user, patchUser } = useAuth();
  const { openLogin } = useUI();
  const toast = useToast();
  const has = useCallback(id => !!user?.wishlist?.some(w => String(w) === String(id)), [user]);
  const toggle = useCallback(async id => {
    if (!user) { toast('Log in to save cakes to your wishlist', 'info', 'heart'); openLogin(window.location.pathname); return; }
    try {
      const d = await api(`/api/me/wishlist/${id}`, { method: 'POST' });
      patchUser({ wishlist: d.wishlist });
      toast(d.added ? 'Added to wishlist' : 'Removed from wishlist', d.added ? 'success' : 'info', 'heart');
    } catch (e) { toast(e.message, 'error'); }
  }, [user, patchUser, openLogin, toast]);
  return { has, toggle, count: user?.wishlist?.length || 0 };
}
