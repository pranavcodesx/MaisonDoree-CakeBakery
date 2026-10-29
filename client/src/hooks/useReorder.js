import { useCart } from '../context/CartContext.jsx';
import { useUI } from '../context/UIContext.jsx';
import { useToast } from '../context/ToastContext.jsx';

// Puts every item of a past order (with its personalisation) back in the cart.
export function useReorder() {
  const cart = useCart(); const { setCartOpen } = useUI(); const toast = useToast();
  return order => {
    order.items.forEach(it => {
      if (it.kind === 'custom') cart.add({ kind: 'custom', qty: it.qty, message: it.message || '', photoUrl: it.photoUrl, custom: { ...it.custom, flavor: it.flavor }, weight: '1 kg', flavor: it.flavor, snap: { name: it.name, category: 'designer', theme: 'gold' } });
      else cart.add({ kind: 'catalog', cakeId: it.cake, weight: it.weight, flavor: it.flavor, qty: it.qty, message: it.message || '', candle: it.candle, knife: it.knife, photoUrl: it.photoUrl, snap: { name: it.name, images: it.image ? [it.image] : [], category: '' } });
    });
    toast('Items added to your cart', 'success', 'cart');
    setCartOpen(true);
  };
}
